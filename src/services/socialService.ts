/**
 * SocialService:
 * Real-Time WebSocket and REST Client for Friends, Presence, and Match Invitations.
 * Includes local-first resilience with offline mock state when disconnected.
 */

import { Friend, FriendRequest } from '../types/social';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:8080';

const WS_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL) ||
  'ws://localhost:8080';

const LOCAL_FRIENDS_KEY = 'thaasbai_local_friends_v1';
const LOCAL_REQUESTS_KEY = 'thaasbai_local_friend_requests_v1';

// Seed demo friends if none exist yet locally
const INITIAL_DEMO_FRIENDS: Friend[] = [
  {
    friendshipId: 'demo-f-1',
    friendId: 'demo-user-1',
    displayName: 'Ahmed Moosa',
    avatarId: 'boduthakurufaanu',
    level: 14,
    friendCode: 'DIGU-1104',
    presenceStatus: 'IN_LOBBY',
    friendsSince: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    friendshipId: 'demo-f-2',
    friendId: 'demo-user-2',
    displayName: 'Mariyam Didi',
    avatarId: 'queen',
    level: 22,
    friendCode: 'DIGU-8821',
    presenceStatus: 'IN_MATCH',
    currentMatchInfo: { roomCode: 'THAAS-4412', mode: 'TEAM_4P' },
    friendsSince: new Date(Date.now() - 86400000 * 12).toISOString(),
    lastActiveAt: new Date(Date.now() - 60000 * 5).toISOString(),
  },
  {
    friendshipId: 'demo-f-3',
    friendId: 'demo-user-3',
    displayName: 'Ali Rasheed',
    avatarId: 'fisher',
    level: 8,
    friendCode: 'DIGU-3392',
    presenceStatus: 'OFFLINE',
    friendsSince: new Date(Date.now() - 86400000 * 20).toISOString(),
    lastActiveAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

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
  static connectWebSocket(profileId: string, displayName: string): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        this.send('AUTH_INIT', { profileId, displayName });
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
          this.connectWebSocket(profileId, displayName);
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
      const res = await fetch(`${API_BASE_URL}/api/friends?profileId=${profileId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.friends) {
          this.saveLocalFriends(data.friends);
          return data.friends;
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
      const res = await fetch(`${API_BASE_URL}/api/friends/requests?profileId=${profileId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
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
      const res = await fetch(`${API_BASE_URL}/api/friends/request`, {
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
      // Offline fallback: simulated local friend add
      const existing = this.loadLocalFriends();
      if (existing.some(f => f.friendCode.toUpperCase() === cleanCode)) {
        return { success: false, message: 'Player is already on your Friends list.' };
      }

      const newFriend: Friend = {
        friendshipId: `local-f-${Date.now()}`,
        friendId: `user_${Math.random().toString(36).substring(2, 8)}`,
        displayName: `Friend (${cleanCode})`,
        avatarId: 'holhuashi',
        level: 5,
        friendCode: cleanCode,
        presenceStatus: 'IN_LOBBY',
        friendsSince: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      existing.unshift(newFriend);
      this.saveLocalFriends(existing);
      return { success: true, message: `Connected with ${cleanCode}!`, friend: newFriend };
    }
  }

  /**
   * Respond to Friend Request
   */
  static async respondToRequest(requestId: string, accept: boolean, profileId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/friends/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, accept, profileId }),
      });
      return res.ok;
    } catch {
      const requests = this.loadLocalRequests().filter(r => r.requestId !== requestId);
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
        if (raw) return JSON.parse(raw);
        localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(INITIAL_DEMO_FRIENDS));
      }
    } catch {}
    return INITIAL_DEMO_FRIENDS;
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
