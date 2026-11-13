import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { activeClients, inMemoryProfiles, inMemoryFriendships, MemoryFriendship } from '../ws/socketHandler.js';
import {
  getProfileByFriendCode,
  getProfileByHandle,
  getProfileById,
  createFriendRequest,
  getAcceptedFriends,
  getFriendRequests,
  respondToRequest,
  cancelFriendRequest,
  removeFriendship,
} from '../firestore.js';
import { WebSocket } from 'ws';

export const friendsRouter = Router();

function resolveLivePresence(profileId: string, fallbackPresence?: string): string {
  if (activeClients.has(profileId)) {
    const live = inMemoryProfiles.get(profileId)?.presence_status;
    if (live && live !== 'OFFLINE') return live;
    if (fallbackPresence && fallbackPresence !== 'OFFLINE') return fallbackPresence;
    return 'IN_LOBBY';
  }
  return fallbackPresence || 'OFFLINE';
}

async function isGuestAccount(profileId: string): Promise<boolean> {
  if (!profileId) return true;
  if (profileId.startsWith('guest_')) return true;
  const mem = inMemoryProfiles.get(profileId);
  if (mem?.login_provider === 'GUEST') return true;
  try {
    const fsProf = await getProfileById(profileId);
    if (fsProf?.login_provider === 'GUEST') return true;
  } catch {}
  try {
    const pgRes = await query(`SELECT login_provider FROM profiles WHERE id::text = $1 LIMIT 1`, [profileId]);
    if (pgRes?.rows?.[0]?.login_provider === 'GUEST') return true;
  } catch {}
  return false;
}

interface ResolvedTarget {
  id: string;
  display_name: string;
  username?: string;
  avatar_id: string;
  level: number;
  friend_code: string;
  presence_status?: string;
  login_provider?: string;
}

async function resolvePlayerByIdentifier(rawInput: string): Promise<ResolvedTarget | null> {
  const input = rawInput.trim();
  if (!input) return null;

  const isExplicitHandle = input.startsWith('@');
  const handleCandidate = input.replace(/^@+/, '').trim();
  const handleLower = handleCandidate.toLowerCase();
  const upper = input.toUpperCase();
  const strippedCode = upper.replace(/^HLH-|^DIGU-/, '').trim();

  // Order lookup intelligently based on input shape:
  // @handle -> handle only; HLH-/DIGU- -> friend code first; otherwise UID / handle / code.
  const tryFirestoreHandle = async () => {
    const p = await getProfileByHandle(handleCandidate);
    return p ? {
      id: p.id,
      display_name: p.display_name,
      username: p.username || '',
      avatar_id: p.avatar_id,
      level: p.level,
      friend_code: p.friend_code,
      presence_status: p.presence_status,
      login_provider: p.login_provider,
    } : null;
  };

  const tryFirestoreUid = async () => {
    const p = await getProfileById(input);
    return p ? {
      id: p.id,
      display_name: p.display_name,
      username: p.username || '',
      avatar_id: p.avatar_id,
      level: p.level,
      friend_code: p.friend_code,
      presence_status: p.presence_status,
      login_provider: p.login_provider,
    } : null;
  };

  const tryFirestoreCode = async () => {
    const p = await getProfileByFriendCode(upper);
    return p ? {
      id: p.id,
      display_name: p.display_name,
      username: p.username || '',
      avatar_id: p.avatar_id,
      level: p.level,
      friend_code: p.friend_code,
      presence_status: p.presence_status,
      login_provider: p.login_provider,
    } : null;
  };

  let target: ResolvedTarget | null = null;

  try {
    if (isExplicitHandle) {
      target = await tryFirestoreHandle();
    } else if (upper.startsWith('HLH-') || upper.startsWith('DIGU-')) {
      target = (await tryFirestoreCode()) || (await tryFirestoreHandle());
    } else {
      target =
        (await tryFirestoreUid()) ||
        (await tryFirestoreHandle()) ||
        (await tryFirestoreCode());
    }
  } catch {}

  // Check PostgreSQL if not yet resolved
  if (!target) {
    try {
      if (isExplicitHandle) {
        const res = await query(
          `SELECT id, display_name, username, avatar_id, level, friend_code, presence_status, login_provider
           FROM profiles WHERE username_lower = $1 LIMIT 1`,
          [handleLower]
        );
        if (res?.rows?.length > 0) target = res.rows[0];
      } else {
        const res = await query(
          `SELECT id, display_name, username, avatar_id, level, friend_code, presence_status, login_provider
           FROM profiles
           WHERE id::text = $1
              OR username_lower = $2
              OR UPPER(friend_code) = $3
              OR UPPER(friend_code) = $4
              OR UPPER(friend_code) = $5
              OR (length($6) >= 4 AND UPPER(friend_code) LIKE '%' || $6)
           LIMIT 1`,
          [input, handleLower, upper, `HLH-${strippedCode}`, `DIGU-${strippedCode}`, strippedCode]
        );
        if (res?.rows?.length > 0) target = res.rows[0];
      }
    } catch {}
  }

  // Check in-memory connected profiles fallback
  if (!target) {
    if (!isExplicitHandle && inMemoryProfiles.has(input)) {
      target = inMemoryProfiles.get(input) ?? null;
    } else {
      for (const p of inMemoryProfiles.values()) {
        const pUsernameLower = (p.username || '').toLowerCase();
        const pCode = (p.friend_code || '').toUpperCase();
        const pCodeSuffix = pCode.replace(/^HLH-|^DIGU-/, '').trim();

        if (isExplicitHandle) {
          if (pUsernameLower && pUsernameLower === handleLower) {
            target = p;
            break;
          }
        } else if (
          p.id === input ||
          (pUsernameLower && pUsernameLower === handleLower) ||
          pCode === upper ||
          pCode === `HLH-${strippedCode}` ||
          pCode === `DIGU-${strippedCode}` ||
          (strippedCode.length >= 4 && pCodeSuffix === strippedCode)
        ) {
          target = p;
          break;
        }
      }
    }
  }

  return target;
}

// 1. Fetch Friends with Live Presence
friendsRouter.get('/', async (req: Request, res: Response) => {
  const { profileId } = req.query as { profileId: string };
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  // 1. Check Google Cloud Firestore
  try {
    const fsFriends = await getAcceptedFriends(profileId);
    if (fsFriends && fsFriends.length > 0) {
      const friends = fsFriends.map(f => {
        const liveStatus = resolveLivePresence(f.friendId, f.presenceStatus);
        return {
          ...f,
          presenceStatus: liveStatus,
          presence_status: liveStatus,
          currentMatchInfo: inMemoryProfiles.get(f.friendId)?.current_match_info ?? f.currentMatchInfo,
        };
      });
      return res.json({ friends });
    }
  } catch {}

  // 2. Check PostgreSQL (if connected)
  try {
    const result = await query(
      `SELECT 
        f.id AS friendship_id,
        f.created_at AS friends_since,
        p.id AS friend_id,
        p.display_name,
        p.username,
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
      const friends = result.rows.map(r => {
        const liveStatus = resolveLivePresence(r.friend_id, r.presence_status);
        return {
          ...r,
          friendshipId: r.friendship_id,
          friendsSince: r.friends_since,
          friendId: r.friend_id,
          displayName: r.display_name,
          username: r.username || '',
          avatarId: r.avatar_id,
          level: r.level,
          friendCode: r.friend_code,
          presenceStatus: liveStatus,
          currentMatchInfo: inMemoryProfiles.get(r.friend_id)?.current_match_info ?? r.current_match_info,
          lastActiveAt: r.last_active_at,
        };
      });
      return res.json({ friends });
    }
  } catch {}

  // Fallback to in-memory store
  const userFriendships = inMemoryFriendships.filter(
    f => (f.user_id === profileId || f.friend_id === profileId) && f.status === 'ACCEPTED'
  );

  const friends = userFriendships.map(f => {
    const otherId = f.user_id === profileId ? f.friend_id : f.user_id;
    const p: any = inMemoryProfiles.get(otherId) || {
      id: otherId,
      display_name: 'Player',
      username: '',
      avatar_id: 'boduthakurufaanu',
      friend_code: `HLH-${Math.floor(10000 + Math.random() * 90000)}`,
      level: 1,
      presence_status: resolveLivePresence(otherId),
      current_match_info: null,
      last_active_at: new Date().toISOString(),
    };
    const liveStatus = resolveLivePresence(p.id, p.presence_status);
    return {
      friendshipId: f.id,
      friendship_id: f.id,
      friendsSince: f.created_at,
      friends_since: f.created_at,
      friendId: p.id,
      friend_id: p.id,
      displayName: p.display_name,
      display_name: p.display_name,
      username: p.username || '',
      avatarId: p.avatar_id,
      avatar_id: p.avatar_id,
      level: p.level,
      friendCode: p.friend_code,
      friend_code: p.friend_code,
      presenceStatus: liveStatus,
      presence_status: liveStatus,
      currentMatchInfo: p.current_match_info,
      current_match_info: p.current_match_info,
      lastActiveAt: p.last_active_at,
      last_active_at: p.last_active_at,
    };
  });

  return res.json({ friends });
});

// 1b. Lookup Player by @handle, UID, or Friend Code before sending request
friendsRouter.get('/lookup', async (req: Request, res: Response) => {
  const q = String(req.query.q || req.query.identifier || '').trim();
  const requesterId = String(req.query.requesterId || req.query.profileId || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Search query (q) is required' });
  }

  const target = await resolvePlayerByIdentifier(q);
  if (!target) {
    return res.status(404).json({ error: `No player found matching "${q}"` });
  }

  let relationStatus: 'SELF' | 'FRIEND' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'NONE' = 'NONE';
  if (requesterId && target.id === requesterId) {
    relationStatus = 'SELF';
  } else if (requesterId) {
    try {
      const [accepted, pending] = await Promise.all([
        getAcceptedFriends(requesterId),
        getFriendRequests(requesterId),
      ]);
      if (accepted.some((f) => f.friendId === target.id)) {
        relationStatus = 'FRIEND';
      } else if (pending.outgoing.some((r) => r.receiverId === target.id)) {
        relationStatus = 'OUTGOING_PENDING';
      } else if (pending.incoming.some((r) => r.senderId === target.id)) {
        relationStatus = 'INCOMING_PENDING';
      }
    } catch {}

    if (relationStatus === 'NONE') {
      const mem = inMemoryFriendships.find(
        (f) =>
          (f.user_id === requesterId && f.friend_id === target.id) ||
          (f.user_id === target.id && f.friend_id === requesterId)
      );
      if (mem) {
        if (mem.status === 'ACCEPTED') relationStatus = 'FRIEND';
        else if (mem.status === 'PENDING') {
          relationStatus = mem.sender_id === requesterId ? 'OUTGOING_PENDING' : 'INCOMING_PENDING';
        }
      }
    }
  }

  return res.json({
    target: {
      id: target.id,
      displayName: target.display_name,
      username: target.username || '',
      avatarId: target.avatar_id || 'sultan',
      level: Number(target.level) || 1,
      friendCode: target.friend_code || '',
      presenceStatus: resolveLivePresence(target.id, target.presence_status),
      relationStatus,
    },
  });
});

// 2. Fetch Pending Friend Requests
friendsRouter.get('/requests', async (req: Request, res: Response) => {
  const { profileId } = req.query as { profileId: string };
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  // 1. Check Google Cloud Firestore
  try {
    const fsRequests = await getFriendRequests(profileId);
    if (fsRequests && (fsRequests.incoming.length > 0 || fsRequests.outgoing.length > 0)) {
      return res.json(fsRequests);
    }
  } catch {}

  // 2. Check PostgreSQL (if connected)
  try {
    const incomingRes = await query(
      `SELECT 
        f.id AS request_id,
        f.created_at,
        p.id AS sender_id,
        p.display_name,
        p.username,
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
        p.username,
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
      const mapReq = (r: any, isIncoming: boolean) => ({
        ...r,
        requestId: r.request_id,
        createdAt: r.created_at,
        senderId: isIncoming ? r.sender_id : undefined,
        receiverId: !isIncoming ? r.receiver_id : undefined,
        displayName: r.display_name,
        username: r.username || '',
        avatarId: r.avatar_id,
        level: r.level,
        friendCode: r.friend_code,
      });

      return res.json({
        incoming: incomingRes.rows.map(r => mapReq(r, true)),
        outgoing: outgoingRes.rows.map(r => mapReq(r, false)),
      });
    }
  } catch {}

  // Fallback to in-memory store
  const incoming = inMemoryFriendships
    .filter(f => f.friend_id === profileId && f.status === 'PENDING')
    .map(f => {
      const p = inMemoryProfiles.get(f.sender_id);
      return {
        requestId: f.id,
        request_id: f.id,
        createdAt: f.created_at,
        created_at: f.created_at,
        senderId: f.sender_id,
        sender_id: f.sender_id,
        displayName: p?.display_name || 'Player',
        display_name: p?.display_name || 'Player',
        username: p?.username || '',
        avatarId: p?.avatar_id || 'boduthakurufaanu',
        avatar_id: p?.avatar_id || 'boduthakurufaanu',
        level: p?.level || 1,
        friendCode: p?.friend_code || '',
        friend_code: p?.friend_code || '',
      };
    });

  const outgoing = inMemoryFriendships
    .filter(f => f.user_id === profileId && f.status === 'PENDING')
    .map(f => {
      const p = inMemoryProfiles.get(f.friend_id);
      return {
        requestId: f.id,
        request_id: f.id,
        createdAt: f.created_at,
        created_at: f.created_at,
        receiverId: f.friend_id,
        receiver_id: f.friend_id,
        displayName: p?.display_name || 'Player',
        display_name: p?.display_name || 'Player',
        username: p?.username || '',
        avatarId: p?.avatar_id || 'boduthakurufaanu',
        avatar_id: p?.avatar_id || 'boduthakurufaanu',
        level: p?.level || 1,
        friendCode: p?.friend_code || '',
        friend_code: p?.friend_code || '',
      };
    });

  return res.json({ incoming, outgoing });
});

// 3. Send Friend Request via @handle, UID, or Friend Code
friendsRouter.post('/request', async (req: Request, res: Response) => {
  const { profileId, identifier, friendCode } = req.body;
  const queryValue = String(identifier ?? friendCode ?? '').trim();
  if (!profileId || !queryValue) {
    return res.status(400).json({ error: 'profileId and identifier are required' });
  }

  if (await isGuestAccount(profileId)) {
    return res.status(403).json({ error: 'Sign in with Google to add friends' });
  }

  const targetUser = await resolvePlayerByIdentifier(queryValue);
  if (!targetUser) {
    return res.status(404).json({ error: `Player "${queryValue}" not found` });
  }

  if (targetUser.id === profileId) {
    return res.status(400).json({ error: 'You cannot add yourself' });
  }

  if (targetUser.login_provider === 'GUEST' || String(targetUser.id).startsWith('guest_')) {
    return res.status(400).json({ error: 'Only Google-synced players can be added as friends' });
  }

  // Check if friendship or request already exists in Firestore or memory
  try {
    const [accepted, pending] = await Promise.all([
      getAcceptedFriends(profileId),
      getFriendRequests(profileId),
    ]);
    if (accepted.some((f) => f.friendId === targetUser.id)) {
      return res.status(400).json({ error: 'You are already friends with this player' });
    }
    if (
      pending.outgoing.some((r) => r.receiverId === targetUser.id) ||
      pending.incoming.some((r) => r.senderId === targetUser.id)
    ) {
      return res.status(400).json({ error: 'A friend request is already pending between you two' });
    }
  } catch {}

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

  // Save to Google Cloud Firestore first to get canonical request ID
  let requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let createdAt = new Date().toISOString();
  try {
    const fsRecord = await createFriendRequest(profileId, targetUser.id);
    if (fsRecord) {
      requestId = fsRecord.id;
      createdAt = fsRecord.created_at;
    }
  } catch {}

  const newReq: MemoryFriendship = {
    id: requestId,
    user_id: profileId,
    friend_id: targetUser.id,
    sender_id: profileId,
    status: 'PENDING',
    created_at: createdAt,
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
  const senderMem = inMemoryProfiles.get(profileId);
  const recipientSocket = activeClients.get(targetUser.id);
  if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
    recipientSocket.send(
      JSON.stringify({
        type: 'FRIEND_REQUEST_RECEIVED',
        payload: {
          requestId: newReq.id,
          senderId: profileId,
          senderName: senderMem?.display_name || 'Player',
          senderUsername: senderMem?.username || '',
          avatarId: senderMem?.avatar_id || 'sultan',
        },
      })
    );
  }

  return res.json({
    success: true,
    requestId: newReq.id,
    message: `Friend request sent to ${targetUser.display_name}!`,
    target: {
      id: targetUser.id,
      displayName: targetUser.display_name,
      username: targetUser.username || '',
      avatarId: targetUser.avatar_id || 'sultan',
      level: Number(targetUser.level) || 1,
      friendCode: targetUser.friend_code || '',
    },
  });
});

// 4. Respond to Friend Request (Accept or Decline)
friendsRouter.post('/respond', async (req: Request, res: Response) => {
  const requestId = req.body.requestId || req.body.request_id;
  const accept = req.body.accept;
  const profileId = req.body.profileId || req.body.profile_id;

  if (!requestId || accept === undefined) {
    return res.status(400).json({ error: 'requestId and accept are required' });
  }

  const accepted = Boolean(accept);
  const status = accepted ? 'ACCEPTED' : 'DECLINED';
  let partnerId: string | undefined;

  // Lookup partner before mutating so live WS notifications work even on Firestore/PG-only requests
  const idx = inMemoryFriendships.findIndex(f => f.id === requestId);
  if (idx >= 0) {
    const reqItem = inMemoryFriendships[idx];
    partnerId = reqItem.user_id === profileId ? reqItem.friend_id : reqItem.user_id;
    if (accepted) {
      inMemoryFriendships[idx].status = 'ACCEPTED';
    } else {
      inMemoryFriendships.splice(idx, 1);
    }
  } else if (profileId) {
    try {
      const pending = await getFriendRequests(profileId);
      const match = pending.incoming.find(r => r.requestId === requestId);
      if (match) partnerId = match.senderId;
    } catch {}
  }

  // Update Firestore
  try {
    await respondToRequest(requestId, accepted);
  } catch {}

  try {
    if (accepted) {
      await query(
        `UPDATE friendships 
         SET status = 'ACCEPTED', updated_at = now()
         WHERE id::text = $1 AND (friend_id = $2 OR user_id = $2)`,
        [requestId, profileId]
      );
    } else {
      await query(
        `DELETE FROM friendships WHERE id::text = $1 AND (friend_id = $2 OR user_id = $2)`,
        [requestId, profileId]
      );
    }
  } catch {}

  if (partnerId) {
    const otherSocket = activeClients.get(partnerId);
    if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
      otherSocket.send(
        JSON.stringify({
          type: 'FRIEND_REQUEST_RESOLVED',
          payload: {
            requestId,
            accepted,
            friendId: profileId,
          },
        })
      );
    }
  }

  return res.json({ success: true, status });
});

// 4b. Cancel Outgoing Friend Request
async function handleCancelRequest(req: Request, res: Response) {
  const requestId = req.params.requestId || req.body?.requestId || req.body?.request_id;
  const profileId = req.body?.profileId || req.body?.profile_id || (req.query?.profileId as string);

  if (!requestId || !profileId) {
    return res.status(400).json({ error: 'requestId and profileId are required' });
  }

  const idx = inMemoryFriendships.findIndex(
    f => f.id === requestId && f.sender_id === profileId && f.status === 'PENDING'
  );
  if (idx >= 0) {
    inMemoryFriendships.splice(idx, 1);
  }

  try {
    await cancelFriendRequest(requestId, profileId);
  } catch {}

  try {
    await query(
      `DELETE FROM friendships WHERE id::text = $1 AND sender_id = $2 AND status = 'PENDING'`,
      [requestId, profileId]
    );
  } catch {}

  return res.json({ success: true });
}

friendsRouter.post('/cancel', handleCancelRequest);
friendsRouter.delete('/request/:requestId', handleCancelRequest);

// 5. Remove Friend
friendsRouter.delete('/:friendId', async (req: Request, res: Response) => {
  const { friendId } = req.params;
  const profileId = req.body?.profileId || req.body?.profile_id || (req.query?.profileId as string);

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
    await removeFriendship(profileId, friendId);
  } catch {}

  try {
    await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [profileId, friendId]
    );
  } catch {}

  const friendSocket = activeClients.get(friendId);
  if (friendSocket && friendSocket.readyState === WebSocket.OPEN) {
    friendSocket.send(
      JSON.stringify({
        type: 'FRIEND_REMOVED',
        payload: { friendId: profileId },
      })
    );
  }

  return res.json({ success: true, message: 'Friend removed' });
});
