import { create } from 'zustand';
import { Friend, FriendRequest, MatchInvitation, PresenceStatus } from '../types/social';
import { SocialService } from '../services/socialService';
import { useAuthStore } from './useAuthStore';
import { CloudSyncService } from '../services/cloudSyncService';

interface SocialStoreState {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  incomingInvitation: MatchInvitation | null;
  isFriendsModalOpen: boolean;
  isLoading: boolean;
  actionMessage: string | null;

  // Actions
  setFriendsModalOpen: (open: boolean) => void;
  fetchFriends: (profileId: string) => Promise<void>;
  sendFriendRequest: (profileId: string, friendCode: string) => Promise<{ success: boolean; message: string }>;
  respondToFriendRequest: (requestId: string, accept: boolean, profileId: string) => Promise<void>;
  sendMatchInvite: (
    friendId: string,
    roomId: string | undefined,
    roomCode: string,
    mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P',
    stakeBuyIn: number,
    targetScore: number
  ) => void;
  setIncomingInvitation: (invite: MatchInvitation | null) => void;
  acceptInvitation: () => MatchInvitation | null;
  declineInvitation: () => void;
  initPresence: (
    profileId: string,
    displayName: string,
    avatarId?: string,
    friendCode?: string,
    level?: number
  ) => () => void;
}

export const useSocialStore = create<SocialStoreState>((set, get) => ({
  friends: SocialService.loadLocalFriends(),
  pendingRequests: SocialService.loadLocalRequests(),
  incomingInvitation: null,
  isFriendsModalOpen: false,
  isLoading: false,
  actionMessage: null,

  setFriendsModalOpen: open => set({ isFriendsModalOpen: open }),

  fetchFriends: async (profileId: string) => {
    set({ isLoading: true });
    const friends = await SocialService.fetchFriends(profileId);
    const { incoming } = await SocialService.fetchRequests(profileId);
    set({ friends, pendingRequests: incoming, isLoading: false });
  },

  sendFriendRequest: async (profileId: string, friendCode: string) => {
    set({ isLoading: true });
    const res = await SocialService.sendFriendRequest(profileId, friendCode);
    if (res.success && res.friend) {
      set(state => ({
        friends: [res.friend!, ...state.friends],
        isLoading: false,
        actionMessage: res.message,
      }));
    } else {
      set({ isLoading: false, actionMessage: res.message });
    }
    return res;
  },

  respondToFriendRequest: async (requestId: string, accept: boolean, profileId: string) => {
    set(state => ({
      pendingRequests: state.pendingRequests.filter(
        r => r.requestId !== requestId && (r as any).request_id !== requestId
      ),
    }));
    await SocialService.respondToRequest(requestId, accept, profileId);
    await get().fetchFriends(profileId);
  },

  sendMatchInvite: (friendId, roomId, roomCode, mode, stakeBuyIn, targetScore) => {
    SocialService.send('SEND_MATCH_INVITE', {
      friendId,
      roomId,
      roomCode,
      mode,
      stakeBuyIn,
      targetScore,
    });
  },

  setIncomingInvitation: invite => set({ incomingInvitation: invite }),

  acceptInvitation: () => {
    const invite = get().incomingInvitation;
    if (invite) {
      SocialService.send('RESPOND_MATCH_INVITE', {
        inviteId: invite.id,
        accept: true,
      });
      set({ incomingInvitation: null });
    }
    return invite;
  },

  declineInvitation: () => {
    const invite = get().incomingInvitation;
    if (invite) {
      SocialService.send('RESPOND_MATCH_INVITE', {
        inviteId: invite.id,
        accept: false,
      });
      set({ incomingInvitation: null });
    }
  },

  initPresence: (
    profileId: string,
    displayName: string,
    avatarId?: string,
    friendCode?: string,
    level?: number
  ) => {
    SocialService.connectWebSocket(profileId, displayName, avatarId, friendCode, level);

    const unsubscribe = SocialService.addMessageListener(msg => {
      switch (msg.type) {
        case 'FRIEND_PRESENCE_UPDATE': {
          const { friendId, status, matchInfo } = msg.payload;
          set(state => ({
            friends: state.friends.map(f =>
              f.friendId === friendId
                ? { ...f, presenceStatus: status as PresenceStatus, currentMatchInfo: matchInfo }
                : f
            ),
          }));
          break;
        }

        case 'MATCH_INVITE_RECEIVED': {
          set({ incomingInvitation: msg.payload });
          break;
        }

        case 'AUTH_SUCCESS': {
          const confirmedCode = msg.payload?.friendCode;
          if (confirmedCode) {
            const authState = useAuthStore.getState();
            if (authState.profile && authState.profile.friendCode !== confirmedCode) {
              const updated = { ...authState.profile, friendCode: confirmedCode };
              CloudSyncService.saveProfileLocally(updated);
              useAuthStore.setState({ profile: updated });
            }
          }
          break;
        }

        case 'FRIEND_REQUEST_RECEIVED':
        case 'FRIEND_REQUEST_RESOLVED': {
          get().fetchFriends(profileId);
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      SocialService.disconnect();
    };
  },
}));
