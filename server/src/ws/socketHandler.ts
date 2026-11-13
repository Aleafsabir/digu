import { WebSocketServer, WebSocket } from 'ws';
import { query } from '../db.js';
import { RedisState } from '../redis.js';
import {
  upsertProfile,
  saveRoom,
  getProfileById,
  getAcceptedFriends,
  saveMatchInvitation,
  getMatchInvitation,
  updateMatchInvitationStatus,
  StoredMatchInvitation,
} from '../firestore.js';
import {
  memoryRooms,
  publicQueueRooms,
  roomEventHooks,
  buildQueueKey,
  resolveMaxPlayers,
  normalizeRoomCode,
  buildRoomObject,
  applyBotsToEmptySeats,
  RoomSpectator,
} from '../routes/rooms.js';
import {
  initializeRoomMatchState,
  validateAndApplyAction,
  computeBotActionForActiveSeat,
  sanitizeStateForSeat,
} from '../engine/authoritativeEngine.js';

export const HEARTBEAT_INTERVAL_MS = 5000;
export const AFK_TURN_TIMEOUT_MS = 15000;
export const READY_CHECK_DURATION_MS = 15000;

export interface AuthenticatedSocket extends WebSocket {
  profileId?: string;
  displayName?: string;
  username?: string;
  loginProvider?: string;
  avatarId?: string;
  roomCode?: string;
  seatIndex?: number | null;
  isAlive?: boolean;
}

export interface MemoryProfile {
  id: string;
  display_name: string;
  username?: string;
  avatar_id: string;
  friend_code: string;
  login_provider?: string;
  level: number;
  presence_status: 'IN_LOBBY' | 'IN_QUEUE' | 'IN_ROOM' | 'IN_MATCH' | 'OFFLINE';
  last_active_at: string;
  current_match_info?: any;
}

export interface MemoryFriendship {
  id: string;
  user_id: string;
  friend_id: string;
  sender_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
}

// In-Memory Fallbacks for Local / Tunnel Testing
export const inMemoryProfiles = new Map<string, MemoryProfile>();
export const inMemoryFriendships: MemoryFriendship[] = [];
export const inMemoryInvitations = new Map<string, StoredMatchInvitation>();

// Active connected clients: profileId -> AuthenticatedSocket
export const activeClients = new Map<string, AuthenticatedSocket>();

// Active turn timers & ready check timers per roomCode
export const roomTurnTimers = new Map<string, NodeJS.Timeout>();
export const roomReadyCheckTimers = new Map<string, NodeJS.Timeout>();

/**
 * Increments and returns the monotonic per-room sequence ID.
 */
export function nextRoomSeqId(room: any): number {
  const next = (typeof room.seqId === 'number' ? room.seqId : 0) + 1;
  room.seqId = next;
  room.updatedAt = new Date().toISOString();
  room.updated_at = room.updatedAt;
  return next;
}

/**
 * Persists room to memory, Redis, and Firestore asynchronously.
 */
async function persistRoomState(room: any): Promise<void> {
  if (!room || !room.roomCode) return;
  const code = normalizeRoomCode(room.roomCode);
  memoryRooms[code] = room;
  await RedisState.saveRoom(code, room);
  saveRoom(room).catch(() => {});
}

/**
 * Loads a room from memory or Redis.
 */
async function loadRoomState(roomCodeInput: string): Promise<any | null> {
  const code = normalizeRoomCode(roomCodeInput);
  if (!code) return null;
  if (memoryRooms[code]) return memoryRooms[code];
  const fromRedis = await RedisState.getRoom(code);
  if (fromRedis) {
    memoryRooms[code] = fromRedis;
    return fromRedis;
  }
  return null;
}

/**
 * Broadcasts a message to every connected player and spectator in a room,
 * sanitizing `room` state per seat so opponent hands are never exposed.
 */
export function broadcastToRoom(
  room: any,
  type: string,
  extraPayload: Record<string, any> = {}
): void {
  if (!room) return;
  const seqId = room.seqId || 1;
  const deliveredSockets = new Set<AuthenticatedSocket>();

  // 1. Send to seated players with seat-specific sanitized state
  if (Array.isArray(room.seats)) {
    for (const seat of room.seats) {
      const pid = seat.profileId || seat.profile_id;
      const sIdx = seat.seatIndex ?? seat.seat_index ?? 0;
      if (pid && !seat.isBot && !seat.is_bot) {
        const sock = activeClients.get(pid);
        if (sock && sock.readyState === WebSocket.OPEN) {
          deliveredSockets.add(sock);
          const sanitizedRoom = sanitizeStateForSeat(room, sIdx);
          sock.send(
            JSON.stringify({
              type,
              seqId,
              payload: {
                ...extraPayload,
                seqId,
                roomCode: room.roomCode,
                viewerSeatIndex: sIdx,
                room: sanitizedRoom,
              },
            })
          );
        }
      }
    }
  }

  // 2. Send to spectators (with all hands masked to cardCount only)
  if (Array.isArray(room.spectators)) {
    for (const spec of room.spectators as RoomSpectator[]) {
      const sock = activeClients.get(spec.profileId);
      if (sock && sock.readyState === WebSocket.OPEN && !deliveredSockets.has(sock)) {
        deliveredSockets.add(sock);
        const sanitizedRoom = sanitizeStateForSeat(room, null);
        sock.send(
          JSON.stringify({
            type,
            seqId,
            payload: {
              ...extraPayload,
              seqId,
              roomCode: room.roomCode,
              viewerSeatIndex: null,
              isSpectator: true,
              room: sanitizedRoom,
            },
          })
        );
      }
    }
  }
}

/**
 * Clears any active AFK/bot turn timer for a room.
 */
export function clearRoomTurnTimer(roomCode: string): void {
  const clean = normalizeRoomCode(roomCode);
  const existing = roomTurnTimers.get(clean);
  if (existing) {
    clearTimeout(existing);
    roomTurnTimers.delete(clean);
  }
}

export function clearReadyCheckTimer(roomCode: string): void {
  const clean = normalizeRoomCode(roomCode);
  const existing = roomReadyCheckTimers.get(clean);
  if (existing) {
    clearTimeout(existing);
    roomReadyCheckTimers.delete(clean);
  }
}

async function updatePresenceForProfile(
  profileId: string,
  status: 'IN_LOBBY' | 'IN_QUEUE' | 'IN_ROOM' | 'IN_MATCH' | 'OFFLINE',
  matchInfo?: any
): Promise<void> {
  if (!profileId) return;
  const mem = inMemoryProfiles.get(profileId);
  if (mem) {
    mem.presence_status = status;
    mem.current_match_info = matchInfo ?? null;
    mem.last_active_at = new Date().toISOString();
  }
  upsertProfile({
    id: profileId,
    presence_status: status,
    current_match_info: matchInfo ?? null,
    last_active_at: new Date().toISOString(),
  }).catch(() => {});
  try {
    await query(
      'UPDATE profiles SET presence_status = $1, current_match_info = $2, last_active_at = now() WHERE id = $3',
      [status, matchInfo ? JSON.stringify(matchInfo) : null, profileId]
    );
  } catch {}
  await broadcastPresenceToFriends(profileId, status, matchInfo);
}

async function requeueOrCleanupPublicRoom(room: any): Promise<void> {
  if (!room || (room.isPrivate ?? room.is_private)) return;
  const seats: any[] = room.seats || [];
  const humanCount = seats.filter(
    (s: any) => (s.profileId || s.profile_id) && !s.isBot && !s.is_bot
  ).length;
  room.currentPlayerCount = humanCount;
  room.current_player_count = humanCount;

  const qKey =
    room.queueKey || buildQueueKey(room.mode, room.variant, Number(room.stakeBuyIn) || 1000);
  room.queueKey = qKey;

  if (humanCount === 0) {
    if (publicQueueRooms.get(qKey) === room.roomCode) {
      publicQueueRooms.delete(qKey);
      await RedisState.del(qKey);
    }
  } else if (room.status === 'WAITING' && humanCount < (room.maxPlayers || 4)) {
    publicQueueRooms.set(qKey, room.roomCode);
    await RedisState.set(qKey, room.roomCode, 300);
  }
}

async function startMatchForRoom(
  room: any,
  seed?: any,
  requesterSocket?: AuthenticatedSocket
): Promise<boolean> {
  if (!room) return false;
  const isPrivate = Boolean(room.isPrivate ?? room.is_private);
  if (!isPrivate) {
    room.fillEmptySeatsWithBots = false;
    room.fill_empty_seats_with_bots = false;
  }

  const seats: any[] = room.seats || [];
  const maxPlayers = Number(room.maxPlayers) || seats.length || 4;
  const fillBots = isPrivate && Boolean(room.fillEmptySeatsWithBots);

  if (!fillBots) {
    const humanSeats = seats.filter(
      (s: any) => (s.profileId || s.profile_id) && !s.isBot && !s.is_bot
    );
    if (humanSeats.length < maxPlayers) {
      if (requesterSocket?.readyState === WebSocket.OPEN) {
        requesterSocket.send(
          JSON.stringify({
            type: 'ROOM_ERROR',
            payload: {
              error: `Need ${maxPlayers} players (or enable AI Bots) to start.`,
              roomCode: room.roomCode,
            },
          })
        );
      }
      return false;
    }
    const allReady = humanSeats.every((s: any) => Boolean(s.isReady ?? s.is_ready));
    if (!allReady) {
      if (requesterSocket?.readyState === WebSocket.OPEN) {
        requesterSocket.send(
          JSON.stringify({
            type: 'ROOM_ERROR',
            payload: {
              error: 'All seated players must be ready.',
              roomCode: room.roomCode,
            },
          })
        );
      }
      return false;
    }
  }

  clearReadyCheckTimer(room.roomCode);
  if (room.queueKey && publicQueueRooms.get(room.queueKey) === room.roomCode) {
    publicQueueRooms.delete(room.queueKey);
    await RedisState.del(room.queueKey);
  }

  applyBotsToEmptySeats(room);
  room.status = 'PLAYING';
  delete room.readyCheckExpiresAt;
  initializeRoomMatchState(room, seed);
  nextRoomSeqId(room);

  await persistRoomState(room);

  for (const s of seats) {
    const pid = s.profileId || s.profile_id;
    if (pid && !s.isBot && !s.is_bot) {
      await updatePresenceForProfile(pid, 'IN_MATCH', {
        roomCode: room.roomCode,
        mode: room.mode,
        variant: room.variant,
      });
    }
  }

  broadcastToRoom(room, 'MATCH_STARTED', {
    mode: room.mode,
    variant: room.variant,
    activeSeat: room.gameState.activeSeat,
  });

  scheduleTurnTimer(room);
  return true;
}

function clearSeatAssignment(seat: any): void {
  const sIdx = seat.seatIndex ?? seat.seat_index ?? 0;
  seat.profileId = null;
  seat.profile_id = null;
  seat.playerName = `Seat ${sIdx + 1}`;
  seat.player_name = `Seat ${sIdx + 1}`;
  seat.username = '';
  seat.isBot = false;
  seat.is_bot = false;
  seat.isReady = false;
  seat.is_ready = false;
  seat.isConnected = false;
  seat.is_connected = false;
}

async function startReadyCheckForRoom(room: any): Promise<void> {
  if (!room || !room.roomCode) return;
  const code = normalizeRoomCode(room.roomCode);
  clearReadyCheckTimer(code);

  // Enforce Stage-2 explicit confirmation: reset readiness when all seats fill
  room.status = 'READY_CHECK';
  room.fillEmptySeatsWithBots = false;
  room.fill_empty_seats_with_bots = false;
  room.readyCheckExpiresAt = Date.now() + READY_CHECK_DURATION_MS;

  for (const seat of room.seats || []) {
    if ((seat.profileId || seat.profile_id) && !seat.isBot && !seat.is_bot) {
      seat.isReady = false;
      seat.is_ready = false;
    }
  }

  if (room.queueKey && publicQueueRooms.get(room.queueKey) === room.roomCode) {
    publicQueueRooms.delete(room.queueKey);
    await RedisState.del(room.queueKey);
  }

  nextRoomSeqId(room);
  await persistRoomState(room);

  broadcastToRoom(room, 'READY_CHECK_STARTED', {
    expiresAt: room.readyCheckExpiresAt,
    durationMs: READY_CHECK_DURATION_MS,
  });

  const timer = setTimeout(async () => {
    roomReadyCheckTimers.delete(code);
    const latest = await loadRoomState(code);
    if (!latest || latest.status !== 'READY_CHECK') return;

    const seats: any[] = latest.seats || [];
    const maxPlayers = Number(latest.maxPlayers) || seats.length || 4;
    const readyHumans = seats.filter(
      (s: any) =>
        (s.profileId || s.profile_id) &&
        !s.isBot &&
        !s.is_bot &&
        Boolean(s.isReady ?? s.is_ready)
    );

    if (readyHumans.length >= maxPlayers) {
      await startMatchForRoom(latest);
      return;
    }

    // Drop ONLY unready/AFK players; keep ready players queued cleanly
    const droppedIds: string[] = [];
    for (const seat of seats) {
      const pid = seat.profileId || seat.profile_id;
      if (pid && !seat.isBot && !seat.is_bot && !Boolean(seat.isReady ?? seat.is_ready)) {
        droppedIds.push(pid);
        clearSeatAssignment(seat);
        const sock = activeClients.get(pid);
        if (sock) {
          sock.roomCode = undefined;
          sock.seatIndex = null;
          if (sock.readyState === WebSocket.OPEN) {
            sock.send(
              JSON.stringify({
                type: 'READY_CHECK_FAILED',
                payload: { reason: 'Ready check expired', roomCode: code },
              })
            );
          }
        }
        await updatePresenceForProfile(pid, 'IN_LOBBY');
      }
    }

    // Reset ready humans back to waiting confirmation state for next match full trigger
    for (const seat of seats) {
      if ((seat.profileId || seat.profile_id) && !seat.isBot && !seat.is_bot) {
        seat.isReady = false;
        seat.is_ready = false;
      }
    }

    latest.status = 'WAITING';
    delete latest.readyCheckExpiresAt;
    nextRoomSeqId(latest);
    await requeueOrCleanupPublicRoom(latest);
    await persistRoomState(latest);

    broadcastToRoom(latest, 'READY_CHECK_TIMEOUT', {
      droppedIds,
      message: 'An opponent failed to accept. Returned to queue.',
    });
  }, READY_CHECK_DURATION_MS);

  roomReadyCheckTimers.set(code, timer);
}

/**
 * Schedules the 15000ms AFK turn timeout (or immediate bot turn if the active seat is a bot).
 * When a human player exceeds the turn timeout, server bot autoplay executes with `isAfkBotOverride = true`.
 */
export function scheduleTurnTimer(room: any): void {
  if (!room || !room.roomCode) return;
  const code = normalizeRoomCode(room.roomCode);
  clearRoomTurnTimer(code);

  if (room.status !== 'PLAYING' || !room.gameState || room.gameState.phase === 'ROUND_OVER') {
    return;
  }

  const activeSeatIdx = room.gameState.activeSeat;
  const seat = room.seats?.[activeSeatIdx];
  const isBotSeat = Boolean(seat?.isBot || seat?.is_bot);

  const delayMs = isBotSeat ? 650 : AFK_TURN_TIMEOUT_MS;

  const timer = setTimeout(async () => {
    roomTurnTimers.delete(code);
    const latestRoom = await loadRoomState(code);
    if (
      !latestRoom ||
      latestRoom.status !== 'PLAYING' ||
      !latestRoom.gameState ||
      latestRoom.gameState.phase === 'ROUND_OVER' ||
      latestRoom.gameState.activeSeat !== activeSeatIdx
    ) {
      return;
    }

    const isAfkBotOverride = !isBotSeat;
    const botResult = computeBotActionForActiveSeat(latestRoom, isAfkBotOverride);
    nextRoomSeqId(latestRoom);

    if (botResult.matchEnded) {
      latestRoom.status = 'COMPLETED';
    }

    await persistRoomState(latestRoom);

    broadcastToRoom(
      latestRoom,
      isAfkBotOverride ? 'AFK_BOT_AUTOPLAY' : 'STATE_UPDATE',
      {
        seatIndex: activeSeatIdx,
        isAfkBotOverride,
        actionsExecuted: botResult.actionsExecuted,
        roundEnded: botResult.roundEnded,
        matchEnded: botResult.matchEnded,
      }
    );

    if (!botResult.roundEnded && !botResult.matchEnded) {
      scheduleTurnTimer(latestRoom);
    }
  }, delayMs);

  roomTurnTimers.set(code, timer);
}

export function setupWebSocket(wss: WebSocketServer) {
  roomEventHooks.onRoomJoined = (room, info) => {
    broadcastToRoom(room, 'ROOM_JOINED', {
      joinedProfileId: info.profileId,
      joinedDisplayName: info.displayName,
      role: 'PLAYER',
      seatIndex: info.seatIndex,
    });
  };
  roomEventHooks.onStartReadyCheck = (room) => {
    startReadyCheckForRoom(room).catch((err) =>
      console.warn('[WS] Failed to start Ready Check from hook:', err?.message)
    );
  };

  // 5000ms heartbeat interval to detect stale connections quickly
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AuthenticatedSocket;
      if (socket.isAlive === false) {
        if (socket.profileId) {
          handleDisconnection(socket.profileId);
        }
        return socket.terminate();
      }
      socket.isAlive = false;
      try {
        socket.ping();
      } catch {}
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const socket = ws as AuthenticatedSocket;
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', async (data: string) => {
      socket.isAlive = true;
      try {
        const message = JSON.parse(data.toString());
        await handleSocketMessage(socket, message);
      } catch (err: any) {
        console.error('[WS Message Parse Error]:', err.message);
      }
    });

    socket.on('close', () => {
      if (socket.profileId) {
        handleDisconnection(socket.profileId);
      }
    });

    socket.on('error', (err) => {
      console.error('[WS Socket Error]:', err.message);
    });
  });
}

async function handleSocketMessage(socket: AuthenticatedSocket, message: any) {
  const { type, payload: rawPayload, ...rest } = message;
  const payload =
    rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? rawPayload
      : rest;

  switch (type) {
    case 'PING': {
      socket.isAlive = true;
      socket.send(
        JSON.stringify({
          type: 'PONG',
          payload: { timestamp: Date.now() },
        })
      );
      break;
    }

    case 'AUTH_INIT': {
      const { profileId, displayName, username, loginProvider, avatarId, friendCode, level, sessionToken } = payload;
      if (!profileId) return;

      socket.profileId = profileId;
      socket.displayName = displayName || 'Player';
      socket.username = username || undefined;
      socket.loginProvider = loginProvider || undefined;
      socket.avatarId = avatarId || 'boduthakurufaanu';
      activeClients.set(profileId, socket);

      const existing = inMemoryProfiles.get(profileId);
      let resolvedFriendCode = (friendCode || '').trim().toUpperCase();
      if (
        !resolvedFriendCode ||
        resolvedFriendCode === 'DIGU-7482' ||
        resolvedFriendCode === 'DIGU-GUES' ||
        resolvedFriendCode === 'HLH-7482'
      ) {
        resolvedFriendCode =
          existing?.friend_code &&
          existing.friend_code !== 'DIGU-7482' &&
          existing.friend_code !== 'DIGU-GUES' &&
          existing.friend_code !== 'HLH-7482'
            ? existing.friend_code
            : `HLH-${Math.floor(10000 + Math.random() * 90000)}`;
      }

      const resolvedUsername = username || existing?.username || undefined;
      const resolvedProvider = loginProvider || existing?.login_provider || undefined;

      inMemoryProfiles.set(profileId, {
        id: profileId,
        display_name: displayName || existing?.display_name || 'Player',
        username: resolvedUsername,
        avatar_id: avatarId || existing?.avatar_id || 'boduthakurufaanu',
        friend_code: resolvedFriendCode,
        login_provider: resolvedProvider,
        level: level || existing?.level || 1,
        presence_status: 'IN_LOBBY',
        last_active_at: new Date().toISOString(),
      });

      upsertProfile({
        id: profileId,
        display_name: displayName || existing?.display_name || 'Player',
        username: resolvedUsername,
        login_provider: resolvedProvider,
        avatar_id: avatarId || existing?.avatar_id || 'boduthakurufaanu',
        friend_code: resolvedFriendCode,
        level: level || existing?.level || 1,
        presence_status: 'IN_LOBBY',
        last_active_at: new Date().toISOString(),
      }).catch(() => {});

      try {
        await query(
          "UPDATE profiles SET presence_status = 'IN_LOBBY', friend_code = $2, last_active_at = now() WHERE id = $1",
          [profileId, resolvedFriendCode]
        );
      } catch {}

      await broadcastPresenceToFriends(profileId, 'IN_LOBBY');

      socket.send(
        JSON.stringify({
          type: 'AUTH_SUCCESS',
          payload: {
            profileId,
            status: 'IN_LOBBY',
            friendCode: resolvedFriendCode,
            username: resolvedUsername,
          },
        })
      );

      if (sessionToken) {
        try {
          const session = await RedisState.getClientSession(sessionToken);
          if (session) {
            const room = await loadRoomState(session.roomCode);
            if (room && room.status !== 'FINISHED') {
              socket.roomCode = room.roomCode;
              socket.seatIndex = session.seatIndex;
              socket.send(
                JSON.stringify({
                  type: 'SESSION_RESTORED',
                  seqId: room.seqId || 1,
                  payload: {
                    seqId: room.seqId || 1,
                    room: sanitizeStateForSeat(room, session.seatIndex),
                    seatIndex: session.seatIndex,
                  },
                })
              );
            }
          }
        } catch (_err) {}
      }
      break;
    }

    // ========================================================================
    // 0b. MATCHMAKE_JOIN / MATCHMAKE_CANCEL (Public Queue, 0 Bots, 2-Stage Ready)
    // ========================================================================
    case 'MATCHMAKE_JOIN': {
      const profile = payload.profile || {
        id: socket.profileId || payload.profileId || `guest_${Date.now()}`,
        displayName: socket.displayName || payload.displayName || 'Player',
        username: socket.username || payload.username || '',
        avatarId: socket.avatarId || payload.avatarId || 'sultan',
      };
      const mode = String(payload.mode || 'DIGU');
      const variant = String(payload.variant || payload.format || (mode === 'SOLO_2P' ? '1v1' : 'default')).toLowerCase();
      const stake = Number(payload.stakeBuyIn) || 1000;
      const targetScore = Number(payload.targetScore) || 1000;
      const turnTimerSeconds = Number(payload.turnTimerSeconds) === 30 ? 30 : 15;
      const maxPlayers = resolveMaxPlayers(mode, variant);
      const queueKey = buildQueueKey(mode, variant, stake);

      socket.profileId = profile.id;
      socket.displayName = profile.displayName || 'Player';
      socket.username = profile.username || socket.username;
      activeClients.set(profile.id, socket);

      // Leave previous waiting room cleanly if switching queues
      if (socket.roomCode) {
        const prevRoom = await loadRoomState(socket.roomCode);
        if (prevRoom && prevRoom.status !== 'PLAYING') {
          for (const s of prevRoom.seats || []) {
            if ((s.profileId || s.profile_id) === profile.id) {
              clearSeatAssignment(s);
            }
          }
          clearReadyCheckTimer(prevRoom.roomCode);
          if (prevRoom.status === 'READY_CHECK') prevRoom.status = 'WAITING';
          delete prevRoom.readyCheckExpiresAt;
          nextRoomSeqId(prevRoom);
          await requeueOrCleanupPublicRoom(prevRoom);
          await persistRoomState(prevRoom);
          broadcastToRoom(prevRoom, 'ROOM_LEFT', { leftProfileId: profile.id });
        }
        socket.roomCode = undefined;
        socket.seatIndex = null;
      }

      const waitingCode =
        publicQueueRooms.get(queueKey) || (await RedisState.get<string>(queueKey));
      let room: any = waitingCode ? await loadRoomState(waitingCode) : null;
      let assignedSeatIndex = 0;
      let joinedExisting = false;

      if (room && room.status === 'WAITING') {
        room.fillEmptySeatsWithBots = false;
        room.fill_empty_seats_with_bots = false;
        applyBotsToEmptySeats(room);

        const seats: any[] = room.seats || [];
        const existingSeat = seats.find(
          (s: any) => (s.profileId || s.profile_id) === profile.id
        );
        const openSeat =
          existingSeat ||
          seats.find((s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot);

        if (openSeat) {
          joinedExisting = true;
          assignedSeatIndex = openSeat.seatIndex ?? openSeat.seat_index ?? 0;
          openSeat.profileId = profile.id;
          openSeat.profile_id = profile.id;
          openSeat.playerName = profile.displayName || 'Player';
          openSeat.player_name = openSeat.playerName;
          openSeat.username = profile.username || '';
          openSeat.avatarId = profile.avatarId || 'sultan';
          openSeat.avatar_id = openSeat.avatarId;
          openSeat.isBot = false;
          openSeat.is_bot = false;
          openSeat.isReady = false;
          openSeat.is_ready = false;
          openSeat.isConnected = true;
          openSeat.is_connected = true;
          openSeat.joinedAt = new Date().toISOString();

          room.currentPlayerCount = seats.filter(
            (s: any) => (s.profileId || s.profile_id) && !s.isBot && !s.is_bot
          ).length;
          room.current_player_count = room.currentPlayerCount;
        }
      }

      if (!joinedExisting) {
        room = buildRoomObject({
          hostProfile: profile,
          mode,
          variant,
          stakeBuyIn: stake,
          targetScore,
          turnTimerSeconds,
          fillEmptySeatsWithBots: false,
          isPrivate: false,
          initialHostReady: false,
        });
        room.queueKey = queueKey;
        assignedSeatIndex = 0;
        publicQueueRooms.set(queueKey, room.roomCode);
        await RedisState.set(queueKey, room.roomCode, 300);
      }

      socket.roomCode = room.roomCode;
      socket.seatIndex = assignedSeatIndex;

      nextRoomSeqId(room);
      await persistRoomState(room);

      if (payload.sessionToken) {
        await RedisState.saveClientSession(payload.sessionToken, {
          roomCode: room.roomCode,
          seatIndex: assignedSeatIndex,
          profileId: profile.id,
          joinedAt: new Date().toISOString(),
        });
      }

      await updatePresenceForProfile(profile.id, 'IN_QUEUE', {
        roomCode: room.roomCode,
        mode: room.mode,
        variant: room.variant,
      });

      socket.send(
        JSON.stringify({
          type: 'MATCHMAKE_JOINED',
          seqId: room.seqId,
          payload: {
            seqId: room.seqId,
            roomCode: room.roomCode,
            seatIndex: assignedSeatIndex,
            room: sanitizeStateForSeat(room, assignedSeatIndex),
          },
        })
      );

      if (joinedExisting) {
        broadcastToRoom(room, 'ROOM_JOINED', {
          joinedProfileId: profile.id,
          joinedDisplayName: profile.displayName || 'Player',
          role: 'PLAYER',
          seatIndex: assignedSeatIndex,
        });
      }

      const humanCount = (room.seats || []).filter(
        (s: any) => (s.profileId || s.profile_id) && !s.isBot && !s.is_bot
      ).length;
      if (humanCount >= maxPlayers) {
        await startReadyCheckForRoom(room);
      }
      break;
    }

    case 'MATCHMAKE_CANCEL': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const pid = socket.profileId || payload.profileId;
      if (cleanCode && pid) {
        const room = await loadRoomState(cleanCode);
        if (room && room.status !== 'PLAYING') {
          for (const seat of room.seats || []) {
            if ((seat.profileId || seat.profile_id) === pid) {
              clearSeatAssignment(seat);
            }
          }
          clearReadyCheckTimer(cleanCode);
          if (room.status === 'READY_CHECK') {
            room.status = 'WAITING';
            delete room.readyCheckExpiresAt;
            for (const seat of room.seats || []) {
              if ((seat.profileId || seat.profile_id) && !seat.isBot && !seat.is_bot) {
                seat.isReady = false;
                seat.is_ready = false;
              }
            }
          }
          nextRoomSeqId(room);
          await requeueOrCleanupPublicRoom(room);
          await persistRoomState(room);
          broadcastToRoom(room, 'ROOM_LEFT', { leftProfileId: pid });
        }
      }
      socket.roomCode = undefined;
      socket.seatIndex = null;
      if (pid) await updatePresenceForProfile(pid, 'IN_LOBBY');
      socket.send(JSON.stringify({ type: 'MATCHMAKE_CANCELLED', payload: {} }));
      break;
    }

    // ========================================================================
    // 1. ROOM_CREATE
    // ========================================================================
    case 'ROOM_CREATE': {
      const hostProfile = payload.hostProfile || {
        id: socket.profileId || payload.profileId || `guest_${Date.now()}`,
        displayName: socket.displayName || payload.displayName || 'Host',
        avatarId: socket.avatarId || payload.avatarId || 'sultan',
      };
      socket.profileId = hostProfile.id;
      socket.displayName = hostProfile.displayName;
      activeClients.set(hostProfile.id, socket);

      const room = buildRoomObject({
        hostProfile,
        mode: payload.mode || 'DIGU',
        variant: payload.variant,
        roomCode: payload.roomCode,
        stakeBuyIn: payload.stakeBuyIn,
        targetScore: payload.targetScore,
        turnTimerSeconds: payload.turnTimerSeconds,
        fillEmptySeatsWithBots: payload.isPrivate === false ? false : Boolean(payload.fillEmptySeatsWithBots),
        isPrivate: payload.isPrivate ?? true,
      });

      socket.roomCode = room.roomCode;
      socket.seatIndex = 0;

      await persistRoomState(room);
      await updatePresenceForProfile(hostProfile.id, 'IN_ROOM', {
        roomCode: room.roomCode,
        mode: room.mode,
        variant: room.variant,
      });

      if (payload.sessionToken) {
        await RedisState.saveClientSession(payload.sessionToken, {
          roomCode: room.roomCode,
          seatIndex: 0,
          profileId: hostProfile.id,
          joinedAt: new Date().toISOString(),
        });
      }

      socket.send(
        JSON.stringify({
          type: 'ROOM_CREATED',
          seqId: room.seqId,
          payload: {
            seqId: room.seqId,
            roomCode: room.roomCode,
            seatIndex: 0,
            room: sanitizeStateForSeat(room, 0),
          },
        })
      );
      break;
    }

    // ========================================================================
    // 2. ROOM_JOIN
    // ========================================================================
    case 'ROOM_JOIN': {
      const cleanCode = normalizeRoomCode(payload.roomCode || '');
      const profile = payload.profile || {
        id: socket.profileId || payload.profileId || `guest_${Date.now()}`,
        displayName: socket.displayName || payload.displayName || 'Player',
        avatarId: socket.avatarId || payload.avatarId || 'sultan',
      };

      socket.profileId = profile.id;
      socket.displayName = profile.displayName;
      activeClients.set(profile.id, socket);

      const room = await loadRoomState(cleanCode);
      if (!room) {
        socket.send(
          JSON.stringify({
            type: 'ROOM_ERROR',
            payload: { error: `Room ${cleanCode} not found`, roomCode: cleanCode },
          })
        );
        return;
      }

      if (!Array.isArray(room.spectators)) {
        room.spectators = [];
      }

      const seats: any[] = room.seats || [];
      let assignedSeatIndex: number | null = null;
      let role: 'PLAYER' | 'SPECTATOR' = 'PLAYER';

      if (payload.asSpectator) {
        role = 'SPECTATOR';
        if (!room.spectators.some((s: RoomSpectator) => s.profileId === profile.id)) {
          room.spectators.push({
            profileId: profile.id,
            displayName: profile.displayName || 'Spectator',
            avatarId: profile.avatarId || 'sultan',
            joinedAt: new Date().toISOString(),
          });
        }
      } else {
        let seat = seats.find((s: any) => (s.profileId || s.profile_id) === profile.id);
        if (seat) {
          seat.isConnected = true;
          seat.is_connected = true;
          assignedSeatIndex = seat.seatIndex ?? seat.seat_index ?? 0;
        } else {
          const openSeat =
            seats.find((s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot) ||
            (room.status === 'WAITING' ? seats.find((s: any) => s.isBot || s.is_bot) : null);

          if (openSeat) {
            assignedSeatIndex = openSeat.seatIndex ?? openSeat.seat_index ?? 0;
            openSeat.profileId = profile.id;
            openSeat.profile_id = profile.id;
            openSeat.playerName = profile.displayName || 'Player';
            openSeat.player_name = profile.displayName || 'Player';
            openSeat.avatarId = profile.avatarId || 'sultan';
            openSeat.avatar_id = profile.avatarId || 'sultan';
            openSeat.isBot = false;
            openSeat.is_bot = false;
            openSeat.isReady = true;
            openSeat.is_ready = true;
            openSeat.isConnected = true;
            openSeat.is_connected = true;
            openSeat.joinedAt = new Date().toISOString();
          } else {
            role = 'SPECTATOR';
            if (!room.spectators.some((s: RoomSpectator) => s.profileId === profile.id)) {
              room.spectators.push({
                profileId: profile.id,
                displayName: profile.displayName || 'Spectator',
                avatarId: profile.avatarId || 'sultan',
                joinedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      room.currentPlayerCount = seats.filter(
        (s: any) => (s.isConnected || s.is_connected) && !s.isBot && !s.is_bot
      ).length;
      room.current_player_count = room.currentPlayerCount;

      socket.roomCode = room.roomCode;
      socket.seatIndex = assignedSeatIndex;

      nextRoomSeqId(room);
      await persistRoomState(room);

      if (payload.sessionToken && assignedSeatIndex !== null) {
        await RedisState.saveClientSession(payload.sessionToken, {
          roomCode: room.roomCode,
          seatIndex: assignedSeatIndex,
          profileId: profile.id,
          joinedAt: new Date().toISOString(),
        });
      }

      broadcastToRoom(room, 'ROOM_JOINED', {
        joinedProfileId: profile.id,
        joinedDisplayName: profile.displayName,
        role,
        seatIndex: assignedSeatIndex,
      });
      break;
    }

    // ========================================================================
    // 3. ROOM_LEAVE
    // ========================================================================
    case 'ROOM_LEAVE': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const pid = socket.profileId || payload.profileId;
      if (!cleanCode || !pid) return;

      const room = await loadRoomState(cleanCode);
      if (!room) return;

      if (Array.isArray(room.seats)) {
        for (const seat of room.seats) {
          if ((seat.profileId || seat.profile_id) === pid) {
            if (room.status === 'PLAYING') {
              // Convert abandoned active match seat to a bot so the match can continue smoothly
              seat.isBot = true;
              seat.is_bot = true;
              seat.isConnected = false;
              seat.is_connected = false;
              seat.playerName = `${seat.playerName || 'Player'} (Bot)`;
              seat.player_name = seat.playerName;
            } else {
              const sIdx = seat.seatIndex ?? seat.seat_index ?? 0;
              seat.profileId = null;
              seat.profile_id = null;
              seat.playerName = `Seat ${sIdx + 1}`;
              seat.player_name = `Seat ${sIdx + 1}`;
              seat.isBot = false;
              seat.is_bot = false;
              seat.isReady = false;
              seat.is_ready = false;
              seat.isConnected = false;
              seat.is_connected = false;
            }
          }
        }
      }

      if (Array.isArray(room.spectators)) {
        room.spectators = room.spectators.filter(
          (sp: RoomSpectator) => sp.profileId !== pid
        );
      }

      clearReadyCheckTimer(cleanCode);
      if (room.status === 'READY_CHECK') {
        room.status = 'WAITING';
        delete room.readyCheckExpiresAt;
        for (const s of room.seats || []) {
          if ((s.profileId || s.profile_id) && !s.isBot && !s.is_bot) {
            s.isReady = false;
            s.is_ready = false;
          }
        }
      }

      socket.roomCode = undefined;
      socket.seatIndex = null;

      nextRoomSeqId(room);
      await requeueOrCleanupPublicRoom(room);
      await persistRoomState(room);
      await updatePresenceForProfile(pid, 'IN_LOBBY');

      broadcastToRoom(room, 'ROOM_LEFT', {
        leftProfileId: pid,
      });
      break;
    }

    // ========================================================================
    // 4. SEAT_ASSIGN (Compass Seat Switching / Bot Seat Assignment)
    // ========================================================================
    case 'SEAT_ASSIGN': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const pid = socket.profileId || payload.profileId;
      const targetSeatIndex = Number(payload.seatIndex ?? payload.targetSeatIndex);

      const room = await loadRoomState(cleanCode);
      if (!room || !Array.isArray(room.seats)) return;

      if (isNaN(targetSeatIndex) || targetSeatIndex < 0 || targetSeatIndex >= room.seats.length) {
        return;
      }

      const targetSeat = room.seats[targetSeatIndex];

      // Case A: Toggle bot on a seat
      if (payload.assignBot !== undefined) {
        if (payload.assignBot) {
          targetSeat.profileId = `bot_seat_${targetSeatIndex}`;
          targetSeat.profile_id = targetSeat.profileId;
          targetSeat.playerName = `Bot ${targetSeatIndex + 1}`;
          targetSeat.player_name = targetSeat.playerName;
          targetSeat.isBot = true;
          targetSeat.is_bot = true;
          targetSeat.isReady = true;
          targetSeat.is_ready = true;
          targetSeat.isConnected = true;
          targetSeat.is_connected = true;
        } else if (targetSeat.isBot || targetSeat.is_bot) {
          targetSeat.profileId = null;
          targetSeat.profile_id = null;
          targetSeat.playerName = `Seat ${targetSeatIndex + 1}`;
          targetSeat.player_name = targetSeat.playerName;
          targetSeat.isBot = false;
          targetSeat.is_bot = false;
          targetSeat.isReady = false;
          targetSeat.is_ready = false;
          targetSeat.isConnected = false;
          targetSeat.is_connected = false;
        }
      } else if (pid) {
        // Case B: Player moves to targetSeatIndex if empty or bot-occupied
        const isTargetAvailable =
          !targetSeat.profileId ||
          targetSeat.isBot ||
          targetSeat.is_bot ||
          targetSeat.profileId === pid;

        if (isTargetAvailable) {
          const currentSeat = room.seats.find(
            (s: any) => (s.profileId || s.profile_id) === pid
          );
          const pName =
            currentSeat?.playerName || socket.displayName || payload.displayName || 'Player';
          const pAvatar =
            currentSeat?.avatarId || socket.avatarId || payload.avatarId || 'sultan';

          if (currentSeat && (currentSeat.seatIndex ?? currentSeat.seat_index) !== targetSeatIndex) {
            const oldIdx = currentSeat.seatIndex ?? currentSeat.seat_index ?? 0;
            currentSeat.profileId = null;
            currentSeat.profile_id = null;
            currentSeat.playerName = `Seat ${oldIdx + 1}`;
            currentSeat.player_name = `Seat ${oldIdx + 1}`;
            currentSeat.isBot = false;
            currentSeat.is_bot = false;
            currentSeat.isReady = false;
            currentSeat.is_ready = false;
            currentSeat.isConnected = false;
            currentSeat.is_connected = false;
          }

          targetSeat.profileId = pid;
          targetSeat.profile_id = pid;
          targetSeat.playerName = pName;
          targetSeat.player_name = pName;
          targetSeat.avatarId = pAvatar;
          targetSeat.avatar_id = pAvatar;
          targetSeat.teamId = targetSeatIndex % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
          targetSeat.team_id = targetSeat.teamId;
          targetSeat.isBot = false;
          targetSeat.is_bot = false;
          targetSeat.isReady = true;
          targetSeat.is_ready = true;
          targetSeat.isConnected = true;
          targetSeat.is_connected = true;

          socket.seatIndex = targetSeatIndex;
        }
      }

      nextRoomSeqId(room);
      await persistRoomState(room);
      broadcastToRoom(room, 'SEAT_ASSIGNED', {
        seatIndex: targetSeatIndex,
        profileId: pid,
      });
      break;
    }

    // ========================================================================
    // 5. READY_TOGGLE (and Custom Rule Toggles)
    // ========================================================================
    case 'READY_TOGGLE': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const pid = socket.profileId || payload.profileId;
      const room = await loadRoomState(cleanCode);
      if (!room) return;

      // Stage-2 Ready Check Decline handling: drop declining player and re-queue ready players
      if (room.status === 'READY_CHECK' && payload.accept === false) {
        clearReadyCheckTimer(cleanCode);
        for (const seat of room.seats || []) {
          if ((seat.profileId || seat.profile_id) === pid) {
            clearSeatAssignment(seat);
          } else if ((seat.profileId || seat.profile_id) && !seat.isBot && !seat.is_bot) {
            seat.isReady = false;
            seat.is_ready = false;
          }
        }
        room.status = 'WAITING';
        delete room.readyCheckExpiresAt;
        socket.roomCode = undefined;
        socket.seatIndex = null;
        nextRoomSeqId(room);
        await requeueOrCleanupPublicRoom(room);
        await persistRoomState(room);
        if (pid) await updatePresenceForProfile(pid, 'IN_LOBBY');
        socket.send(
          JSON.stringify({
            type: 'READY_CHECK_FAILED',
            payload: { reason: 'You declined the match', roomCode: cleanCode },
          })
        );
        broadcastToRoom(room, 'READY_CHECK_TIMEOUT', {
          droppedIds: pid ? [pid] : [],
          message: 'A player declined. Returned to queue.',
        });
        break;
      }

      if (Array.isArray(room.seats) && pid) {
        for (const seat of room.seats) {
          if ((seat.profileId || seat.profile_id) === pid) {
            const explicitReady =
              payload.accept !== undefined
                ? Boolean(payload.accept)
                : payload.isReady !== undefined
                ? Boolean(payload.isReady)
                : !seat.isReady;
            seat.isReady = explicitReady;
            seat.is_ready = explicitReady;
          }
        }
      }

      // Optional custom rule updates included in READY_TOGGLE (bots restricted to private rooms only)
      if (payload.targetScore !== undefined) {
        room.targetScore = Number(payload.targetScore);
        room.target_score = room.targetScore;
      }
      if (payload.turnTimerSeconds !== undefined) {
        room.turnTimerSeconds = Number(payload.turnTimerSeconds);
        room.turn_timer_seconds = room.turnTimerSeconds;
      }
      if (payload.fillEmptySeatsWithBots !== undefined && (room.isPrivate ?? room.is_private)) {
        room.fillEmptySeatsWithBots = Boolean(payload.fillEmptySeatsWithBots);
        room.fill_empty_seats_with_bots = room.fillEmptySeatsWithBots;
        applyBotsToEmptySeats(room);
      }

      room.customRules = {
        targetScore: room.targetScore ?? 1000,
        turnTimerSeconds: room.turnTimerSeconds ?? 15,
        fillEmptySeatsWithBots: Boolean(room.fillEmptySeatsWithBots),
      };

      nextRoomSeqId(room);
      await persistRoomState(room);
      broadcastToRoom(room, 'READY_UPDATED', {
        profileId: pid,
        customRules: room.customRules,
      });

      // Auto-launch match immediately once every required human accepts Stage-2 Ready Check
      if (room.status === 'READY_CHECK') {
        const seats: any[] = room.seats || [];
        const maxPlayers = Number(room.maxPlayers) || seats.length || 4;
        const readyHumans = seats.filter(
          (s: any) =>
            (s.profileId || s.profile_id) &&
            !s.isBot &&
            !s.is_bot &&
            Boolean(s.isReady ?? s.is_ready)
        );
        if (readyHumans.length >= maxPlayers) {
          await startMatchForRoom(room);
        }
      }
      break;
    }

    // ========================================================================
    // 6. MATCH_START
    // ========================================================================
    case 'MATCH_START': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const room = await loadRoomState(cleanCode);
      if (!room) return;

      if (payload.mode) {
        room.mode = payload.mode;
      }
      if (payload.variant) {
        room.variant = payload.variant;
      }
      if (payload.targetScore !== undefined) {
        room.targetScore = Number(payload.targetScore);
        room.target_score = room.targetScore;
      }
      if (payload.turnTimerSeconds !== undefined) {
        room.turnTimerSeconds = Number(payload.turnTimerSeconds);
        room.turn_timer_seconds = room.turnTimerSeconds;
      }
      // Strictly disallow bot-filling on public queues; private rooms obey host toggle (default false)
      if (payload.fillEmptySeatsWithBots !== undefined && (room.isPrivate ?? room.is_private)) {
        room.fillEmptySeatsWithBots = Boolean(payload.fillEmptySeatsWithBots);
        room.fill_empty_seats_with_bots = room.fillEmptySeatsWithBots;
      } else if (!(room.isPrivate ?? room.is_private)) {
        room.fillEmptySeatsWithBots = false;
        room.fill_empty_seats_with_bots = false;
      }

      await startMatchForRoom(room, payload.seed, socket);
      break;
    }

    // ========================================================================
    // 7. ACTION_SUBMIT (Authoritative Turn Validation & State Broadcast)
    // ========================================================================
    case 'ACTION_SUBMIT': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const room = await loadRoomState(cleanCode);
      if (!room) return;

      const pid = socket.profileId || payload.profileId;
      let seatIndex: number =
        typeof payload.seatIndex === 'number'
          ? payload.seatIndex
          : typeof socket.seatIndex === 'number'
          ? socket.seatIndex
          : 0;

      if (Array.isArray(room.seats) && pid) {
        const foundSeat = room.seats.find(
          (s: any) => (s.profileId || s.profile_id) === pid
        );
        if (foundSeat) {
          seatIndex = foundSeat.seatIndex ?? foundSeat.seat_index ?? seatIndex;
        }
      }

      const actionObj = payload.action || payload;
      const result = validateAndApplyAction(room, seatIndex, actionObj);

      if (!result.valid) {
        socket.send(
          JSON.stringify({
            type: 'ACTION_REJECTED',
            seqId: room.seqId || 1,
            payload: {
              seqId: room.seqId || 1,
              actionId: payload.actionId,
              error: result.error || 'Invalid action',
              room: sanitizeStateForSeat(room, seatIndex),
            },
          })
        );
        return;
      }

      nextRoomSeqId(room);
      if (result.matchEnded) {
        room.status = 'COMPLETED';
      }

      await persistRoomState(room);

      broadcastToRoom(room, 'STATE_UPDATE', {
        actionId: payload.actionId,
        actorSeatIndex: seatIndex,
        actionType: actionObj.type,
        summary: result.summary,
        roundEnded: !!result.roundEnded,
        matchEnded: !!result.matchEnded,
      });

      if (result.roundEnded || result.matchEnded) {
        clearRoomTurnTimer(cleanCode);
      } else {
        scheduleTurnTimer(room);
      }
      break;
    }

    // ========================================================================
    // 8. SYNC_RECONCILE (Reconnect & Authoritative Snapshot Recovery)
    // ========================================================================
    case 'SYNC_RECONCILE': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const pid = socket.profileId || payload.profileId;
      const room = await loadRoomState(cleanCode);

      if (!room) {
        socket.send(
          JSON.stringify({
            type: 'SYNC_RECONCILE_FAILED',
            payload: { error: `Room ${cleanCode} not found or expired` },
          })
        );
        return;
      }

      let viewerSeatIndex: number | null =
        typeof payload.seatIndex === 'number' ? payload.seatIndex : socket.seatIndex ?? null;

      if (Array.isArray(room.seats) && pid) {
        const seat = room.seats.find((s: any) => (s.profileId || s.profile_id) === pid);
        if (seat) {
          seat.isConnected = true;
          seat.is_connected = true;
          viewerSeatIndex = seat.seatIndex ?? seat.seat_index ?? 0;
        }
      }

      socket.roomCode = room.roomCode;
      socket.seatIndex = viewerSeatIndex;

      await persistRoomState(room);

      socket.send(
        JSON.stringify({
          type: 'SYNC_RECONCILED',
          seqId: room.seqId || 1,
          payload: {
            seqId: room.seqId || 1,
            roomCode: room.roomCode,
            seatIndex: viewerSeatIndex,
            room: sanitizeStateForSeat(room, viewerSeatIndex),
          },
        })
      );
      break;
    }

    // ========================================================================
    // 9. QUICK_CHAT_EMOTE (Thaana & Latin Table Quick-Chat Broadcast)
    // ========================================================================
    case 'QUICK_CHAT_EMOTE': {
      const cleanCode = normalizeRoomCode(payload.roomCode || socket.roomCode || '');
      const room = await loadRoomState(cleanCode);
      if (!room) return;

      const pid = socket.profileId || payload.profileId || 'guest';
      const seatIndex =
        typeof payload.seatIndex === 'number'
          ? payload.seatIndex
          : socket.seatIndex ?? 0;

      nextRoomSeqId(room);

      broadcastToRoom(room, 'QUICK_CHAT_EMOTE', {
        senderId: pid,
        senderName: payload.senderName || socket.displayName || 'Player',
        seatIndex,
        emoteId: payload.emoteId || 'welcome',
        text: payload.text || 'Maruhabaa!',
        thaanaText: payload.thaanaText || 'މަރުޙަބާ!',
        timestamp: Date.now(),
      });
      break;
    }

    case 'UPDATE_PRESENCE': {
      if (!socket.profileId) return;
      const { status, matchInfo } = payload;
      await updatePresenceForProfile(socket.profileId, status || 'IN_LOBBY', matchInfo);
      break;
    }

    case 'SEND_MATCH_INVITE': {
      if (!socket.profileId) return;
      const { friendId, roomId, roomCode, mode, format, variant, stakeBuyIn, targetScore } = payload;
      if (!friendId || !roomCode) {
        socket.send(
          JSON.stringify({
            type: 'MATCH_INVITE_ERROR',
            payload: { error: 'friendId and roomCode are required' },
          })
        );
        return;
      }

      try {
        const memSender = inMemoryProfiles.get(socket.profileId);
        let senderName = memSender?.display_name || socket.displayName || 'Host';
        let senderUsername = memSender?.username || socket.username || '';
        let senderAvatarId = memSender?.avatar_id || socket.avatarId || 'sultan';

        try {
          const fsSender = await getProfileById(socket.profileId);
          if (fsSender) {
            senderName = fsSender.display_name || senderName;
            senderUsername = fsSender.username || senderUsername;
            senderAvatarId = fsSender.avatar_id || senderAvatarId;
          }
        } catch {}

        let inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 20000).toISOString();
        const normalizedVariant = String(format || variant || '').toLowerCase() || undefined;

        try {
          const inviteRes = await query(
            `INSERT INTO match_invitations 
              (room_id, room_code, sender_id, sender_name, sender_avatar_id, receiver_id, mode, stake_buy_in, target_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, created_at, expires_at`,
            [
              roomId || null,
              roomCode,
              socket.profileId,
              senderName,
              senderAvatarId,
              friendId,
              mode,
              Number(stakeBuyIn) || 1000,
              Number(targetScore) || 1000,
            ]
          );
          if (inviteRes?.rows?.[0]?.id) {
            inviteId = String(inviteRes.rows[0].id);
          }
        } catch {
          // PG offline (Cloud Run); Firestore + memory handle invites reliably
        }

        const storedInvite: StoredMatchInvitation = {
          id: inviteId,
          sender_id: socket.profileId,
          receiver_id: friendId,
          room_code: roomCode,
          mode: String(mode || 'DIGU'),
          format: normalizedVariant,
          stake: Number(stakeBuyIn) || 1000,
          status: 'PENDING',
          created_at: createdAt,
          expires_at: expiresAt,
        };
        inMemoryInvitations.set(inviteId, storedInvite);
        await saveMatchInvitation(storedInvite);

        const targetSocket = activeClients.get(friendId);
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(
            JSON.stringify({
              type: 'MATCH_INVITE_RECEIVED',
              payload: {
                id: inviteId,
                roomId: roomId || null,
                roomCode,
                senderId: socket.profileId,
                senderName,
                senderUsername,
                senderAvatarId,
                mode,
                format: normalizedVariant,
                stakeBuyIn: Number(stakeBuyIn) || 1000,
                targetScore: Number(targetScore) || 1000,
                expiresAt,
              },
            })
          );
        }

        socket.send(
          JSON.stringify({
            type: 'MATCH_INVITE_SENT_SUCCESS',
            payload: { inviteId, friendId, roomCode },
          })
        );
      } catch (err: any) {
        socket.send(
          JSON.stringify({
            type: 'MATCH_INVITE_ERROR',
            payload: { error: err.message },
          })
        );
      }
      break;
    }

    case 'RESPOND_MATCH_INVITE': {
      if (!socket.profileId) return;
      const { inviteId, accept } = payload;
      if (!inviteId) return;

      try {
        const status = accept ? 'ACCEPTED' : 'DECLINED';
        let invite: StoredMatchInvitation | null = inMemoryInvitations.get(inviteId) || null;

        try {
          const inviteRes = await query(
            'UPDATE match_invitations SET status = $1 WHERE id::text = $2 RETURNING *',
            [status, inviteId]
          );
          if (inviteRes?.rows?.[0]) {
            invite = inviteRes.rows[0];
          }
        } catch {}

        if (!invite) {
          invite = await getMatchInvitation(inviteId);
        }

        if (invite) {
          invite.status = status;
          inMemoryInvitations.set(inviteId, invite);
        }
        await updateMatchInvitationStatus(inviteId, status);

        if (!invite) return;

        const senderSocket = activeClients.get(invite.sender_id);
        if (senderSocket && senderSocket.readyState === WebSocket.OPEN) {
          senderSocket.send(
            JSON.stringify({
              type: 'MATCH_INVITE_RESPONSE',
              payload: {
                inviteId,
                receiverId: socket.profileId,
                receiverName: socket.displayName || 'Player',
                accepted: Boolean(accept),
                roomCode: invite.room_code,
              },
            })
          );
        }

        socket.send(
          JSON.stringify({
            type: 'MATCH_INVITE_RESPOND_ACK',
            payload: {
              inviteId,
              accepted: Boolean(accept),
              roomCode: invite.room_code,
            },
          })
        );
      } catch (err: any) {
        console.error('[Respond Invite Error]:', err.message);
      }
      break;
    }

    default:
      break;
  }
}

async function handleDisconnection(profileId: string) {
  const sock = activeClients.get(profileId);
  activeClients.delete(profileId);

  if (sock?.roomCode) {
    const room = await loadRoomState(sock.roomCode);
    if (room && Array.isArray(room.seats)) {
      const seat = room.seats.find(
        (s: any) => (s.profileId || s.profile_id) === profileId
      );
      if (seat) {
        seat.isConnected = false;
        seat.is_connected = false;
        nextRoomSeqId(room);
        await persistRoomState(room);
        broadcastToRoom(room, 'PLAYER_DISCONNECTED', {
          profileId,
          seatIndex: seat.seatIndex ?? seat.seat_index,
        });
      }
    }
  }

  await updatePresenceForProfile(profileId, 'OFFLINE');
}

async function broadcastPresenceToFriends(
  profileId: string,
  status: string,
  matchInfo?: any
) {
  const friendIds = new Set<string>();

  for (const f of inMemoryFriendships) {
    if (f.status === 'ACCEPTED') {
      if (f.user_id === profileId) friendIds.add(f.friend_id);
      else if (f.friend_id === profileId) friendIds.add(f.user_id);
    }
  }

  try {
    const fsFriends = await getAcceptedFriends(profileId);
    for (const f of fsFriends) {
      if (f.friendId) friendIds.add(f.friendId);
    }
  } catch {}

  try {
    const res = await query(
      `SELECT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END AS friend_id
       FROM friendships
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'ACCEPTED'`,
      [profileId]
    );
    for (const row of res?.rows || []) {
      if (row.friend_id) friendIds.add(row.friend_id);
    }
  } catch {}

  for (const fid of friendIds) {
    const friendSocket = activeClients.get(fid);
    if (friendSocket && friendSocket.readyState === WebSocket.OPEN) {
      friendSocket.send(
        JSON.stringify({
          type: 'FRIEND_PRESENCE_UPDATE',
          payload: {
            friendId: profileId,
            status,
            matchInfo,
          },
        })
      );
    }
  }
}
