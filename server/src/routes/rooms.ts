import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { RedisState } from '../redis.js';
import { saveRoom, getRoomByCode } from '../firestore.js';

export const roomsRouter = Router();

// Unambiguous 32-character alphanumeric alphabet (excludes I, O, 0, 1)
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// In-memory fallback cache so room operations stay functional even without Postgres/Redis
export const memoryRooms: Record<string, any> = {};

/**
 * Generates an unambiguous 6-character alphanumeric room code (e.g. MLD842).
 */
export function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[idx];
  }
  return code;
}

/**
 * Normalizes a 6-character alphanumeric room code (e.g. MLD842)
 * while preserving full backward compatibility with 4-digit numeric codes (e.g. 8842).
 */
export function normalizeRoomCode(input: string): string {
  if (!input) return '';
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/^THAAS-|^DIGU-|^ROOM-/, '')
    .replace(/[^A-Z0-9]/g, '');

  if (/^\d{4}$/.test(cleaned)) {
    return cleaned;
  }
  if (cleaned.length >= 6) {
    return cleaned.substring(0, 6);
  }
  return cleaned;
}

export interface CustomRuleToggles {
  targetScore: number;
  turnTimerSeconds: number;
  fillEmptySeatsWithBots: boolean;
}

export interface RoomSpectator {
  profileId: string;
  displayName: string;
  avatarId: string;
  joinedAt: string;
}

const BOT_NAMES = ['Hassan (Bot)', 'Aishath (Bot)', 'Ibrahim (Bot)', 'Mariyam (Bot)'];
const BOT_AVATARS = ['boduthakurufaanu', 'koimala', 'rehendhi', 'sultan'];

/**
 * Populates empty seats with heuristic bots when fillEmptySeatsWithBots is enabled.
 */
export function applyBotsToEmptySeats(room: any): void {
  if (!room || !Array.isArray(room.seats)) return;
  const shouldFill =
    room.fillEmptySeatsWithBots ?? room.customRules?.fillEmptySeatsWithBots ?? false;

  room.seats.forEach((seat: any, idx: number) => {
    const hasHuman = !!(seat.profileId || seat.profile_id) && !seat.isBot && !seat.is_bot;
    if (!hasHuman) {
      if (shouldFill) {
        const botId = `bot_seat_${idx}`;
        seat.profileId = botId;
        seat.profile_id = botId;
        seat.playerName = BOT_NAMES[idx % BOT_NAMES.length];
        seat.player_name = BOT_NAMES[idx % BOT_NAMES.length];
        seat.avatarId = BOT_AVATARS[idx % BOT_AVATARS.length];
        seat.avatar_id = BOT_AVATARS[idx % BOT_AVATARS.length];
        seat.isBot = true;
        seat.is_bot = true;
        seat.isReady = true;
        seat.is_ready = true;
        seat.isConnected = true;
        seat.is_connected = true;
      } else if (seat.isBot || seat.is_bot) {
        seat.profileId = null;
        seat.profile_id = null;
        seat.playerName = `Seat ${idx + 1}`;
        seat.player_name = `Seat ${idx + 1}`;
        seat.isBot = false;
        seat.is_bot = false;
        seat.isReady = false;
        seat.is_ready = false;
        seat.isConnected = false;
        seat.is_connected = false;
      }
    }
  });
}

/**
 * Helper to construct a canonical room object with seats, spectators, custom rules, and seqId.
 */
export function buildRoomObject(params: {
  hostProfile: any;
  mode: string;
  roomCode?: string;
  stakeBuyIn?: number;
  targetScore?: number;
  turnTimerSeconds?: number;
  fillEmptySeatsWithBots?: boolean;
  isPrivate?: boolean;
}): any {
  const {
    hostProfile,
    mode,
    stakeBuyIn,
    targetScore,
    turnTimerSeconds,
    fillEmptySeatsWithBots,
    isPrivate,
  } = params;

  const requestedCode = params.roomCode ? normalizeRoomCode(params.roomCode) : '';
  const roomCode =
    requestedCode.length === 6 || requestedCode.length === 4
      ? requestedCode
      : generateRoomCode(6);

  const maxPlayers = mode === 'SOLO_2P' ? 2 : 4;
  const stake = Number(stakeBuyIn) || 1000;
  const target = Number(targetScore) || 1000;
  const timerSeconds = Number(turnTimerSeconds) === 30 ? 30 : 15;
  const fillBots =
    fillEmptySeatsWithBots !== undefined ? Boolean(fillEmptySeatsWithBots) : false;
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const compassLabels = ['SOUTH', 'EAST', 'NORTH', 'WEST'];

  const hostSeat = {
    roomId,
    seat_index: 0,
    seatIndex: 0,
    compass: compassLabels[0],
    profile_id: hostProfile.id,
    profileId: hostProfile.id,
    player_name: hostProfile.displayName || 'Player',
    playerName: hostProfile.displayName || 'Player',
    avatar_id: hostProfile.avatarId || 'sultan',
    avatarId: hostProfile.avatarId || 'sultan',
    team_id: mode === 'SOLO_4P' || mode === 'SOLO_2P' ? null : 'TEAM_A',
    teamId: mode === 'SOLO_4P' || mode === 'SOLO_2P' ? null : 'TEAM_A',
    is_bot: false,
    isBot: false,
    is_ready: true,
    isReady: true,
    is_connected: true,
    isConnected: true,
    cardCount: 0,
    joined_at: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  };

  const emptySeats: any[] = [];
  for (let i = 1; i < maxPlayers; i++) {
    const teamId =
      mode === 'SOLO_4P' || mode === 'SOLO_2P'
        ? null
        : i % 2 === 0
        ? 'TEAM_A'
        : 'TEAM_B';
    emptySeats.push({
      roomId,
      seat_index: i,
      seatIndex: i,
      compass: compassLabels[i % 4],
      profile_id: null,
      profileId: null,
      player_name: `Seat ${i + 1}`,
      playerName: `Seat ${i + 1}`,
      avatar_id: 'sultan',
      avatarId: 'sultan',
      team_id: teamId,
      teamId: teamId,
      is_bot: false,
      isBot: false,
      is_ready: false,
      isReady: false,
      is_connected: false,
      isConnected: false,
      cardCount: 0,
      joined_at: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
    });
  }

  const customRules: CustomRuleToggles = {
    targetScore: target,
    turnTimerSeconds: timerSeconds,
    fillEmptySeatsWithBots: fillBots,
  };

  const fullRoom: any = {
    id: roomId,
    room_code: roomCode,
    roomCode,
    mode,
    stake_buy_in: stake,
    stakeBuyIn: stake,
    target_score: target,
    targetScore: target,
    turn_timer_seconds: timerSeconds,
    turnTimerSeconds: timerSeconds,
    fill_empty_seats_with_bots: fillBots,
    fillEmptySeatsWithBots: fillBots,
    customRules,
    status: 'WAITING',
    host_player_id: hostProfile.id,
    hostPlayerId: hostProfile.id,
    max_players: maxPlayers,
    maxPlayers,
    current_player_count: 1,
    currentPlayerCount: 1,
    pot_total: stake,
    potTotal: stake,
    is_private: !!isPrivate,
    isPrivate: !!isPrivate,
    seqId: 1,
    seats: [hostSeat, ...emptySeats],
    spectators: [] as RoomSpectator[],
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (fillBots) {
    applyBotsToEmptySeats(fullRoom);
  }

  return fullRoom;
}

// 1. Create a Game Room (Private or Public, 6-char alphanumeric or 4-digit compatible)
roomsRouter.post('/create', async (req: Request, res: Response) => {
  const {
    hostProfile,
    mode,
    roomCode: requestedRoomCode,
    stakeBuyIn,
    targetScore,
    turnTimerSeconds,
    fillEmptySeatsWithBots,
    isPrivate,
    sessionToken,
  } = req.body;

  if (!hostProfile || !mode) {
    return res.status(400).json({ error: 'hostProfile and mode are required' });
  }

  const fullRoom = buildRoomObject({
    hostProfile,
    mode,
    roomCode: requestedRoomCode,
    stakeBuyIn,
    targetScore,
    turnTimerSeconds,
    fillEmptySeatsWithBots,
    isPrivate,
  });

  const roomCode = fullRoom.roomCode;

  // 1. Store in decoupled Redis (or fallback memory)
  await RedisState.saveRoom(roomCode, fullRoom);
  memoryRooms[roomCode] = fullRoom;
  saveRoom(fullRoom).catch(() => {});

  // 2. Associate client reconnect session token in Redis
  if (sessionToken) {
    await RedisState.saveClientSession(sessionToken, {
      roomCode,
      seatIndex: 0,
      profileId: hostProfile.id,
      joinedAt: new Date().toISOString(),
    });
  }

  // 3. Try Postgres insertion asynchronously if available
  query(
    `INSERT INTO game_rooms 
      (room_code, mode, stake_buy_in, target_score, status, host_player_id, max_players, current_player_count, pot_total, is_private)
     VALUES ($1, $2, $3, $4, 'WAITING', $5, $6, 1, $7, $8)
     RETURNING *`,
    [
      roomCode,
      mode,
      fullRoom.stakeBuyIn,
      fullRoom.targetScore,
      hostProfile.id,
      fullRoom.maxPlayers,
      fullRoom.stakeBuyIn,
      !!isPrivate,
    ]
  )
    .then(async (roomRes) => {
      if (roomRes?.rows?.[0]) {
        const room = roomRes.rows[0];
        await query(
          `INSERT INTO room_seats 
            (room_id, seat_index, profile_id, player_name, avatar_id, team_id, is_bot, is_ready, is_connected)
           VALUES ($1, 0, $2, $3, $4, 'TEAM_A', false, true, true)`,
          [room.id, hostProfile.id, hostProfile.displayName, hostProfile.avatarId || 'sultan']
        );
      }
    })
    .catch(() => {});

  res.json({ success: true, room: fullRoom });
});

// 2. Look up Room by 6-char alphanumeric or 4-digit code
roomsRouter.get('/:roomCode', async (req: Request, res: Response) => {
  const cleanCode = normalizeRoomCode(req.params.roomCode);
  if (!cleanCode || (cleanCode.length !== 4 && cleanCode.length !== 6)) {
    return res
      .status(400)
      .json({ error: 'Valid 6-character alphanumeric or 4-digit room code required' });
  }

  // 1. Check Redis first (source of truth for decoupled active state)
  const redisRoom = await RedisState.getRoom(cleanCode);
  if (redisRoom) {
    return res.json({ room: redisRoom });
  }

  if (memoryRooms[cleanCode]) {
    return res.json({ room: memoryRooms[cleanCode] });
  }

  // 2. Check Google Cloud Firestore
  try {
    const fsRoom = await getRoomByCode(cleanCode);
    if (fsRoom) {
      await RedisState.saveRoom(cleanCode, fsRoom);
      memoryRooms[cleanCode] = fsRoom;
      return res.json({ room: fsRoom });
    }
  } catch {}

  // 3. Fall back to Postgres if connected
  try {
    const roomRes = await query('SELECT * FROM game_rooms WHERE room_code = $1', [cleanCode]);

    if (roomRes.rows.length === 0) {
      return res.status(404).json({ error: `Room ${cleanCode} not found` });
    }

    const room = roomRes.rows[0];
    const seatsRes = await query(
      'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
      [room.id]
    );

    const fullRoom = {
      ...room,
      roomCode: room.room_code || room.roomCode,
      stakeBuyIn: room.stake_buy_in || room.stakeBuyIn,
      targetScore: room.target_score || room.targetScore,
      turnTimerSeconds: room.turn_timer_seconds || room.turnTimerSeconds || 15,
      fillEmptySeatsWithBots:
        room.fill_empty_seats_with_bots ?? room.fillEmptySeatsWithBots ?? false,
      customRules: {
        targetScore: room.target_score || room.targetScore || 1000,
        turnTimerSeconds: room.turn_timer_seconds || room.turnTimerSeconds || 15,
        fillEmptySeatsWithBots:
          room.fill_empty_seats_with_bots ?? room.fillEmptySeatsWithBots ?? false,
      },
      maxPlayers: room.max_players || room.maxPlayers,
      currentPlayerCount: room.current_player_count || room.currentPlayerCount,
      isPrivate: room.is_private ?? room.isPrivate,
      seqId: room.seq_id || room.seqId || 1,
      spectators: room.spectators || [],
      seats: seatsRes.rows.map((s) => ({
        ...s,
        seatIndex: s.seat_index ?? s.seatIndex,
        profileId: s.profile_id ?? s.profileId,
        playerName: s.player_name ?? s.playerName,
        avatarId: s.avatar_id ?? s.avatarId,
        teamId: s.team_id ?? s.teamId,
        isBot: s.is_bot ?? s.isBot,
        isReady: s.is_ready ?? s.isReady,
        isConnected: s.is_connected ?? s.isConnected,
      })),
    };

    await RedisState.saveRoom(cleanCode, fullRoom);
    memoryRooms[cleanCode] = fullRoom;
    return res.json({ room: fullRoom });
  } catch (_err) {
    return res.status(404).json({ error: `Room ${cleanCode} not found` });
  }
});

// 3. Join Room with Player Profile, Spectator Support & Reconnect Token
roomsRouter.post('/join', async (req: Request, res: Response) => {
  const { roomCode, profile, sessionToken, asSpectator, preferredSeatIndex } = req.body;

  if (!roomCode || !profile) {
    return res.status(400).json({ error: 'roomCode and profile are required' });
  }

  const cleanCode = normalizeRoomCode(roomCode);

  // Retrieve room from Redis / memory
  let room = (await RedisState.getRoom(cleanCode)) || memoryRooms[cleanCode];

  if (!room) {
    try {
      const roomRes = await query('SELECT * FROM game_rooms WHERE room_code = $1', [cleanCode]);
      if (roomRes.rows.length > 0) {
        const dbRoom = roomRes.rows[0];
        const seatsRes = await query(
          'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
          [dbRoom.id]
        );
        room = {
          ...dbRoom,
          roomCode: dbRoom.room_code || dbRoom.roomCode,
          stakeBuyIn: dbRoom.stake_buy_in || dbRoom.stakeBuyIn,
          targetScore: dbRoom.target_score || dbRoom.targetScore,
          turnTimerSeconds: 15,
          fillEmptySeatsWithBots: false,
          customRules: {
            targetScore: dbRoom.target_score || dbRoom.targetScore || 1000,
            turnTimerSeconds: 15,
            fillEmptySeatsWithBots: false,
          },
          maxPlayers: dbRoom.max_players || dbRoom.maxPlayers,
          currentPlayerCount: dbRoom.current_player_count || dbRoom.currentPlayerCount,
          isPrivate: dbRoom.is_private ?? dbRoom.isPrivate,
          seqId: 1,
          spectators: [],
          seats: seatsRes.rows.map((s) => ({
            ...s,
            seatIndex: s.seat_index ?? s.seatIndex,
            profileId: s.profile_id ?? s.profileId,
            playerName: s.player_name ?? s.playerName,
            avatarId: s.avatar_id ?? s.avatarId,
            teamId: s.team_id ?? s.teamId,
            isBot: s.is_bot ?? s.isBot,
            isReady: s.is_ready ?? s.isReady,
            isConnected: s.is_connected ?? s.isConnected,
          })),
        };
      }
    } catch (_err) {}
  }

  if (!room) {
    return res.status(404).json({ error: `Room ${cleanCode} not found` });
  }

  if (!Array.isArray(room.spectators)) {
    room.spectators = [];
  }

  const seats = room.seats || [];

  // Explicit Spectator Join
  if (asSpectator) {
    const existingSpec = room.spectators.find((sp: RoomSpectator) => sp.profileId === profile.id);
    if (!existingSpec) {
      room.spectators.push({
        profileId: profile.id,
        displayName: profile.displayName || 'Spectator',
        avatarId: profile.avatarId || 'sultan',
        joinedAt: new Date().toISOString(),
      });
    }
    room.seqId = (room.seqId || 1) + 1;
    await RedisState.saveRoom(cleanCode, room);
    memoryRooms[cleanCode] = room;
    return res.json({ success: true, room, role: 'SPECTATOR', seatIndex: null });
  }

  let existingSeat = seats.find((s: any) => (s.profileId || s.profile_id) === profile.id);

  if (existingSeat) {
    // Rejoining already occupied seat
    existingSeat.isConnected = true;
    existingSeat.is_connected = true;
    existingSeat.isReady = true;
    existingSeat.is_ready = true;
  } else {
    // Find preferred seat or next open seat (can replace a bot placeholder in WAITING room)
    let openSeat: any = null;
    if (
      typeof preferredSeatIndex === 'number' &&
      seats[preferredSeatIndex] &&
      (!seats[preferredSeatIndex].profileId || seats[preferredSeatIndex].isBot)
    ) {
      openSeat = seats[preferredSeatIndex];
    } else {
      openSeat =
        seats.find((s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot) ||
        seats.find((s: any) => s.isBot || s.is_bot);
    }

    if (!openSeat) {
      // Room seats are full: place player in spectator list automatically
      const existingSpec = room.spectators.find((sp: RoomSpectator) => sp.profileId === profile.id);
      if (!existingSpec) {
        room.spectators.push({
          profileId: profile.id,
          displayName: profile.displayName || 'Spectator',
          avatarId: profile.avatarId || 'sultan',
          joinedAt: new Date().toISOString(),
        });
      }
      room.seqId = (room.seqId || 1) + 1;
      await RedisState.saveRoom(cleanCode, room);
      memoryRooms[cleanCode] = room;
      return res.json({
        success: true,
        room,
        role: 'SPECTATOR',
        seatIndex: null,
      });
    }

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
    openSeat.joined_at = new Date().toISOString();

    existingSeat = openSeat;
    room.currentPlayerCount = seats.filter(
      (s: any) => (s.isConnected || s.is_connected) && !s.isBot && !s.is_bot
    ).length;
    room.current_player_count = room.currentPlayerCount;
  }

  room.seqId = (room.seqId || 1) + 1;

  // Persist updated room in Redis and Firestore
  await RedisState.saveRoom(cleanCode, room);
  memoryRooms[cleanCode] = room;
  saveRoom(room).catch(() => {});

  // Persist client session token in Redis for seamless deployment reconnections
  if (sessionToken && existingSeat) {
    await RedisState.saveClientSession(sessionToken, {
      roomCode: cleanCode,
      seatIndex: existingSeat.seatIndex ?? existingSeat.seat_index,
      profileId: profile.id,
      joinedAt: new Date().toISOString(),
    });
  }

  return res.json({
    success: true,
    room,
    role: 'PLAYER',
    seatIndex: existingSeat.seatIndex ?? existingSeat.seat_index,
  });
});

// 4. Update Custom Rule Toggles (targetScore, turnTimerSeconds, fillEmptySeatsWithBots)
roomsRouter.post('/:roomCode/rules', async (req: Request, res: Response) => {
  const cleanCode = normalizeRoomCode(req.params.roomCode);
  const { targetScore, turnTimerSeconds, fillEmptySeatsWithBots } = req.body;

  const room = (await RedisState.getRoom(cleanCode)) || memoryRooms[cleanCode];
  if (!room) {
    return res.status(404).json({ error: `Room ${cleanCode} not found` });
  }

  if (targetScore !== undefined) {
    room.targetScore = Number(targetScore);
    room.target_score = Number(targetScore);
  }
  if (turnTimerSeconds !== undefined) {
    room.turnTimerSeconds = Number(turnTimerSeconds);
    room.turn_timer_seconds = Number(turnTimerSeconds);
  }
  if (fillEmptySeatsWithBots !== undefined) {
    room.fillEmptySeatsWithBots = Boolean(fillEmptySeatsWithBots);
    room.fill_empty_seats_with_bots = Boolean(fillEmptySeatsWithBots);
    applyBotsToEmptySeats(room);
  }

  room.customRules = {
    targetScore: room.targetScore ?? 1000,
    turnTimerSeconds: room.turnTimerSeconds ?? 15,
    fillEmptySeatsWithBots: Boolean(room.fillEmptySeatsWithBots),
  };
  room.seqId = (room.seqId || 1) + 1;
  room.updatedAt = new Date().toISOString();

  await RedisState.saveRoom(cleanCode, room);
  memoryRooms[cleanCode] = room;
  saveRoom(room).catch(() => {});

  return res.json({ success: true, room });
});

// 5. Session Reconnect Endpoint (Restores seat after server deploy / network drop)
roomsRouter.post('/reconnect', async (req: Request, res: Response) => {
  const { sessionToken } = req.body;

  if (!sessionToken) {
    return res.status(400).json({ error: 'sessionToken is required' });
  }

  const session = await RedisState.getClientSession(sessionToken);
  if (!session) {
    return res.status(404).json({ error: 'Session expired or not found' });
  }

  const room =
    (await RedisState.getRoom(session.roomCode)) || memoryRooms[session.roomCode];
  if (!room) {
    return res.status(404).json({ error: 'Room has expired or concluded' });
  }

  // Mark seat as reconnected
  const seat = room.seats?.[session.seatIndex];
  if (seat) {
    seat.isConnected = true;
    seat.is_connected = true;
    await RedisState.saveRoom(session.roomCode, room);
    memoryRooms[session.roomCode] = room;
  }

  return res.json({
    success: true,
    room,
    seatIndex: session.seatIndex,
    reconnected: true,
  });
});

// 6. Public Matchmaking Queue
roomsRouter.post('/queue', async (req: Request, res: Response) => {
  const {
    profile,
    mode,
    stakeBuyIn,
    targetScore,
    turnTimerSeconds,
    fillEmptySeatsWithBots,
    sessionToken,
  } = req.body;
  if (!profile || !mode) {
    return res.status(400).json({ error: 'profile and mode are required' });
  }

  const stake = Number(stakeBuyIn) || 1000;
  const maxPlayers = mode === 'SOLO_2P' ? 2 : 4;

  // Check Redis for any waiting public room with matching mode & stake
  const queueKey = `thaasbai:queue:${mode}:${stake}`;
  const waitingRoomCode = await RedisState.get<string>(queueKey);

  if (waitingRoomCode) {
    const existingRoom =
      (await RedisState.getRoom(waitingRoomCode)) || memoryRooms[waitingRoomCode];
    if (existingRoom && existingRoom.status === 'WAITING') {
      const seats = existingRoom.seats || [];
      const alreadyIn = seats.find((s: any) => (s.profileId || s.profile_id) === profile.id);
      if (alreadyIn) {
        return res.json({ success: true, room: existingRoom, seatIndex: alreadyIn.seatIndex });
      }

      const openSeat = seats.find(
        (s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot
      );
      if (openSeat) {
        openSeat.profileId = profile.id;
        openSeat.profile_id = profile.id;
        openSeat.playerName = profile.displayName;
        openSeat.player_name = profile.displayName;
        openSeat.avatarId = profile.avatarId || 'sultan';
        openSeat.avatar_id = profile.avatarId || 'sultan';
        openSeat.isReady = true;
        openSeat.is_ready = true;
        openSeat.isConnected = true;
        openSeat.is_connected = true;
        openSeat.joinedAt = new Date().toISOString();

        existingRoom.currentPlayerCount = seats.filter(
          (s: any) => s.isConnected || s.is_connected
        ).length;
        existingRoom.current_player_count = existingRoom.currentPlayerCount;
        existingRoom.seqId = (existingRoom.seqId || 1) + 1;

        if (existingRoom.currentPlayerCount >= maxPlayers) {
          existingRoom.status = 'STARTING';
          await RedisState.del(queueKey);
        }

        await RedisState.saveRoom(waitingRoomCode, existingRoom);
        memoryRooms[waitingRoomCode] = existingRoom;
        if (sessionToken) {
          await RedisState.saveClientSession(sessionToken, {
            roomCode: waitingRoomCode,
            seatIndex: openSeat.seatIndex,
            profileId: profile.id,
            joinedAt: new Date().toISOString(),
          });
        }

        return res.json({ success: true, room: existingRoom, seatIndex: openSeat.seatIndex });
      }
    }
  }

  // No waiting room available: create a new public room with a 6-character code
  const newRoom = buildRoomObject({
    hostProfile: profile,
    mode,
    stakeBuyIn: stake,
    targetScore,
    turnTimerSeconds,
    fillEmptySeatsWithBots,
    isPrivate: false,
  });

  await RedisState.saveRoom(newRoom.roomCode, newRoom);
  memoryRooms[newRoom.roomCode] = newRoom;
  await RedisState.set(queueKey, newRoom.roomCode, 300);

  if (sessionToken) {
    await RedisState.saveClientSession(sessionToken, {
      roomCode: newRoom.roomCode,
      seatIndex: 0,
      profileId: profile.id,
      joinedAt: new Date().toISOString(),
    });
  }

  return res.json({ success: true, room: newRoom, seatIndex: 0 });
});
