/**
 * SocialService:
 * Real-Time WebSocket and REST Client for Friends, Presence, and Match Invitations.
 * Includes local-first resilience with offline mock state when disconnected.
 */

import { Friend, FriendRequest } from '../types/social';
import { getApiBaseUrl, getWsBaseUrl } from '../config/networkConfig';

const LOCAL_FRIENDS_KEY = 'thaasbai_local_friends_v1';
const LOCAL_REQUESTS_KEY = 'thaasbai_local_friend_requests_v1';

export class SocialService {
  private static ws: WebSocket | null = null;
  private static messageListeners: ((msg: any) => void)[] = [];
  private static reconnectTimer: any = null;

  static isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to Real-Time Presence & Invitation WebSocket
   */
  static connectWebSocket(
    profileId: string,
    displayName: string,
    avatarId?: string,
    friendCode?: string,
    level?: number
  ): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(getWsBaseUrl());

      this.ws.onopen = () => {
        this.send('AUTH_INIT', { profileId, displayName, avatarId, friendCode, level });
      };

      this.ws.onmessage = event => {
        try {
          const parsed = JSON.parse(event.data);
          this.messageListeners.forEach(listener => listener(parsed));
        } catch {}
      };

      this.ws.onclose = () => {
        // Auto-reconnect after 5 seconds if disconnected
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connectWebSocket(profileId, displayName, avatarId, friendCode, level);
        }, 5000);
      };

      this.ws.onerror = () => {};
    } catch {}
  }

  /**
   * Send a message through WebSocket
   */
  static send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /**
   * Register a message listener
   */
  static addMessageListener(listener: (msg: any) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  /**
   * Disconnect WebSocket
   */
  static disconnect(): void {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Fetch Friends list
   */
  static async fetchFriends(profileId: string): Promise<Friend[]> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/friends?profileId=${profileId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.friends) {
          const normalized: Friend[] = data.friends.map((f: any) => ({
            friendshipId: f.friendshipId || f.friendship_id || `f_${Date.now()}`,
            friendsSince: f.friendsSince || f.friends_since || new Date().toISOString(),
            friendId: f.friendId || f.friend_id,
            displayName: f.displayName || f.display_name || 'Player',
            avatarId: f.avatarId || f.avatar_id || 'sultan',
            level: f.level || 1,
            friendCode: f.friendCode || f.friend_code || '',
            presenceStatus: f.presenceStatus || f.presence_status || 'OFFLINE',
            currentMatchInfo: f.currentMatchInfo || f.current_match_info || null,
            lastActiveAt: f.lastActiveAt || f.last_active_at || new Date().toISOString(),
          }));
          this.saveLocalFriends(normalized);
          return normalized;
        }
      }
    } catch {
      // Fallback to local storage cache
    }
    return this.loadLocalFriends();
  }

  /**
   * Fetch Pending Requests
   */
  static async fetchRequests(profileId: string): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/friends/requests?profileId=${profileId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const incoming: FriendRequest[] = (data.incoming || []).map((r: any) => ({
          requestId: r.requestId || r.request_id,
          createdAt: r.createdAt || r.created_at || new Date().toISOString(),
          senderId: r.senderId || r.sender_id,
          displayName: r.displayName || r.display_name || 'Player',
          avatarId: r.avatarId || r.avatar_id || 'sultan',
          level: r.level || 1,
          friendCode: r.friendCode || r.friend_code || '',
        }));
        const outgoing: FriendRequest[] = (data.outgoing || []).map((r: any) => ({
          requestId: r.requestId || r.request_id,
          createdAt: r.createdAt || r.created_at || new Date().toISOString(),
          receiverId: r.receiverId || r.receiver_id,
          displayName: r.displayName || r.display_name || 'Player',
          avatarId: r.avatarId || r.avatar_id || 'sultan',
          level: r.level || 1,
          friendCode: r.friendCode || r.friend_code || '',
        }));
        return { incoming, outgoing };
      }
    } catch {}
    return { incoming: this.loadLocalRequests(), outgoing: [] };
  }

  /**
   * Send Friend Request by Friend Code
   */
  static async sendFriendRequest(
    profileId: string,
    friendCode: string
  ): Promise<{ success: boolean; message: string; friend?: Friend }> {
    const cleanCode = friendCode.trim().toUpperCase();

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, friendCode: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to send request' };
      }
      return { success: true, message: data.message };
    } catch {
      return {
        success: false,
        message: 'Unable to reach game server. Please check your internet connection.',
      };
    }
  }

  /**
   * Respond to Friend Request
   */
  static async respondToRequest(requestId: string, accept: boolean, profileId: string): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/friends/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          request_id: requestId,
          accept,
          profileId,
          profile_id: profileId,
        }),
      });
      return res.ok;
    } catch {
      const requests = this.loadLocalRequests().filter(
        r => r.requestId !== requestId && (r as any).request_id !== requestId
      );
      this.saveLocalRequests(requests);
      return true;
    }
  }

  /**
   * Local Storage Persistence Helpers
   */
  static loadLocalFriends(): Friend[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LOCAL_FRIENDS_KEY);
        if (raw) {
          const list: Friend[] = JSON.parse(raw);
          // Purge any legacy demo friends from previous versions
          const cleaned = list.filter(
            f => !f.friendshipId?.startsWith('demo-') && !f.friendId?.startsWith('demo-')
          );
          if (cleaned.length !== list.length) {
            localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch {}
    return [];
  }

  static saveLocalFriends(friends: Friend[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(friends));
      }
    } catch {}
  }

  static loadLocalRequests(): FriendRequest[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  static saveLocalRequests(requests: FriendRequest[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
      }
    } catch {}
  }
}
