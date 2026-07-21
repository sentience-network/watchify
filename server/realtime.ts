/**
 * Watchify Week 2 — Socket.io companion server (port 3345).
 * Next.js stays on 3344. Prisma persists chat/playback; this process fans out.
 *
 * Run: npm run dev:realtime  (or npm run dev via concurrently)
 */
import { createServer } from "http";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import {
  verifyRealtimeToken,
  type RealtimeRoomToken,
} from "../src/lib/realtime-token";

loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(__dirname, "../.env.local"), override: true });

const PORT = Number(process.env.REALTIME_PORT || 3345);
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3344";

const prisma = new PrismaClient();

type PresenceMember = {
  userId: string;
  name: string;
  handle: string;
  typing: boolean;
  socketIds: Set<string>;
};

/** Ephemeral room presence — membership remains in DB. */
const rooms = new Map<string, Map<string, PresenceMember>>();
type VideoMember = { userId: string; name: string; camera: boolean; microphone: boolean; socketId: string };
const videoRooms = new Map<string, Map<string, VideoMember>>();
const VIDEO_MESH_LIMIT = 6;

function roomKey(partyId: string) {
  return `party:${partyId}`;
}

function presenceList(partyId: string) {
  const map = rooms.get(partyId);
  if (!map) return [];
  return Array.from(map.values()).map((m) => ({
    userId: m.userId,
    name: m.name,
    handle: m.handle,
    typing: m.typing,
  }));
}

function broadcastPresence(io: Server, partyId: string) {
  io.to(roomKey(partyId)).emit("presence", {
    partyId,
    members: presenceList(partyId),
  });
}

function sanitizeText(text: string, max: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

async function assertMember(userId: string, partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: { where: { userId }, take: 1 }, host: { select: { plan: true } } },
  });
  if (!party || party.status !== "open") return null;
  let coHosts: string[] = [];
  try {
    coHosts = JSON.parse(party.coHostIdsJson) as string[];
  } catch {
    coHosts = [];
  }
  const ok =
    party.hostId === userId ||
    coHosts.includes(userId) ||
    party.members.length > 0;
  return ok ? party : null;
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "watchify-realtime",
      port: PORT,
    })
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: Array.from(new Set([APP_ORIGIN, ...(process.env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean), "http://localhost:3344", "http://127.0.0.1:3344"])),
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("missing token"));
  const payload = verifyRealtimeToken(token);
  if (!payload) return next(new Error("invalid token"));
  socket.data.auth = payload as RealtimeRoomToken;
  next();
});

io.on("connection", (socket) => {
  const auth = socket.data.auth as RealtimeRoomToken;
  const { userId, partyId, name, handle } = auth;

  function leaveVideo() {
    const room = videoRooms.get(partyId);
    const member = room?.get(userId);
    if (!member || member.socketId !== socket.id) return;
    room?.delete(userId);
    if (room?.size === 0) videoRooms.delete(partyId);
    socket.to(roomKey(partyId)).emit("video_peer_left", { userId });
  }

  void (async () => {
    const party = await assertMember(userId, partyId);
    if (!party) {
      socket.emit("error_msg", { message: "Not a party member" });
      socket.disconnect(true);
      return;
    }

    await socket.join(roomKey(partyId));

    let map = rooms.get(partyId);
    if (!map) {
      map = new Map();
      rooms.set(partyId, map);
    }
    const existing = map.get(userId);
    if (existing) {
      existing.socketIds.add(socket.id);
      existing.name = name;
      existing.handle = handle;
    } else {
      map.set(userId, {
        userId,
        name,
        handle,
        typing: false,
        socketIds: new Set([socket.id]),
      });
    }

    socket.emit("joined", {
      partyId,
      members: presenceList(partyId),
      playback: await prisma.partyPlaybackSync
        .findUnique({ where: { partyId } })
        .then((p) =>
          p
            ? {
                partyId: p.partyId,
                positionSec: p.positionSec,
                playing: p.playing,
                watchStartedAt: p.watchStartedAt?.toISOString() ?? null,
                updatedAt: p.updatedAt.toISOString(),
                updatedBy: p.updatedBy,
              }
            : null
        ),
    });
    broadcastPresence(io, partyId);
    socket.to(roomKey(partyId)).emit("member_online", {
      partyId,
      userId,
      name,
      handle,
    });
  })();

  socket.on("message", async (payload: { text?: string }, ack?) => {
    try {
      const cleaned = sanitizeText(String(payload?.text || ""), 280);
      if (!cleaned) {
        ack?.({ ok: false, error: "Empty message" });
        return;
      }
      const party = await assertMember(userId, partyId);
      if (!party) {
        ack?.({ ok: false, error: "Not a member" });
        return;
      }
      const row = await prisma.partyMessage.create({
        data: {
          id: `pm_${Math.random().toString(36).slice(2, 9)}`,
          partyId,
          userId,
          text: cleaned,
        },
      });
      const message = {
        id: row.id,
        partyId: row.partyId,
        userId: row.userId,
        text: row.text,
        createdAt: row.createdAt.toISOString(),
      };
      io.to(roomKey(partyId)).emit("message", { message });
      ack?.({ ok: true, message });
    } catch (e) {
      ack?.({
        ok: false,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  });

  socket.on("reaction", async (payload: { emoji?: string }, ack?) => {
    try {
      const emoji = sanitizeText(String(payload?.emoji || ""), 8) || "👍";
      const party = await assertMember(userId, partyId);
      if (!party) {
        ack?.({ ok: false, error: "Not a member" });
        return;
      }
      const row = await prisma.partyReaction.create({
        data: {
          id: `pr_${Math.random().toString(36).slice(2, 9)}`,
          partyId,
          userId,
          emoji,
        },
      });
      const reaction = {
        id: row.id,
        partyId: row.partyId,
        userId: row.userId,
        emoji: row.emoji,
        createdAt: row.createdAt.toISOString(),
      };
      io.to(roomKey(partyId)).emit("reaction", { reaction });
      ack?.({ ok: true, reaction });
    } catch (e) {
      ack?.({
        ok: false,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  });

  socket.on(
    "playback",
    async (
      payload: {
        positionSec?: number;
        playing?: boolean;
        startTracker?: boolean;
      },
      ack?
    ) => {
      try {
        const party = await assertMember(userId, partyId);
        if (!party) {
          ack?.({ ok: false, error: "Not a member" });
          return;
        }
        const positionSec = Math.max(0, Number(payload?.positionSec) || 0);
        const playing = Boolean(payload?.playing);
        const startTracker = Boolean(payload?.startTracker);
        const now = new Date();
        const existing = await prisma.partyPlaybackSync.findUnique({
          where: { partyId },
        });
        const row = await prisma.partyPlaybackSync.upsert({
          where: { partyId },
          create: {
            partyId,
            positionSec,
            playing,
            watchStartedAt: startTracker || playing ? now : null,
            updatedBy: userId,
          },
          update: {
            positionSec,
            playing,
            updatedBy: userId,
            updatedAt: now,
            ...(startTracker
              ? { watchStartedAt: now }
              : !existing?.watchStartedAt && playing
                ? { watchStartedAt: now }
                : {}),
          },
        });
        const sync = {
          partyId: row.partyId,
          positionSec: row.positionSec,
          playing: row.playing,
          watchStartedAt: row.watchStartedAt?.toISOString() ?? null,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
        };
        io.to(roomKey(partyId)).emit("playback", { sync });
        ack?.({ ok: true, sync });
      } catch (e) {
        ack?.({
          ok: false,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }
  );

  socket.on("typing", (payload: { typing?: boolean }) => {
    const map = rooms.get(partyId);
    const member = map?.get(userId);
    if (!member) return;
    member.typing = Boolean(payload?.typing);
    socket.to(roomKey(partyId)).emit("typing", {
      partyId,
      userId,
      typing: member.typing,
    });
  });

  socket.on("video_join", async (payload: { camera?: boolean; microphone?: boolean }, ack?) => {
    const party = await assertMember(userId, partyId);
    if (!party) return ack?.({ ok: false, error: "Not a party member" });
    if (party.host.plan !== "party") return ack?.({ ok: false, error: "Video rooms require a Party-plan host" });
    let room = videoRooms.get(partyId);
    if (!room) {
      room = new Map();
      videoRooms.set(partyId, room);
    }
    if (!room.has(userId) && room.size >= VIDEO_MESH_LIMIT) {
      return ack?.({ ok: false, error: "Video room is full (6-person soft-launch limit)" });
    }
    const peer = { userId, name, camera: Boolean(payload?.camera), microphone: Boolean(payload?.microphone), socketId: socket.id };
    const peers = Array.from(room.values()).filter((p) => p.userId !== userId).map(({ socketId: _socketId, ...publicPeer }) => publicPeer);
    room.set(userId, peer);
    socket.to(roomKey(partyId)).emit("video_peer_joined", { peer: { userId, name, camera: peer.camera, microphone: peer.microphone } });
    ack?.({ ok: true, peers });
  });

  socket.on("video_state", (payload: { camera?: boolean; microphone?: boolean }) => {
    const member = videoRooms.get(partyId)?.get(userId);
    if (!member || member.socketId !== socket.id) return;
    member.camera = Boolean(payload?.camera);
    member.microphone = Boolean(payload?.microphone);
    socket.to(roomKey(partyId)).emit("video_peer_joined", { peer: { userId, name, camera: member.camera, microphone: member.microphone } });
  });

  socket.on("webrtc_signal", async (payload: { targetUserId?: string; signal?: unknown }) => {
    const targetUserId = String(payload?.targetUserId || "");
    if (!targetUserId || !payload?.signal || !videoRooms.get(partyId)?.has(userId)) return;
    if (!(await assertMember(userId, partyId))) return;
    const target = videoRooms.get(partyId)?.get(targetUserId);
    if (!target) return;
    io.to(target.socketId).emit("webrtc_signal", { fromUserId: userId, signal: payload.signal });
  });

  socket.on("video_leave", leaveVideo);

  socket.on("disconnect", () => {
    leaveVideo();
    const map = rooms.get(partyId);
    const member = map?.get(userId);
    if (!member) return;
    member.socketIds.delete(socket.id);
    if (member.socketIds.size === 0) {
      map?.delete(userId);
      if (map && map.size === 0) rooms.delete(partyId);
      io.to(roomKey(partyId)).emit("member_offline", {
        partyId,
        userId,
      });
      broadcastPresence(io, partyId);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[watchify-realtime] Socket.io on http://localhost:${PORT}`);
  console.log(`[watchify-realtime] CORS origin: ${APP_ORIGIN}`);
});

async function shutdown() {
  await prisma.$disconnect();
  httpServer.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
