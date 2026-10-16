/**
 * Friends & Social Connect Types
 */

export type PresenceStatus = 'IN_LOBBY' | 'IN_MATCH' | 'OFFLINE';

export interface MatchInfo {
  roomCode: string;
  mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P';
}

export interface Friend {
  friendshipId: string;
  friendId: string;
  displayName: string;
  avatarId: string;
  level: number;
  friendCode: string;
  presenceStatus: PresenceStatus;
  currentMatchInfo?: MatchInfo | null;
  lastActiveAt: string;
  friendsSince: string;
}

export interface FriendRequest {
  requestId: string;
  createdAt: string;
  senderId?: string;
  receiverId?: string;
  displayName: string;
  avatarId: string;
  level: number;
  friendCode: string;
}

export interface MatchInvitation {
  id: string;
  roomId?: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderAvatarId: string;
  mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P';
  stakeBuyIn: number;
  targetScore: number;
  expiresAt: string;
}
