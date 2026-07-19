import { prisma } from "../db";
import { sanitizeText } from "../sanitize";
import { mapPublicUser } from "./social-db";

function pairKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

async function areFriends(userId: string, otherId: string) {
  const row = await prisma.friendship.findFirst({
    where: { userId, friendId: otherId },
  });
  return Boolean(row);
}

async function isBlockedEither(a: string, b: string) {
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return Boolean(row);
}

export async function listConversationsDb(userId: string) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return parts
    .map((p) => {
      const other = p.conversation.participants.find((x) => x.userId !== userId);
      if (!other) return null;
      const last = p.conversation.messages[0];
      const unread =
        last &&
        last.senderId !== userId &&
        (!p.lastReadAt || last.createdAt > p.lastReadAt);
      return {
        id: p.conversation.id,
        updatedAt: p.conversation.updatedAt.toISOString(),
        otherUser: mapPublicUser(other.user),
        lastMessage: last
          ? {
              id: last.id,
              text: last.text,
              linkUrl: last.linkUrl,
              senderId: last.senderId,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
        unread: Boolean(unread),
      };
    })
    .filter(Boolean);
}

export async function getOrCreateConversationDb(userId: string, friendId: string) {
  if (userId === friendId) return { error: "Cannot message yourself." as const };
  if (!(await areFriends(userId, friendId))) {
    return { error: "You can only message Watchify friends." as const };
  }
  if (await isBlockedEither(userId, friendId)) {
    return { error: "Messaging is unavailable with this user." as const };
  }

  const pairKey = pairKeyFor(userId, friendId);
  let conversation = await prisma.conversation.findUnique({ where: { pairKey } });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        pairKey,
        participants: {
          create: [{ userId }, { userId: friendId }],
        },
      },
    });
  }

  return { conversationId: conversation.id };
}

export async function listMessagesDb(
  userId: string,
  conversationId: string,
  limit = 80
) {
  const part = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!part) return { error: "Conversation not found." as const };

  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, 200),
  });

  await prisma.conversationParticipant.update({
    where: { id: part.id },
    data: { lastReadAt: new Date() },
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: { user: true },
  });
  const other = participants.find((p) => p.userId !== userId);

  return {
    conversationId,
    otherUser: other ? mapPublicUser(other.user) : null,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      text: m.text,
      linkUrl: m.linkUrl,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function sendDirectMessageDb(
  userId: string,
  conversationId: string,
  text: string,
  linkUrl?: string | null
) {
  const part = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!part) return { error: "Conversation not found." as const };

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
  });
  if (!other) return { error: "Conversation incomplete." as const };
  if (!(await areFriends(userId, other.userId))) {
    return { error: "You can only message Watchify friends." as const };
  }
  if (await isBlockedEither(userId, other.userId)) {
    return { error: "Messaging is unavailable with this user." as const };
  }

  const clean = sanitizeText(text, 2000).trim();
  if (!clean && !linkUrl) return { error: "Message cannot be empty." as const };

  let safeLink: string | null = null;
  if (linkUrl?.trim()) {
    try {
      const u = new URL(linkUrl.trim());
      if (u.protocol === "https:" || u.protocol === "http:") {
        safeLink = u.toString().slice(0, 500);
      }
    } catch {
      /* ignore bad links */
    }
  }

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      senderId: userId,
      text: clean || (safeLink ? "Shared a link" : ""),
      linkUrl: safeLink,
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  await prisma.conversationParticipant.update({
    where: { id: part.id },
    data: { lastReadAt: new Date() },
  });

  return {
    message: {
      id: message.id,
      senderId: message.senderId,
      text: message.text,
      linkUrl: message.linkUrl,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

export async function unreadDirectCountDb(userId: string) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  let n = 0;
  for (const p of parts) {
    const last = p.conversation.messages[0];
    if (
      last &&
      last.senderId !== userId &&
      (!p.lastReadAt || last.createdAt > p.lastReadAt)
    ) {
      n++;
    }
  }
  return n;
}
