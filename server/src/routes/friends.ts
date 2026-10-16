import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { activeClients, inMemoryProfiles, inMemoryFriendships, MemoryFriendship } from '../ws/socketHandler.js';
import { WebSocket } from 'ws';

export const friendsRouter = Router();

// 1. Fetch Friends with Live Presence
friendsRouter.get('/', async (req: Request, res: Response) => {
  const { profileId } = req.query as { profileId: string };
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

    if (result && result.rows && result.rows.length > 0) {
      return res.json({ friends: result.rows });
    }
  } catch {}

  // Fallback to in-memory store
  const userFriendships = inMemoryFriendships.filter(
    f => (f.user_id === profileId || f.friend_id === profileId) && f.status === 'ACCEPTED'
  );

  const friends = userFriendships.map(f => {
    const otherId = f.user_id === profileId ? f.friend_id : f.user_id;
    const p = inMemoryProfiles.get(otherId) || {
      id: otherId,
      display_name: 'Player',
      avatar_id: 'boduthakurufaanu',
      friend_code: `DIGU-${otherId.substring(0, 4).toUpperCase()}`,
      level: 1,
      presence_status: activeClients.has(otherId) ? 'IN_LOBBY' : 'OFFLINE',
      last_active_at: new Date().toISOString(),
    };
    return {
      friendship_id: f.id,
      friends_since: f.created_at,
      friend_id: p.id,
      display_name: p.display_name,
      avatar_id: p.avatar_id,
      level: p.level,
      friend_code: p.friend_code,
      presence_status: activeClients.has(p.id) ? 'IN_LOBBY' : p.presence_status,
      current_match_info: p.current_match_info,
      last_active_at: p.last_active_at,
    };
  });

  return res.json({ friends });
});

// 2. Fetch Pending Friend Requests
friendsRouter.get('/requests', async (req: Request, res: Response) => {
  const { profileId } = req.query as { profileId: string };
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
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

    if (incomingRes && outgoingRes) {
      return res.json({
        incoming: incomingRes.rows,
        outgoing: outgoingRes.rows,
      });
    }
  } catch {}

  // Fallback to in-memory store
  const incoming = inMemoryFriendships
    .filter(f => f.friend_id === profileId && f.status === 'PENDING')
    .map(f => {
      const p = inMemoryProfiles.get(f.sender_id);
      return {
        request_id: f.id,
        created_at: f.created_at,
        sender_id: f.sender_id,
        display_name: p?.display_name || 'Player',
        avatar_id: p?.avatar_id || 'boduthakurufaanu',
        level: p?.level || 1,
        friend_code: p?.friend_code || '',
      };
    });

  const outgoing = inMemoryFriendships
    .filter(f => f.user_id === profileId && f.status === 'PENDING')
    .map(f => {
      const p = inMemoryProfiles.get(f.friend_id);
      return {
        request_id: f.id,
        created_at: f.created_at,
        receiver_id: f.friend_id,
        display_name: p?.display_name || 'Player',
        avatar_id: p?.avatar_id || 'boduthakurufaanu',
        level: p?.level || 1,
        friend_code: p?.friend_code || '',
      };
    });

  return res.json({ incoming, outgoing });
});

// 3. Send Friend Request via Friend Code
friendsRouter.post('/request', async (req: Request, res: Response) => {
  const { profileId, friendCode } = req.body;
  if (!profileId || !friendCode) {
    return res.status(400).json({ error: 'profileId and friendCode are required' });
  }

  const cleanCode = friendCode.trim().toUpperCase();

  let targetUser: any = null;

  try {
    const targetRes = await query(
      'SELECT id, display_name, avatar_id, level, friend_code FROM profiles WHERE UPPER(friend_code) = $1',
      [cleanCode]
    );
    if (targetRes?.rows?.length > 0) {
      targetUser = targetRes.rows[0];
    }
  } catch {}

  if (!targetUser) {
    // Search in-memory connected profiles
    for (const p of inMemoryProfiles.values()) {
      if (p.friend_code.toUpperCase() === cleanCode) {
        targetUser = p;
        break;
      }
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: `Player with code ${cleanCode} not found` });
  }

  if (targetUser.id === profileId) {
    return res.status(400).json({ error: 'You cannot add your own Friend Code' });
  }

  // Check if friendship or request already exists
  const existingMemory = inMemoryFriendships.find(
    f =>
      (f.user_id === profileId && f.friend_id === targetUser.id) ||
      (f.user_id === targetUser.id && f.friend_id === profileId)
  );

  if (existingMemory) {
    if (existingMemory.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'You are already friends with this player' });
    }
    if (existingMemory.status === 'PENDING') {
      return res.status(400).json({ error: 'A friend request is already pending between you two' });
    }
  }

  const newReq: MemoryFriendship = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: profileId,
    friend_id: targetUser.id,
    sender_id: profileId,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  };
  inMemoryFriendships.push(newReq);

  try {
    await query(
      `INSERT INTO friendships (user_id, friend_id, sender_id, status)
       VALUES ($1, $2, $1, 'PENDING')`,
      [profileId, targetUser.id]
    );
  } catch {}

  // Notify recipient in real time if connected
  const recipientSocket = activeClients.get(targetUser.id);
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(
      JSON.stringify({
        type: 'FRIEND_REQUEST_RECEIVED',
        payload: {
          requestId: newReq.id,
          senderId: profileId,
          senderName: inMemoryProfiles.get(profileId)?.display_name || 'Player',
        },
      })
    );
  }

  return res.json({
    success: true,
    message: `Friend request sent to ${targetUser.display_name}!`,
    target: targetUser,
  });
});

// 4. Respond to Friend Request (Accept or Decline)
friendsRouter.post('/respond', async (req: Request, res: Response) => {
  const { requestId, accept, profileId } = req.body;
  if (!requestId || accept === undefined) {
    return res.status(400).json({ error: 'requestId and accept are required' });
  }

  const status = accept ? 'ACCEPTED' : 'DECLINED';

  const idx = inMemoryFriendships.findIndex(f => f.id === requestId);
  if (idx >= 0) {
    inMemoryFriendships[idx].status = status;
    const reqItem = inMemoryFriendships[idx];
    const partnerId = reqItem.user_id === profileId ? reqItem.friend_id : reqItem.user_id;

    // Notify the other user in real time
    const otherSocket = activeClients.get(partnerId);
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
  }

  try {
    await query(
      `UPDATE friendships 
       SET status = $1, updated_at = now()
       WHERE id = $2 AND (friend_id = $3 OR user_id = $3)`,
      [status, requestId, profileId]
    );
  } catch {}

  return res.json({ success: true, status });
});

// 5. Remove Friend
friendsRouter.delete('/:friendId', async (req: Request, res: Response) => {
  const { friendId } = req.params;
  const { profileId } = req.body;

  if (!profileId || !friendId) {
    return res.status(400).json({ error: 'profileId and friendId are required' });
  }

  // Remove from in-memory friendships
  const remaining = inMemoryFriendships.filter(
    f => !((f.user_id === profileId && f.friend_id === friendId) || (f.user_id === friendId && f.friend_id === profileId))
  );
  inMemoryFriendships.length = 0;
  inMemoryFriendships.push(...remaining);

  try {
    await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [profileId, friendId]
    );
  } catch {}

  return res.json({ success: true, message: 'Friend removed' });
});
