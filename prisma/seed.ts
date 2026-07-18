import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  SEED_ACTIVITIES,
  SEED_FRIEND_REQUESTS,
  SEED_PARTIES,
  SEED_PARTY_JOIN_REQUESTS,
  SEED_PARTY_MESSAGES,
  SEED_PARTY_REACTIONS,
  SEED_WATCHLISTS,
  USERS,
} from "../src/lib/users";
import { seedDemoUsersEnabled } from "../src/lib/features";

const prisma = new PrismaClient();

const DEMO_PASSWORDS: Record<string, string> = {
  u1: "watchify-demo",
  u2: "watchify-demo",
  u3: "watchify-demo",
  u4: "watchify-demo",
  u5: "watchify-demo",
  u6: "watchify-demo",
  u7: "watchify-demo",
};

const DEMO_EMAILS: Record<string, string> = {
  u1: "alex@watchify.app",
  u2: "jordan@watchify.app",
  u3: "sam@watchify.app",
  u4: "casey@watchify.app",
  u5: "riley@watchify.app",
  u6: "morgan@watchify.app",
  u7: "quinn@watchify.app",
};

async function main() {
  console.log("Seeding Watchify SQLite…");

  if (!seedDemoUsersEnabled()) {
    console.log(
      "WATCHIFY_SEED_DEMO_USERS=false — skipping fictional social seed. Create real accounts via /auth/signup."
    );
    return;
  }

  // Wipe relational data (order matters for FKs)
  await prisma.analyticsEvent.deleteMany();
  await prisma.importedMedia.deleteMany();
  await prisma.traktConnection.deleteMany();
  await prisma.partyPlaybackSync.deleteMany();
  await prisma.partyReaction.deleteMany();
  await prisma.partyMessage.deleteMany();
  await prisma.partyJoinRequest.deleteMany();
  await prisma.partyMember.deleteMany();
  await prisma.party.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.block.deleteMany();
  await prisma.report.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.rateLimitBucket.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("watchify-demo", 10);
  const now = new Date();

  for (const u of USERS) {
    const role =
      u.id === "u1" ? "admin" : u.id === "u2" ? "mod" : "user";
    await prisma.user.create({
      data: {
        id: u.id,
        email: DEMO_EMAILS[u.id] || `${u.handle}@watchify.app`,
        passwordHash: DEMO_PASSWORDS[u.id] ? passwordHash : passwordHash,
        name: u.name,
        handle: u.handle,
        bio: u.bio,
        avatarHue: u.avatarHue,
        plan: u.id === "u1" || u.id === "u7" ? "party" : "plus",
        role,
        emailVerifiedAt: now, // demo logins are pre-verified
        ageVerified: true,
        publicWatching: true,
        currentlyWatchingId: u.currentlyWatchingId,
        currentlyWatchingServiceId: u.currentlyWatchingServiceId ?? null,
        watchingProgressPercent: u.watchingProgressPercent ?? null,
        recentlyWatchedIdsJson: JSON.stringify(u.recentlyWatchedIds),
        linkedServicesJson: JSON.stringify(u.linkedServices || []),
        socialLinksJson: "{}",
      },
    });
  }

  // Friendships (bidirectional)
  const seen = new Set<string>();
  for (const u of USERS) {
    for (const friendId of u.friendIds) {
      const key = [u.id, friendId].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      await prisma.friendship.create({
        data: { userId: u.id, friendId },
      });
      await prisma.friendship.create({
        data: { userId: friendId, friendId: u.id },
      });
    }
  }

  for (const fr of SEED_FRIEND_REQUESTS) {
    await prisma.friendRequest.create({
      data: {
        id: fr.id,
        fromUserId: fr.fromUserId,
        toUserId: fr.toUserId,
        status: fr.status,
        createdAt: new Date(fr.createdAt),
      },
    });
  }

  for (const wl of SEED_WATCHLISTS) {
    await prisma.watchlist.create({
      data: {
        id: wl.id,
        name: wl.name,
        description: wl.description,
        isPublic: wl.isPublic,
        ownerId: wl.ownerId,
        createdAt: new Date(wl.createdAt),
        updatedAt: new Date(wl.updatedAt),
        items: {
          create: wl.movieIds.map((movieId) => ({ movieId })),
        },
      },
    });
  }

  for (const p of SEED_PARTIES) {
    await prisma.party.create({
      data: {
        id: p.id,
        name: p.name,
        hostId: p.hostId,
        movieId: p.movieId,
        startsAt: p.startsAt ? new Date(p.startsAt) : null,
        isLive: p.isLive,
        status: p.status,
        serviceId: p.serviceId ?? null,
        syncMode: p.syncMode || "social",
        coHostIdsJson: JSON.stringify(p.coHostIds || []),
        recurringWeekly: Boolean(p.recurringWeekly),
        inviteCode: p.id,
        inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000),
        createdAt: new Date(p.createdAt),
        members: {
          create: p.memberIds.map((userId) => ({ userId })),
        },
        playbackSync: {
          create: {
            positionSec: 0,
            playing: false,
            updatedBy: p.hostId,
            updatedAt: new Date(p.createdAt),
          },
        },
      },
    });
  }

  for (const r of SEED_PARTY_JOIN_REQUESTS) {
    await prisma.partyJoinRequest.create({
      data: {
        id: r.id,
        partyId: r.partyId,
        fromUserId: r.fromUserId,
        status: r.status,
        createdAt: new Date(r.createdAt),
      },
    });
  }

  for (const m of SEED_PARTY_MESSAGES) {
    await prisma.partyMessage.create({
      data: {
        id: m.id,
        partyId: m.partyId,
        userId: m.userId,
        text: m.text,
        createdAt: new Date(m.createdAt),
      },
    });
  }

  for (const r of SEED_PARTY_REACTIONS) {
    await prisma.partyReaction.create({
      data: {
        id: r.id,
        partyId: r.partyId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: new Date(r.createdAt),
      },
    });
  }

  for (const a of SEED_ACTIVITIES) {
    await prisma.activity.create({
      data: {
        id: a.id,
        userId: a.userId,
        type: a.type,
        movieId: a.movieId,
        watchlistId: a.watchlistId,
        partyId: a.partyId,
        serviceId: a.serviceId ?? null,
        progressPercent: a.progressPercent ?? null,
        createdAt: new Date(a.createdAt),
      },
    });
  }

  // Sample open report for the mod queue (Week 3)
  await prisma.report.create({
    data: {
      id: "r_seed_demo",
      reporterId: "u3",
      targetUserId: "u5",
      reason: "Harassment",
      details: "Seeded demo report for /admin/reports soft-launch queue.",
      status: "open",
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: watchify-demo):");
  console.log("  alex@watchify.app (u1) — admin");
  console.log("  jordan@watchify.app (u2) — mod");
  console.log("  morgan@watchify.app (u6) — pending friend/party requests");
  console.log("Moderation: /admin/reports");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
