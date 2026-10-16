import { Router, Request, Response } from 'express';
import { query } from '../db.js';

export const roomsRouter = Router();

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

  try {
    // 1. Insert game room
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

    res.json({
      room: {
        ...room,
        seats: seatsRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      return res.status(404).json({ error: `Room ${cleanCode} not found` });
    }

    const room = roomRes.rows[0];
    const seatsRes = await query(
      'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
      [room.id]
    );

    res.json({
      room: {
        ...room,
        seats: seatsRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fill Seat with a Bot
roomsRouter.post('/seat/bot', async (req: Request, res: Response) => {
  const { roomId, seatIndex } = req.body;

  const botNames = ['Hassan Bot', 'Aishath Bot', 'Ibrahim Bot', 'Mariyam Bot'];
  const botAvatars = ['dheveli', 'fisher', 'raivaru', 'queen'];
  const botName = botNames[seatIndex % botNames.length];
  const botAvatar = botAvatars[seatIndex % botAvatars.length];

  try {
    await query(
      `UPDATE room_seats 
       SET player_name = $1, avatar_id = $2, is_bot = true, is_ready = true, is_connected = true 
       WHERE room_id = $3 AND seat_index = $4`,
      [botName, botAvatar, roomId, seatIndex]
    );

    // Fetch updated seats
    const seatsRes = await query(
      'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC',
      [roomId]
    );

    res.json({ success: true, seats: seatsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
