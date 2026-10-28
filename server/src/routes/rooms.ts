import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { RedisState } from '../redis.js';
import { saveRoom, getRoomByCode } from '../firestore.js';

export const roomsRouter = Router();

// In-memory fallback cache so room operations stay functional even without Postgres/Redis
const memoryRooms: Record<string, any> = {};

// Helper: Normalize 4-digit room code
function normalizeRoomCode(input: string): string {
  if (!input) return '';
  const digits = input.trim().replace(/[^0-9]/g, '');
  return digits.length >= 4 ? digits.substring(0, 4) : digits;
}

// 1. Create a Game Room (Private or Public)
roomsRouter.post('/create', async (req: Request, res: Response) => {
  const { hostProfile, mode, stakeBuyIn, targetScore, isPrivate, sessionToken } = req.body;

  if (!hostProfile || !mode) {
    return res.status(400).json({ error: 'hostProfile and mode are required' });
  }

  // Clean 4-Digit Numeric Room Code (1000 - 9999)
  const roomCode = String(Math.floor(1000 + Math.random() * 9000));
  const maxPlayers = mode === 'SOLO_2P' ? 2 : 4;
  const stake = Number(stakeBuyIn) || 1000;
  const target = Number(targetScore) || 1000;
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const hostSeat = {
    roomId,
    seat_index: 0,
    seatIndex: 0,
    profile_id: hostProfile.id,
    profileId: hostProfile.id,
    player_name: hostProfile.displayName,
    playerName: hostProfile.displayName,
    avatar_id: hostProfile.avatarId || 'sultan',
    avatarId: hostProfile.avatarId || 'sultan',
    team_id: mode === 'TEAM_4P' ? 'TEAM_A' : null,
    teamId: mode === 'TEAM_4P' ? 'TEAM_A' : null,
    is_bot: false,
    isBot: false,
    is_ready: true,
    isReady: true,
    is_connected: true,
    isConnected: true,
    joined_at: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  };

  const emptySeats: any[] = [];
  for (let i = 1; i < maxPlayers; i++) {
    const teamId = mode === 'TEAM_4P' ? (i % 2 === 0 ? 'TEAM_A' : 'TEAM_B') : null;
    emptySeats.push({
      roomId,
      seat_index: i,
      seatIndex: i,
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
      joined_at: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
    });
  }

  const fullRoom = {
    id: roomId,
    room_code: roomCode,
    roomCode,
    mode,
    stake_buy_in: stake,
    stakeBuyIn: stake,
    target_score: target,
    targetScore: target,
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
    seats: [hostSeat, ...emptySeats],
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
    [roomCode, mode, stake, target, hostProfile.id, maxPlayers, stake, !!isPrivate]
  ).then(async (roomRes) => {
    if (roomRes?.rows?.[0]) {
      const room = roomRes.rows[0];
      await query(
        `INSERT INTO room_seats 
          (room_id, seat_index, profile_id, player_name, avatar_id, team_id, is_bot, is_ready, is_connected)
         VALUES ($1, 0, $2, $3, $4, 'TEAM_A', false, true, true)`,
        [room.id, hostProfile.id, hostProfile.displayName, hostProfile.avatarId || 'sultan']
      );
    }
  }).catch(() => {});

  res.json({ success: true, room: fullRoom });
});

// 2. Look up Room by 4-digit code
roomsRouter.get('/:roomCode', async (req: Request, res: Response) => {
  const cleanCode = normalizeRoomCode(req.params.roomCode);
  if (!cleanCode) {
    return res.status(400).json({ error: 'Valid 4-digit room code required' });
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
    const roomRes = await query(
      'SELECT * FROM game_rooms WHERE room_code = $1',
      [cleanCode]
    );

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
      maxPlayers: room.max_players || room.maxPlayers,
      currentPlayerCount: room.current_player_count || room.currentPlayerCount,
      isPrivate: room.is_private ?? room.isPrivate,
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

// 3. Join Room with Player Profile & Reconnect Token
roomsRouter.post('/join', async (req: Request, res: Response) => {
  const { roomCode, profile, sessionToken } = req.body;

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
          maxPlayers: dbRoom.max_players || dbRoom.maxPlayers,
          currentPlayerCount: dbRoom.current_player_count || dbRoom.currentPlayerCount,
          isPrivate: dbRoom.is_private ?? dbRoom.isPrivate,
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

  const seats = room.seats || [];
  let existingSeat = seats.find((s: any) => (s.profileId || s.profile_id) === profile.id);

  if (existingSeat) {
    // Rejoining already occupied seat
    existingSeat.isConnected = true;
    existingSeat.is_connected = true;
    existingSeat.isReady = true;
  } else {
    // Find next open human seat
    const openSeat = seats.find(
      (s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot
    );
    if (!openSeat) {
      return res.status(400).json({ error: 'Room is already full' });
    }

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

    existingSeat = openSeat;
    room.currentPlayerCount = seats.filter((s: any) => s.isConnected || s.is_connected).length;
    room.current_player_count = room.currentPlayerCount;
  }

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

  return res.json({ success: true, room });
});

// 4. Session Reconnect Endpoint (Restores seat after server deploy / network drop)
roomsRouter.post('/reconnect', async (req: Request, res: Response) => {
  const { sessionToken, profileId } = req.body;

  if (!sessionToken) {
    return res.status(400).json({ error: 'sessionToken is required' });
  }

  const session = await RedisState.getClientSession(sessionToken);
  if (!session) {
    return res.status(404).json({ error: 'Session expired or not found' });
  }

  const room = await RedisState.getRoom(session.roomCode);
  if (!room) {
    return res.status(404).json({ error: 'Room has expired or concluded' });
  }

  // Mark seat as reconnected
  const seat = room.seats?.[session.seatIndex];
  if (seat) {
    seat.isConnected = true;
    seat.is_connected = true;
    await RedisState.saveRoom(session.roomCode, room);
  }

  return res.json({
    success: true,
    room,
    seatIndex: session.seatIndex,
    reconnected: true,
  });
});

// 5. Public Matchmaking Queue (Pairs Real Players Only, ZERO Bots)
roomsRouter.post('/queue', async (req: Request, res: Response) => {
  const { profile, mode, stakeBuyIn, targetScore, sessionToken } = req.body;
  if (!profile || !mode) {
    return res.status(400).json({ error: 'profile and mode are required' });
  }

  const stake = Number(stakeBuyIn) || 1000;
  const target = Number(targetScore) || 1000;
  const maxPlayers = mode === 'SOLO_2P' ? 2 : 4;

  // Check Redis for any waiting public room with matching mode & stake
  const queueKey = `thaasbai:queue:${mode}:${stake}`;
  const waitingRoomCode = await RedisState.get<string>(queueKey);

  if (waitingRoomCode) {
    const existingRoom = await RedisState.getRoom(waitingRoomCode);
    if (existingRoom && existingRoom.status === 'WAITING') {
      const seats = existingRoom.seats || [];
      const alreadyIn = seats.find((s: any) => (s.profileId || s.profile_id) === profile.id);
      if (alreadyIn) {
        return res.json({ success: true, room: existingRoom, seatIndex: alreadyIn.seatIndex });
      }

      const openSeat = seats.find((s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot);
      if (openSeat) {
        openSeat.profileId = profile.id;
        openSeat.profile_id = profile.id;
        openSeat.playerName = profile.displayName;
        openSeat.player_name = profile.displayName;
        openSeat.avatarId = profile.avatarId || 'sultan';
        openSeat.avatar_id = profile.avatarId || 'sultan';
        openSeat.isReady = true;
        openSeat.isConnected = true;
        openSeat.joinedAt = new Date().toISOString();

        existingRoom.currentPlayerCount = seats.filter((s: any) => s.isConnected || s.is_connected).length;
        existingRoom.current_player_count = existingRoom.currentPlayerCount;

        if (existingRoom.currentPlayerCount >= maxPlayers) {
          existingRoom.status = 'STARTING';
          await RedisState.del(queueKey); // Remove full room from queue
        }

        await RedisState.saveRoom(waitingRoomCode, existingRoom);
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

  // No waiting room available: create a new public room and put its code in the queue
  const roomCode = String(Math.floor(1000 + Math.random() * 9000));
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const hostSeat = {
    roomId,
    seatIndex: 0,
    seat_index: 0,
    profileId: profile.id,
    profile_id: profile.id,
    playerName: profile.displayName,
    player_name: profile.displayName,
    avatarId: profile.avatarId || 'sultan',
    avatar_id: profile.avatarId || 'sultan',
    teamId: mode === 'TEAM_4P' ? 'TEAM_A' : null,
    team_id: mode === 'TEAM_4P' ? 'TEAM_A' : null,
    isBot: false,
    is_bot: false,
    isReady: true,
    is_ready: true,
    isConnected: true,
    is_connected: true,
    joinedAt: new Date().toISOString(),
    joined_at: new Date().toISOString(),
  };

  const emptySeats: any[] = [];
  for (let i = 1; i < maxPlayers; i++) {
    const teamId = mode === 'TEAM_4P' ? (i % 2 === 0 ? 'TEAM_A' : 'TEAM_B') : null;
    emptySeats.push({
      roomId,
      seatIndex: i,
      seat_index: i,
      profileId: null,
      profile_id: null,
      playerName: `Seat ${i + 1}`,
      player_name: `Seat ${i + 1}`,
      avatarId: 'sultan',
      avatar_id: 'sultan',
      teamId,
      team_id: teamId,
      isBot: false,
      is_bot: false,
      isReady: false,
      is_ready: false,
      isConnected: false,
      is_connected: false,
      joinedAt: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    });
  }

  const newRoom = {
    id: roomId,
    roomCode,
    room_code: roomCode,
    mode,
    stakeBuyIn: stake,
    stake_buy_in: stake,
    targetScore: target,
    target_score: target,
    status: 'WAITING',
    hostPlayerId: profile.id,
    host_player_id: profile.id,
    maxPlayers,
    max_players: maxPlayers,
    currentPlayerCount: 1,
    current_player_count: 1,
    potTotal: stake,
    pot_total: stake,
    isPrivate: false,
    is_private: false,
    seats: [hostSeat, ...emptySeats],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await RedisState.saveRoom(roomCode, newRoom);
  await RedisState.set(queueKey, roomCode, 300); // 5-minute queue expiration
  if (sessionToken) {
    await RedisState.saveClientSession(sessionToken, {
      roomCode,
      seatIndex: 0,
      profileId: profile.id,
      joinedAt: new Date().toISOString(),
    });
  }

  return res.json({ success: true, room: newRoom, seatIndex: 0 });
});
