import { WebSocketServer, WebSocket } from 'ws';
import { query } from '../db.js';
import { RedisState } from '../redis.js';
import { upsertProfile, saveRoom } from '../firestore.js';
import {
  memoryRooms,
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

export interface AuthenticatedSocket extends WebSocket {
  profileId?: string;
  displayName?: string;
  avatarId?: string;
  roomCode?: string;
  seatIndex?: number | null;
  isAlive?: boolean;
}

export interface MemoryProfile {
  id: string;
  display_name: string;
  avatar_id: string;
  friend_code: string;
  level: number;
  presence_status: 'IN_LOBBY' | 'IN_MATCH' | 'OFFLINE';
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

// Active connected clients: profileId -> AuthenticatedSocket
export const activeClients = new Map<string, AuthenticatedSocket>();

// Active turn timers per roomCode
export const roomTurnTimers = new Map<string, NodeJS.Timeout>();

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
  const { type, payload = {} } = message;

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
      const { profileId, displayName, avatarId, friendCode, level, sessionToken } = payload;
      if (!profileId) return;

      socket.profileId = profileId;
      socket.displayName = displayName || 'Player';
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

      inMemoryProfiles.set(profileId, {
        id: profileId,
        display_name: displayName || existing?.display_name || 'Player',
        avatar_id: avatarId || existing?.avatar_id || 'boduthakurufaanu',
        friend_code: resolvedFriendCode,
        level: level || existing?.level || 1,
        presence_status: 'IN_LOBBY',
        last_active_at: new Date().toISOString(),
      });

      upsertProfile({
        id: profileId,
        display_name: displayName || existing?.display_name || 'Player',
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
          payload: { profileId, status: 'IN_LOBBY', friendCode: resolvedFriendCode },
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
        roomCode: payload.roomCode,
        stakeBuyIn: payload.stakeBuyIn,
        targetScore: payload.targetScore,
        turnTimerSeconds: payload.turnTimerSeconds,
        fillEmptySeatsWithBots: payload.fillEmptySeatsWithBots,
        isPrivate: payload.isPrivate ?? true,
      });

      socket.roomCode = room.roomCode;
      socket.seatIndex = 0;

      await persistRoomState(room);

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

      socket.roomCode = undefined;
      socket.seatIndex = null;

      nextRoomSeqId(room);
      await persistRoomState(room);

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

      if (Array.isArray(room.seats) && pid) {
        const seat = room.seats.find((s: any) => (s.profileId || s.profile_id) === pid);
        if (seat) {
          const nextReady =
            payload.isReady !== undefined ? Boolean(payload.isReady) : !seat.isReady;
          seat.isReady = nextReady;
          seat.is_ready = nextReady;
        }
      }

      // Optional custom rule updates included in READY_TOGGLE
      if (payload.targetScore !== undefined) {
        room.targetScore = Number(payload.targetScore);
        room.target_score = room.targetScore;
      }
      if (payload.turnTimerSeconds !== undefined) {
        room.turnTimerSeconds = Number(payload.turnTimerSeconds);
        room.turn_timer_seconds = room.turnTimerSeconds;
      }
      if (payload.fillEmptySeatsWithBots !== undefined) {
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
      if (payload.targetScore !== undefined) {
        room.targetScore = Number(payload.targetScore);
        room.target_score = room.targetScore;
      }
      if (payload.turnTimerSeconds !== undefined) {
        room.turnTimerSeconds = Number(payload.turnTimerSeconds);
        room.turn_timer_seconds = room.turnTimerSeconds;
      }
      if (payload.fillEmptySeatsWithBots !== undefined) {
        room.fillEmptySeatsWithBots = Boolean(payload.fillEmptySeatsWithBots);
        room.fill_empty_seats_with_bots = room.fillEmptySeatsWithBots;
      } else {
        // Default to filling any empty seats with bots on match start so 4-seat games always have 4 players
        room.fillEmptySeatsWithBots = true;
        room.fill_empty_seats_with_bots = true;
      }

      applyBotsToEmptySeats(room);
      room.status = 'PLAYING';
      initializeRoomMatchState(room, payload.seed);
      nextRoomSeqId(room);

      await persistRoomState(room);

      broadcastToRoom(room, 'MATCH_STARTED', {
        mode: room.mode,
        activeSeat: room.gameState.activeSeat,
      });

      scheduleTurnTimer(room);
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

      upsertProfile({
        id: socket.profileId,
        presence_status: status,
        current_match_info: matchInfo,
        last_active_at: new Date().toISOString(),
      }).catch(() => {});

      try {
        await query(
          'UPDATE profiles SET presence_status = $1, current_match_info = $2, last_active_at = now() WHERE id = $3',
          [status, matchInfo ? JSON.stringify(matchInfo) : null, socket.profileId]
        );
      } catch {}

      await broadcastPresenceToFriends(socket.profileId, status, matchInfo);
      break;
    }

    case 'SEND_MATCH_INVITE': {
      if (!socket.profileId) return;
      const { friendId, roomId, roomCode, mode, stakeBuyIn, targetScore } = payload;

      try {
        const senderRes = await query(
          'SELECT display_name, avatar_id FROM profiles WHERE id = $1',
          [socket.profileId]
        );
        const sender = senderRes.rows[0] || {
          display_name: socket.displayName || 'Host',
          avatar_id: 'sultan',
        };

        const inviteRes = await query(
          `INSERT INTO match_invitations 
            (room_id, room_code, sender_id, sender_name, sender_avatar_id, receiver_id, mode, stake_buy_in, target_score)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, created_at, expires_at`,
          [
            roomId || null,
            roomCode,
            socket.profileId,
            sender.display_name,
            sender.avatar_id,
            friendId,
            mode,
            stakeBuyIn,
            targetScore,
          ]
        );

        const invite = inviteRes.rows[0];

        const targetSocket = activeClients.get(friendId);
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(
            JSON.stringify({
              type: 'MATCH_INVITE_RECEIVED',
              payload: {
                id: invite.id,
                roomId,
                roomCode,
                senderId: socket.profileId,
                senderName: sender.display_name,
                senderAvatarId: sender.avatar_id,
                mode,
                stakeBuyIn,
                targetScore,
                expiresAt: invite.expires_at,
              },
            })
          );
        }

        socket.send(
          JSON.stringify({
            type: 'MATCH_INVITE_SENT_SUCCESS',
            payload: { inviteId: invite.id, friendId, roomCode },
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

      try {
        const status = accept ? 'ACCEPTED' : 'DECLINED';
        const inviteRes = await query(
          'UPDATE match_invitations SET status = $1 WHERE id = $2 RETURNING *',
          [status, inviteId]
        );

        if (inviteRes.rows.length === 0) return;
        const invite = inviteRes.rows[0];

        const senderSocket = activeClients.get(invite.sender_id);
        if (senderSocket && senderSocket.readyState === WebSocket.OPEN) {
          senderSocket.send(
            JSON.stringify({
              type: 'MATCH_INVITE_RESPONSE',
              payload: {
                inviteId,
                receiverId: socket.profileId,
                receiverName: socket.displayName,
                accepted: accept,
                roomCode: invite.room_code,
              },
            })
          );
        }

        socket.send(
          JSON.stringify({
            type: 'MATCH_INVITE_RESPOND_ACK',
            payload: { inviteId, accepted: accept, roomCode: invite.room_code },
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

  upsertProfile({
    id: profileId,
    presence_status: 'OFFLINE',
    current_match_info: null,
    last_active_at: new Date().toISOString(),
  }).catch(() => {});
  try {
    await query(
      "UPDATE profiles SET presence_status = 'OFFLINE', current_match_info = NULL, last_active_at = now() WHERE id = $1",
      [profileId]
    );
  } catch {}
  await broadcastPresenceToFriends(profileId, 'OFFLINE');
}

async function broadcastPresenceToFriends(
  profileId: string,
  status: string,
  matchInfo?: any
) {
  try {
    const res = await query(
      `SELECT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END AS friend_id
       FROM friendships
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'ACCEPTED'`,
      [profileId]
    );

    for (const row of res.rows) {
      const friendSocket = activeClients.get(row.friend_id);
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
  } catch {}
}
