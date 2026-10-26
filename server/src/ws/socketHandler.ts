import { WebSocketServer, WebSocket } from 'ws';
import { query } from '../db.js';
import { RedisState } from '../redis.js';

interface AuthenticatedSocket extends WebSocket {
  profileId?: string;
  displayName?: string;
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

export function setupWebSocket(wss: WebSocketServer) {
  // 30s heartbeat interval to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      const socket = ws as AuthenticatedSocket;
      if (socket.isAlive === false) {
        if (socket.profileId) {
          handleDisconnection(socket.profileId);
        }
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

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
  const { type, payload } = message;

  switch (type) {
    case 'AUTH_INIT': {
      const { profileId, displayName, avatarId, friendCode, level } = payload;
      if (!profileId) return;

      socket.profileId = profileId;
      socket.displayName = displayName;
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

      // Update presence in database
      try {
        await query(
          "UPDATE profiles SET presence_status = 'IN_LOBBY', friend_code = $2, last_active_at = now() WHERE id = $1",
          [profileId, resolvedFriendCode]
        );
      } catch {}

      // Broadcast presence to all friends
      await broadcastPresenceToFriends(profileId, 'IN_LOBBY');

      socket.send(
        JSON.stringify({
          type: 'AUTH_SUCCESS',
          payload: { profileId, status: 'IN_LOBBY', friendCode: resolvedFriendCode },
        })
      );

      // Reconnect recovery check: restore active seat & room from Redis
      if (payload.sessionToken) {
        try {
          const session = await RedisState.getClientSession(payload.sessionToken);
          if (session) {
            const room = await RedisState.getRoom(session.roomCode);
            if (room && room.status !== 'FINISHED') {
              socket.send(
                JSON.stringify({
                  type: 'SESSION_RESTORED',
                  payload: { room, seatIndex: session.seatIndex },
                })
              );
            }
          }
        } catch (_err) {}
      }
      break;
    }

    case 'UPDATE_PRESENCE': {
      if (!socket.profileId) return;
      const { status, matchInfo } = payload; // status: 'IN_LOBBY' | 'IN_MATCH' | 'OFFLINE'

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
        // Fetch sender details
        const senderRes = await query(
          'SELECT display_name, avatar_id FROM profiles WHERE id = $1',
          [socket.profileId]
        );
        const sender = senderRes.rows[0] || {
          display_name: socket.displayName || 'Host',
          avatar_id: 'sultan',
        };

        // Create invitation record in DB
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

        // If target friend is currently connected, push real-time toast notification
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

        // Notify sender of response
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
  activeClients.delete(profileId);
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
    // Find all accepted friends of this user
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
