import { Router, Request, Response } from 'express';
import { query } from '../db.js';

export const roomsRouter = Router();

// In-memory fallback cache so room operations stay functional even if PostgreSQL is momentarily offline
const memoryRooms: Record<string, any> = {};

// 1. Create a Game Room (Private or Public)
roomsRouter.post('/create', async (req: Request, res: Response) => {
  const { hostProfile, mode, stakeBuyIn, targetScore, isPrivate } = req.body;

  if (!hostProfile || !mode) {
    return res.status(400).json({ error: 'hostProfile and mode are required' });
  }

  const roomCode = `THAAS-${Math.floor(1000 + Math.random() * 9000)}`;
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

  const fallbackRoom = {
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

  memoryRooms[roomCode] = fallbackRoom;

  try {
    // 1. Insert game room into PostgreSQL if available
    const roomRes = await query(
      `INSERT INTO game_rooms 
        (room_code, mode, stake_buy_in, target_score, status, host_player_id, max_players, current_player_count, pot_total, is_private)
       VALUES ($1, $2, $3, $4, 'WAITING', $5, $6, 1, $7, $8)
       RETURNING *`,
      [roomCode, mode, stake, target, hostProfile.id, maxPlayers, stake, !!isPrivate]
    );

    const room = roomRes.rows[0];

    // 2. Insert Host Seat (Seat 0)
    await query(
      `INSERT INTO room_seats 
        (room_id, seat_index, profile_id, player_name, avatar_id, team_id, is_bot, is_ready, is_connected)
       VALUES ($1, 0, $2, $3, $4, 'TEAM_A', false, true, true)`,
      [room.id, hostProfile.id, hostProfile.displayName, hostProfile.avatarId || 'sultan']
    );

    // 3. Insert Empty Seats
    for (let i = 1; i < maxPlayers; i++) {
      const teamId = mode === 'TEAM_4P' ? (i % 2 === 0 ? 'TEAM_A' : 'TEAM_B') : undefined;
      await query(
        `INSERT INTO room_seats 
          (room_id, seat_index, profile_id, player_name, avatar_id, team_id, is_bot, is_ready, is_connected)
         VALUES ($1, $2, NULL, 'Open Seat', 'sultan', $3, false, false, false)`,
        [room.id, i, teamId]
      );
    }

    // 4. Fetch all seats
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
      seats: seatsRes.rows.map(s => ({
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

    memoryRooms[roomCode] = fullRoom;
    res.json({ room: fullRoom });
  } catch (_err) {
    // Graceful fallback to memory room
    res.json({ room: fallbackRoom });
  }
});

// 2. Get Room by Code
roomsRouter.get('/:roomCode', async (req: Request, res: Response) => {
  const { roomCode } = req.params;
  const cleanCode = roomCode.trim().toUpperCase();

  try {
    const roomRes = await query(
      'SELECT * FROM game_rooms WHERE UPPER(room_code) = $1',
      [cleanCode]
    );

    if (roomRes.rows.length === 0) {
      if (memoryRooms[cleanCode]) {
        return res.json({ room: memoryRooms[cleanCode] });
      }
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
      seats: seatsRes.rows.map(s => ({
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

    memoryRooms[cleanCode] = fullRoom;
    res.json({ room: fullRoom });
  } catch (_err) {
    if (memoryRooms[cleanCode]) {
      return res.json({ room: memoryRooms[cleanCode] });
    }
    res.status(404).json({ error: `Room ${cleanCode} not found` });
  }
});

// 3. Join Room with Player Profile
roomsRouter.post('/join', async (req: Request, res: Response) => {
  const { roomCode, profile } = req.body;

  if (!roomCode || !profile) {
    return res.status(400).json({ error: 'roomCode and profile are required' });
  }

  const cleanCode = roomCode.trim().toUpperCase();

  // Find room in memory or database
  let room = memoryRooms[cleanCode];

  try {
    const roomRes = await query(
      'SELECT * FROM game_rooms WHERE UPPER(room_code) = $1',
      [cleanCode]
    );

    if (roomRes.rows.length > 0) {
      const dbRoom = roomRes.rows[0];
      const seatsRes = await query(
        'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
        [dbRoom.id]
      );

      // Check if player is already seated
      let existingSeat = seatsRes.rows.find(
        s => (s.profile_id || s.profileId) === profile.id
      );

      if (!existingSeat) {
        // Find next empty seat
        const openSeat = seatsRes.rows.find(
          s => !s.profile_id && !s.profileId && !s.is_bot && !s.isBot
        );

        if (!openSeat) {
          return res.status(400).json({ error: 'Room is already full' });
        }

        // Assign seat to player
        await query(
          `UPDATE room_seats 
           SET profile_id = $1, player_name = $2, avatar_id = $3, is_ready = true, is_connected = true 
           WHERE room_id = $4 AND seat_index = $5`,
          [profile.id, profile.displayName, profile.avatarId || 'sultan', dbRoom.id, openSeat.seat_index]
        );

        await query(
          `UPDATE game_rooms 
           SET current_player_count = current_player_count + 1 
           WHERE id = $1`,
          [dbRoom.id]
        );
      }

      // Re-fetch all seats
      const updatedSeats = await query(
        'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
        [dbRoom.id]
      );

      const fullRoom = {
        ...dbRoom,
        roomCode: dbRoom.room_code || dbRoom.roomCode,
        stakeBuyIn: dbRoom.stake_buy_in || dbRoom.stakeBuyIn,
        targetScore: dbRoom.target_score || dbRoom.targetScore,
        maxPlayers: dbRoom.max_players || dbRoom.maxPlayers,
        currentPlayerCount: updatedSeats.rows.filter(s => s.is_connected).length,
        seats: updatedSeats.rows.map(s => ({
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

      memoryRooms[cleanCode] = fullRoom;
      return res.json({ success: true, room: fullRoom });
    }
  } catch (_err) {
    // Fall back to memory room handling
  }

  if (!room) {
    return res.status(404).json({ error: `Room ${cleanCode} not found` });
  }

  // Update memory room
  const seats = room.seats || [];
  let seat = seats.find((s: any) => (s.profileId || s.profile_id) === profile.id);

  if (!seat) {
    const openSeat = seats.find((s: any) => !s.profileId && !s.profile_id && !s.isBot && !s.is_bot);
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
    room.currentPlayerCount = seats.filter((s: any) => s.isConnected || s.is_connected).length;
    room.current_player_count = room.currentPlayerCount;
  }

  res.json({ success: true, room });
});

// 4. Fill Seat with a Bot
roomsRouter.post('/seat/bot', async (req: Request, res: Response) => {
  const { roomId, roomCode, seatIndex } = req.body;

  const botNames = ['Hassan Bot', 'Aishath Bot', 'Ibrahim Bot', 'Mariyam Bot'];
  const botAvatars = ['dheveli', 'fisher', 'raivaru', 'queen'];
  const botName = botNames[seatIndex % botNames.length];
  const botAvatar = botAvatars[seatIndex % botAvatars.length];

  // Update in memory
  if (roomCode && memoryRooms[roomCode]) {
    const memRoom = memoryRooms[roomCode];
    if (memRoom.seats && memRoom.seats[seatIndex]) {
      const seat = memRoom.seats[seatIndex];
      seat.playerName = botName;
      seat.player_name = botName;
      seat.avatarId = botAvatar;
      seat.avatar_id = botAvatar;
      seat.isBot = true;
      seat.is_bot = true;
      seat.isReady = true;
      seat.is_ready = true;
      seat.isConnected = true;
      seat.is_connected = true;
    }
  }

  try {
    await query(
      `UPDATE room_seats 
       SET player_name = $1, avatar_id = $2, is_bot = true, is_ready = true, is_connected = true 
       WHERE room_id = $3 AND seat_index = $4`,
      [botName, botAvatar, roomId, seatIndex]
    );

    const seatsRes = await query(
      'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
      [roomId]
    );

    res.json({ success: true, seats: seatsRes.rows });
  } catch (_err) {
    if (roomCode && memoryRooms[roomCode]) {
      return res.json({ success: true, seats: memoryRooms[roomCode].seats });
    }
    res.json({ success: true });
  }
});
