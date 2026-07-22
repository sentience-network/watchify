import { prisma } from "@/lib/db";
import {
  productEmailEnabled,
  sendEmail,
} from "@/lib/email";
import { getMovie } from "@/lib/movies";
import { softKvGet, softKvSet } from "@/lib/server/soft-kv";
import { sendWebPushToUser } from "@/lib/server/web-push";
import { absoluteUrl } from "@/lib/site";

type ReminderKind = "t24h" | "t1h" | "live";

function dispatchKey(partyId: string, kind: ReminderKind, userId: string) {
  return `reminder:${partyId}:${kind}:${userId}`;
}

async function alreadySent(
  partyId: string,
  kind: ReminderKind,
  userId: string
) {
  return Boolean(await softKvGet(dispatchKey(partyId, kind, userId)));
}

async function markSent(
  partyId: string,
  kind: ReminderKind,
  userId: string
) {
  await softKvSet(dispatchKey(partyId, kind, userId), { at: Date.now() }, 14 * 86_400_000);
}

function formatWhenLocal(startsAt: Date | null | undefined) {
  if (!startsAt) return "tonight";
  try {
    return startsAt.toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return startsAt.toLocaleString();
  }
}

function reminderEmail(input: {
  kind: ReminderKind;
  partyName: string;
  movieTitle: string;
  inviteUrl: string;
  startsAt?: Date | null;
}) {
  if (input.kind === "live") {
    return {
      subject: `Come back — ${input.partyName} is live`,
      text: `${input.partyName} (${input.movieTitle}) is live on Watchify right now.\n\nJoin: ${input.inviteUrl}\n`,
      html: `<p><strong>Come back tonight</strong> — <strong>${input.partyName}</strong> (${input.movieTitle}) is live.</p><p><a href="${input.inviteUrl}">Join the party</a></p>`,
    };
  }
  if (input.kind === "t24h") {
    const when = formatWhenLocal(input.startsAt);
    return {
      subject: `Tomorrow: ${input.partyName}`,
      text: `Come back tomorrow — “${input.partyName}” for ${input.movieTitle} starts ${when}.\n\nOpen the room: ${input.inviteUrl}\n`,
      html: `<p><strong>Come back tomorrow</strong> — <strong>${input.partyName}</strong> for ${input.movieTitle} starts ${when}.</p><p><a href="${input.inviteUrl}">Open the room</a></p><p style="color:#888;font-size:12px">Server reminder — works even if Watchify is closed.</p>`,
    };
  }
  // t1h
  const when = formatWhenLocal(input.startsAt);
  return {
    subject: `Come back tonight — ${input.partyName} in ~1 hour`,
    text: `Come back tonight — “${input.partyName}” for ${input.movieTitle} starts around ${when}.\n\nOpen the room: ${input.inviteUrl}\n\n(This email fires even if the Watchify tab is closed.)`,
    html: `<p><strong>Come back tonight</strong> — <strong>${input.partyName}</strong> for ${input.movieTitle} starts around ${when}.</p><p><a href="${input.inviteUrl}">Open the room</a></p><p style="color:#888;font-size:12px">Sent server-side so you still get it with the phone closed.</p>`,
  };
}

async function notifyMember(input: {
  userId: string;
  email: string | null;
  kind: ReminderKind;
  partyId: string;
  partyName: string;
  movieTitle: string;
  inviteCode: string;
  startsAt?: Date | null;
}) {
  if (await alreadySent(input.partyId, input.kind, input.userId)) {
    return { email: false, push: false, skipped: true };
  }

  const inviteUrl = absoluteUrl(`/share/party/${input.inviteCode}`);
  const partyPath = `/parties/${input.partyId}`;
  const content = reminderEmail({
    kind: input.kind,
    partyName: input.partyName,
    movieTitle: input.movieTitle,
    inviteUrl,
    startsAt: input.startsAt,
  });

  let emailed = false;
  if (productEmailEnabled() && input.email && !input.email.endsWith("@guest.watchify.local")) {
    const sent = await sendEmail({
      to: input.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    emailed = sent.ok;
  }

  const push = await sendWebPushToUser(input.userId, {
    title: content.subject,
    body: `${input.movieTitle} · Watchify`,
    url: inviteUrl.includes("/share/") ? `/share/party/${input.inviteCode}` : partyPath,
  });

  if (emailed || push.sent > 0) {
    await markSent(input.partyId, input.kind, input.userId);
  } else if (!productEmailEnabled() && push.skipped === "vapid_unset") {
    if (input.email) {
      await sendEmail({
        to: input.email,
        subject: `[dev] ${content.subject}`,
        text: content.text,
        html: content.html,
      });
      await markSent(input.partyId, input.kind, input.userId);
    }
  } else if (
    // Mark when nothing can deliver (no email product + no push) so we don't hammer every tick
    !productEmailEnabled() &&
    (push.skipped === "no_subscription" || push.skipped === "vapid_unset") &&
    !input.email
  ) {
    await markSent(input.partyId, input.kind, input.userId);
  }

  return { email: emailed, push: push.sent > 0, skipped: false };
}

/**
 * Scan open scheduled parties and fire T−24h / T−1h reminders.
 * Also safe to call for live parties (kind=live) from goLive.
 */
export async function dispatchPartyReminders(opts?: {
  partyId?: string;
  forceLive?: boolean;
}): Promise<{ checked: number; notified: number }> {
  const now = Date.now();
  const parties = await prisma.party.findMany({
    where: {
      status: "open",
      ...(opts?.partyId ? { id: opts.partyId } : {}),
    },
    include: {
      members: true,
      host: { select: { id: true, email: true, name: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  let notified = 0;
  for (const party of parties) {
    const movie = getMovie(party.movieId);
    const movieTitle = movie?.title || "a title";
    const inviteCode = party.inviteCode || party.id;
    const memberIds = Array.from(
      new Set([party.hostId, ...party.members.map((m) => m.userId)])
    );
    const users = await prisma.user.findMany({
      where: { id: { in: memberIds }, bannedAt: null },
      select: { id: true, email: true },
    });

    let kinds: ReminderKind[] = [];
    if (opts?.forceLive || party.isLive) {
      kinds = ["live"];
    } else if (party.startsAt) {
      const msLeft = party.startsAt.getTime() - now;
      // Wider windows so opportunistic ticks / free external cron don't miss
      if (msLeft > 20 * 60 * 60 * 1000 && msLeft <= 26 * 60 * 60 * 1000) {
        kinds = ["t24h"];
      } else if (msLeft > 0 && msLeft <= 75 * 60 * 1000) {
        kinds = ["t1h"];
      }
    }

    for (const kind of kinds) {
      for (const u of users) {
        const result = await notifyMember({
          userId: u.id,
          email: u.email,
          kind,
          partyId: party.id,
          partyName: party.name,
          movieTitle,
          inviteCode,
          startsAt: party.startsAt,
        });
        if (!result.skipped && (result.email || result.push)) notified += 1;
      }
    }
  }

  return { checked: parties.length, notified };
}
