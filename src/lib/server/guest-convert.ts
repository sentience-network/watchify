import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { partyTrialEndsAtFromNow } from "@/lib/party-trial";
import {
  isGuestEmail,
  GUEST_EMAIL_DOMAIN,
} from "@/lib/server/guests";
import { softKvDelete, softKvGet, softKvSet } from "@/lib/server/soft-kv";
import {
  findUserByEmail,
  findUserById,
  publicUser,
  verifyPassword,
  type AuthUserRecord,
} from "@/lib/server/users-db";
import {
  isValidEmail,
  sanitizeEmail,
  sanitizeHandle,
  sanitizeText,
} from "@/lib/sanitize";

type PushStored = {
  subscriptions: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
    expirationTime?: number | null;
  }[];
};

async function transferPushSubs(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) return;
  const fromKey = `push_subs:${fromUserId}`;
  const toKey = `push_subs:${toUserId}`;
  const from = (await softKvGet<PushStored>(fromKey)) || { subscriptions: [] };
  if (!from.subscriptions.length) {
    await softKvDelete(fromKey);
    return;
  }
  const to = (await softKvGet<PushStored>(toKey)) || { subscriptions: [] };
  const merged = [
    ...from.subscriptions,
    ...to.subscriptions.filter(
      (s) => !from.subscriptions.some((f) => f.endpoint === s.endpoint)
    ),
  ].slice(0, 5);
  await softKvSet(toKey, { subscriptions: merged }, 90 * 86_400_000);
  await softKvDelete(fromKey);
}

/**
 * Reassign guest-authored rows onto a real account, then delete the guest.
 * Skips unique conflicts (both already in same party, same title rating, etc.).
 */
export async function mergeGuestIntoUser(
  guestId: string,
  targetUserId: string
): Promise<{ ok: true; user: AuthUserRecord } | { error: string }> {
  if (guestId === targetUserId) {
    const self = await findUserById(guestId);
    return self ? { ok: true, user: self } : { error: "User not found" };
  }

  const guest = await prisma.user.findUnique({ where: { id: guestId } });
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!guest || !target) return { error: "Account not found" };
  if (!guest.isGuest && !isGuestEmail(guest.email)) {
    return { error: "Source account is not a guest" };
  }
  if (target.isGuest || isGuestEmail(target.email)) {
    return { error: "Cannot merge into another guest account" };
  }
  if (target.bannedAt) return { error: "Target account is suspended" };

  await prisma.$transaction(async (tx) => {
    // Party memberships
    const guestMemberships = await tx.partyMember.findMany({
      where: { userId: guestId },
    });
    for (const m of guestMemberships) {
      const clash = await tx.partyMember.findUnique({
        where: { partyId_userId: { partyId: m.partyId, userId: targetUserId } },
      });
      if (clash) {
        await tx.partyMember.delete({ where: { id: m.id } });
      } else {
        await tx.partyMember.update({
          where: { id: m.id },
          data: { userId: targetUserId },
        });
      }
    }

    await tx.partyJoinRequest.updateMany({
      where: { fromUserId: guestId },
      data: { fromUserId: targetUserId },
    });
    await tx.partyMessage.updateMany({
      where: { userId: guestId },
      data: { userId: targetUserId },
    });
    await tx.partyReaction.updateMany({
      where: { userId: guestId },
      data: { userId: targetUserId },
    });
    await tx.activity.updateMany({
      where: { userId: guestId },
      data: { userId: targetUserId },
    });
    await tx.analyticsEvent.updateMany({
      where: { userId: guestId },
      data: { userId: targetUserId },
    });
    await tx.watchlist.updateMany({
      where: { ownerId: guestId },
      data: { ownerId: targetUserId },
    });
    await tx.userUpload.updateMany({
      where: { ownerId: guestId },
      data: { ownerId: targetUserId },
    });
    await tx.party.updateMany({
      where: { hostId: guestId },
      data: { hostId: targetUserId },
    });

    // Title ratings — keep target's score on conflict
    const guestRatings = await tx.titleRating.findMany({
      where: { userId: guestId },
    });
    for (const r of guestRatings) {
      const clash = await tx.titleRating.findUnique({
        where: {
          userId_movieId: { userId: targetUserId, movieId: r.movieId },
        },
      });
      if (clash) {
        await tx.titleRating.delete({ where: { id: r.id } });
      } else {
        await tx.titleRating.update({
          where: { id: r.id },
          data: { userId: targetUserId },
        });
      }
    }

    // Friendships (bidirectional unique)
    const guestFriends = await tx.friendship.findMany({
      where: { OR: [{ userId: guestId }, { friendId: guestId }] },
    });
    for (const f of guestFriends) {
      const a = f.userId === guestId ? targetUserId : f.userId;
      const b = f.friendId === guestId ? targetUserId : f.friendId;
      if (a === b) {
        await tx.friendship.delete({ where: { id: f.id } });
        continue;
      }
      const clash = await tx.friendship.findUnique({
        where: { userId_friendId: { userId: a, friendId: b } },
      });
      if (clash) {
        await tx.friendship.delete({ where: { id: f.id } });
      } else {
        await tx.friendship.update({
          where: { id: f.id },
          data: { userId: a, friendId: b },
        });
      }
    }

    await tx.friendRequest.updateMany({
      where: { fromUserId: guestId },
      data: { fromUserId: targetUserId },
    });
    await tx.friendRequest.updateMany({
      where: { toUserId: guestId },
      data: { toUserId: targetUserId },
    });

    // Blocks (unique blocker+blocked)
    const guestBlocks = await tx.block.findMany({
      where: { OR: [{ blockerId: guestId }, { blockedId: guestId }] },
    });
    for (const b of guestBlocks) {
      const blockerId = b.blockerId === guestId ? targetUserId : b.blockerId;
      const blockedId = b.blockedId === guestId ? targetUserId : b.blockedId;
      if (blockerId === blockedId) {
        await tx.block.delete({ where: { id: b.id } });
        continue;
      }
      const clash = await tx.block.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
      });
      if (clash) {
        await tx.block.delete({ where: { id: b.id } });
      } else {
        await tx.block.update({
          where: { id: b.id },
          data: { blockerId, blockedId },
        });
      }
    }

    // DM participants
    const parts = await tx.conversationParticipant.findMany({
      where: { userId: guestId },
    });
    for (const p of parts) {
      const clash = await tx.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: p.conversationId,
            userId: targetUserId,
          },
        },
      });
      if (clash) {
        await tx.conversationParticipant.delete({ where: { id: p.id } });
      } else {
        await tx.conversationParticipant.update({
          where: { id: p.id },
          data: { userId: targetUserId },
        });
      }
    }
    await tx.directMessage.updateMany({
      where: { senderId: guestId },
      data: { senderId: targetUserId },
    });

    // Prefer guest display name if target still has a generic placeholder
    const keepName =
      (!target.name || target.name === "Watcher" || target.name === "Guest") &&
      guest.name &&
      guest.name.length >= 2
        ? guest.name
        : undefined;

    if (keepName) {
      await tx.user.update({
        where: { id: targetUserId },
        data: { name: keepName },
      });
    }

    await tx.emailVerificationToken.deleteMany({ where: { userId: guestId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: guestId } });
    await tx.user.delete({ where: { id: guestId } });
  });

  await transferPushSubs(guestId, targetUserId);

  const fresh = await findUserById(targetUserId);
  if (!fresh) return { error: "Merge completed but account missing" };
  return { ok: true, user: fresh };
}

/**
 * Upgrade a guest row in place (same user id) — preserves all party FKs.
 */
export async function convertGuestInPlace(
  guestId: string,
  input: {
    email: string;
    password: string;
    name?: string;
    handle?: string;
  }
): Promise<{ ok: true; user: AuthUserRecord } | { error: string }> {
  const guest = await prisma.user.findUnique({ where: { id: guestId } });
  if (!guest) return { error: "Guest session not found" };
  if (!guest.isGuest && !isGuestEmail(guest.email)) {
    return { error: "Not a guest account" };
  }

  const email = sanitizeEmail(input.email);
  if (!isValidEmail(email) || email.endsWith(`@${GUEST_EMAIL_DOMAIN}`)) {
    return { error: "Valid personal email required" };
  }
  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken && emailTaken.id !== guestId) {
    return {
      error:
        "An account with that email already exists. Sign in to link your guest session instead.",
    };
  }

  let handle =
    sanitizeHandle(input.handle || "") ||
    sanitizeHandle(email.split("@")[0] || "viewer") ||
    guest.handle;
  if (handle.startsWith("guest")) {
    handle = sanitizeHandle(email.split("@")[0] || "viewer") || handle;
  }
  const handleTaken = await prisma.user.findUnique({ where: { handle } });
  if (handleTaken && handleTaken.id !== guestId) {
    let n = 1;
    let candidate = `${handle}${n}`;
    while (await prisma.user.findUnique({ where: { handle: candidate } })) {
      n += 1;
      candidate = `${handle}${n}`;
    }
    handle = candidate;
  }

  const name =
    sanitizeText(input.name || "", 80) ||
    sanitizeText(guest.name, 80) ||
    "Watcher";

  await prisma.user.update({
    where: { id: guestId },
    data: {
      email,
      passwordHash: await hash(input.password, 10),
      name,
      handle,
      isGuest: false,
      ageVerified: true,
      plan: "party",
      partyTrialEndsAt: partyTrialEndsAtFromNow(),
      freeHostsRemaining: Math.max(guest.freeHostsRemaining ?? 0, 1),
      emailVerifiedAt: null,
      publicWatching: true,
    },
  });

  const fresh = await findUserById(guestId);
  if (!fresh) return { error: "Conversion failed" };
  return { ok: true, user: fresh };
}

/**
 * Guest session + existing credentials → merge into that account.
 */
export async function linkGuestToExistingAccount(
  guestId: string,
  email: string,
  password: string
): Promise<{ ok: true; user: AuthUserRecord } | { error: string }> {
  const target = await findUserByEmail(sanitizeEmail(email));
  if (!target) return { error: "Invalid email or password" };
  if (target.isGuest || isGuestEmail(target.email)) {
    return { error: "Sign in with a full account email" };
  }
  const ok = await verifyPassword(target, password);
  if (!ok) return { error: "Invalid email or password" };
  return mergeGuestIntoUser(guestId, target.id);
}

export { publicUser };
