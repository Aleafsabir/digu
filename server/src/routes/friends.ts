import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { activeClients } from '../ws/socketHandler.js';
import { WebSocket } from 'ws';

export const friendsRouter = Router();

// 1. Fetch Friends with Live Presence
friendsRouter.get('/', async (req: Request, res: Response) => {
  const { profileId } = req.query;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
    const result = await query(
      `SELECT 
        f.id AS friendship_id,
        f.created_at AS friends_since,
        p.id AS friend_id,
        p.display_name,
        p.avatar_id,
        p.level,
        p.friend_code,
        p.presence_status,
        p.current_match_info,
        p.last_active_at
      FROM friendships f
      JOIN profiles p ON p.id = (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END)
      WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'ACCEPTED'
      ORDER BY 
        CASE WHEN p.presence_status = 'IN_LOBBY' THEN 1
             WHEN p.presence_status = 'IN_MATCH' THEN 2
             ELSE 3 END,
        p.last_active_at DESC`,
      [profileId]
    );

    res.json({ friends: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch Pending Friend Requests
friendsRouter.get('/requests', async (req: Request, res: Response) => {
  const { profileId } = req.query;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
    // Incoming requests sent to this user
    const incomingRes = await query(
      `SELECT 
        f.id AS request_id,
        f.created_at,
        p.id AS sender_id,
        p.display_name,
        p.avatar_id,
        p.level,
        p.friend_code
      FROM friendships f
      JOIN profiles p ON p.id = f.sender_id
      WHERE f.friend_id = $1 AND f.status = 'PENDING'
      ORDER BY f.created_at DESC`,
      [profileId]
    );

    // Outgoing requests sent by this user
    const outgoingRes = await query(
      `SELECT 
        f.id AS request_id,
        f.created_at,
        p.id AS receiver_id,
        p.display_name,
        p.avatar_id,
        p.level,
        p.friend_code
      FROM friendships f
      JOIN profiles p ON p.id = f.friend_id
      WHERE f.user_id = $1 AND f.status = 'PENDING'
      ORDER BY f.created_at DESC`,
      [profileId]
    );

    res.json({
      incoming: incomingRes.rows,
      outgoing: outgoingRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Send Friend Request via Friend Code
friendsRouter.post('/request', async (req: Request, res: Response) => {
  const { profileId, friendCode } = req.body;
  if (!profileId || !friendCode) {
    return res.status(400).json({ error: 'profileId and friendCode are required' });
  }

  const cleanCode = friendCode.trim().toUpperCase();

  try {
    // 1. Locate target profile by friend_code
    const targetRes = await query(
      'SELECT id, display_name, avatar_id, level FROM profiles WHERE UPPER(friend_code) = $1',
      [cleanCode]
    );

    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: `Player with code ${cleanCode} not found` });
    }

    const targetUser = targetRes.rows[0];

    // Cannot add self
    if (targetUser.id === profileId) {
      return res.status(400).json({ error: 'You cannot add your own Friend Code' });
    }

    // 2. Check if friendship or request already exists
    const existingRes = await query(
      `SELECT id, status, sender_id 
       FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [profileId, targetUser.id]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'You are already friends with this player' });
      }
      if (existing.status === 'PENDING') {
        return res.status(400).json({ error: 'A friend request is already pending between you two' });
      }
    }

    // 3. Insert friendship request
    const insertRes = await query(
      `INSERT INTO friendships (user_id, friend_id, sender_id, status)
       VALUES ($1, $2, $1, 'PENDING')
       RETURNING id, created_at`,
      [profileId, targetUser.id]
    );

    // 4. Notify recipient if online
    const recipientSocket = activeClients.get(targetUser.id);
    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
      recipientSocket.send(
        JSON.stringify({
          type: 'FRIEND_REQUEST_RECEIVED',
          payload: {
            requestId: insertRes.rows[0].id,
            senderId: profileId,
          },
        })
      );
    }

    res.json({
      success: true,
      message: `Friend request sent to ${targetUser.display_name}!`,
      target: targetUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Respond to Friend Request (Accept or Decline)
friendsRouter.post('/respond', async (req: Request, res: Response) => {
  const { requestId, accept, profileId } = req.body;
  if (!requestId || accept === undefined) {
    return res.status(400).json({ error: 'requestId and accept are required' });
  }

  try {
    const status = accept ? 'ACCEPTED' : 'DECLINED';
    const updateRes = await query(
      `UPDATE friendships 
       SET status = $1, updated_at = now()
       WHERE id = $2 AND (friend_id = $3 OR user_id = $3)
       RETURNING *`,
      [status, requestId, profileId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found or not authorized' });
    }

    const friendship = updateRes.rows[0];
    const otherUserId = friendship.user_id === profileId ? friendship.friend_id : friendship.user_id;

    // Notify the other user if online
    const otherSocket = activeClients.get(otherUserId);
    if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
      otherSocket.send(
        JSON.stringify({
          type: 'FRIEND_REQUEST_RESOLVED',
          payload: {
            requestId,
            accepted: accept,
            friendId: profileId,
          },
        })
      );
    }

    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Remove Friend
friendsRouter.delete('/:friendId', async (req: Request, res: Response) => {
  const { friendId } = req.params;
  const { profileId } = req.body;

  if (!profileId || !friendId) {
    return res.status(400).json({ error: 'profileId and friendId are required' });
  }

  try {
    await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [profileId, friendId]
    );
    res.json({ success: true, message: 'Friend removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
