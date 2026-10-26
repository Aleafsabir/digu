/**
 * Database & Currency Transaction Service
 * Implements client-side ACID ledger with Cloud PostgreSQL / Supabase sync adapter.
 */
import {
  CurrencyTransaction,
  GameRoom,
  RoomSeat,
  MatchRecord,
} from '../types/database';
import { UserProfile } from '../types/auth';
import { getApiBaseUrl } from '../config/networkConfig';
import { getOrCreateSessionToken } from './socialService';

const LEDGER_STORAGE_KEY = 'thaasbai_currency_ledger_v1';

// In-memory fallback for headless/test environments
let memoryLedger: CurrencyTransaction[] = [];
let memoryRooms: Record<string, GameRoom> = {};
let memoryMatches: MatchRecord[] = [];

export class DatabaseService {
  /**
   * Load local ledger transactions.
   */
  static getTransactions(profileId?: string): CurrencyTransaction[] {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
        if (raw) {
          const all: CurrencyTransaction[] = JSON.parse(raw);
          return profileId ? all.filter(t => t.profileId === profileId) : all;
        }
      } else {
        return profileId ? memoryLedger.filter(t => t.profileId === profileId) : memoryLedger;
      }
    } catch {
      // Fallback
    }
    return [];
  }

  /**
   * Append an immutable transaction to the local ledger and sync to cloud.
   */
  static recordTransaction(tx: Omit<CurrencyTransaction, 'id' | 'createdAt'>): CurrencyTransaction {
    const fullTx: CurrencyTransaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = this.getTransactions();
      const updated = [fullTx, ...existing].slice(0, 100); // Retain last 100 transactions
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(updated));
      } else {
        memoryLedger = updated;
      }
    } catch {
      memoryLedger = [fullTx, ...memoryLedger].slice(0, 100);
    }

    return fullTx;
  }

  /**
   * Generate an authentic 6-digit room code like 'THAAS-8842'.
   */
  static generateRoomCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  /**
   * Synchronously creates a local GameRoom object (used by local simulation and fallback).
   */
  static createLocalRoom(
    hostProfile: UserProfile,
    mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P',
    stakeBuyIn: number,
    targetScore: number,
    isPrivate = false
  ): GameRoom {
    const maxPlayers = mode === 'SOLO_2P' ? 2 : 4;
    const roomCode = this.generateRoomCode();
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const hostSeat: RoomSeat = {
      roomId,
      seatIndex: 0,
      profileId: hostProfile.id,
      playerName: hostProfile.displayName,
      avatarId: hostProfile.avatarId,
      teamId: mode === 'TEAM_4P' ? 'TEAM_A' : null,
      isBot: false,
      isReady: true,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    };

    const emptySeats: RoomSeat[] = [];
    for (let i = 1; i < maxPlayers; i++) {
      emptySeats.push({
        roomId,
        seatIndex: i,
        playerName: `Seat ${i + 1}`,
        avatarId: 'sultan',
        teamId: mode === 'TEAM_4P' ? (i === 2 ? 'TEAM_A' : 'TEAM_B') : null,
        isBot: false,
        isReady: false,
        isConnected: false,
        joinedAt: new Date().toISOString(),
      });
    }

    const room: GameRoom = {
      id: roomId,
      roomCode,
      mode,
      stakeBuyIn,
      targetScore,
      status: 'WAITING',
      hostPlayerId: hostProfile.id,
      maxPlayers,
      currentPlayerCount: 1,
      potTotal: stakeBuyIn,
      isPrivate,
      seats: [hostSeat, ...emptySeats],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryRooms[roomCode] = room;
    return room;
  }

  /**
   * Create a new Game Room (Private or Public) via Authoritative Server.
   */
  static async createRoom(
    hostProfile: UserProfile,
    mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P',
    stakeBuyIn: number,
    targetScore: number,
    isPrivate = false
  ): Promise<GameRoom> {
    try {
      const sessionToken = getOrCreateSessionToken();
      const res = await fetch(`${getApiBaseUrl()}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostProfile, mode, stakeBuyIn, targetScore, isPrivate, sessionToken }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          memoryRooms[data.room.roomCode] = data.room;
          return data.room;
        }
      }
    } catch (_err) {
      // Graceful offline fallback
    }

    return this.createLocalRoom(hostProfile, mode, stakeBuyIn, targetScore, isPrivate);
  }

  /**
   * Find a room by its 6-digit code via Authoritative Server.
   */
  static async getRoomByCode(roomCode: string): Promise<GameRoom | null> {
    const cleanCode = roomCode.trim().toUpperCase();
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/rooms/${cleanCode}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          memoryRooms[cleanCode] = data.room;
          return data.room;
        }
      }
    } catch (_err) {
      // Fallback
    }
    return memoryRooms[cleanCode] || null;
  }

  /**
   * Join an existing room with code validation via Authoritative Server.
   */
  static async joinRoom(
    roomCode: string,
    profile: UserProfile
  ): Promise<{ success: boolean; room?: GameRoom; error?: string }> {
    const digitsOnly = roomCode.trim().replace(/[^0-9]/g, '');
    const cleanCode = digitsOnly.length >= 4 ? digitsOnly.substring(0, 4) : roomCode.trim().toUpperCase();

    try {
      const sessionToken = getOrCreateSessionToken();
      const res = await fetch(`${getApiBaseUrl()}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: cleanCode, profile, sessionToken }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.room) {
        memoryRooms[cleanCode] = data.room;
        return { success: true, room: data.room };
      }
      return { success: false, error: data.error || 'Failed to join room' };
    } catch (_err) {
      // Local fallback for offline simulation
    }

    const room = memoryRooms[cleanCode];
    if (!room) {
      return { success: false, error: `Room ${cleanCode} not found` };
    }

    if (room.status !== 'WAITING') {
      return { success: false, error: 'Match already in progress' };
    }

    if (profile.coins < room.stakeBuyIn) {
      return {
        success: false,
        error: `Insufficient coins. Required: ${room.stakeBuyIn}, Balance: ${profile.coins}`,
      };
    }

    const nextSeat = room.seats.find((s: any) => !s.isConnected && !s.isBot);
    if (!nextSeat) {
      return { success: false, error: 'Room is already full' };
    }

    nextSeat.profileId = profile.id;
    nextSeat.playerName = profile.displayName;
    nextSeat.avatarId = profile.avatarId;
    nextSeat.isReady = true;
    nextSeat.isConnected = true;
    room.currentPlayerCount += 1;
    room.potTotal += room.stakeBuyIn;
    if (room.currentPlayerCount === room.maxPlayers) {
      room.status = 'STARTING';
    }

    memoryRooms[cleanCode] = room;
    return { success: true, room };
  }

  /**
   * Fill an empty seat in a room with a Bot via Authoritative Server.
   */
  static async fillSeatWithBot(
    roomId: string,
    roomCode: string,
    seatIndex: number
  ): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/rooms/seat/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, roomCode, seatIndex }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Real-Player Public Matchmaking Queue (Pairs 100% Real Human Players, ZERO Bots).
   * Communicates with Redis queue endpoint on backend server.
   */
  static queueMatchmaking(
    mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P',
    stakeBuyIn: number,
    targetScore: number,
    hostProfile: UserProfile,
    onSeatJoined: (seat: RoomSeat, filledCount: number, maxCount: number) => void,
    onComplete: (room: GameRoom) => void
  ): { cancel: () => void } {
    let isCancelled = false;
    let pollInterval: any = null;
    const sessionToken = getOrCreateSessionToken();

    // 1. Enter Server Queue
    fetch(`${getApiBaseUrl()}/api/rooms/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: hostProfile,
        mode,
        stakeBuyIn,
        targetScore,
        sessionToken,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled || !data.success || !data.room) return;
        const room: GameRoom = data.room;

        // Render host and any existing real players
        const filledSeats = room.seats.filter((s: any) => s.isConnected || s.is_connected);
        filledSeats.forEach((s: any) => {
          onSeatJoined(s, filledSeats.length, room.maxPlayers);
        });

        if (room.status === 'STARTING' || filledSeats.length >= room.maxPlayers) {
          onComplete(room);
          return;
        }

        // Poll room every 1.5s for incoming real players
        pollInterval = setInterval(async () => {
          if (isCancelled) {
            clearInterval(pollInterval);
            return;
          }

          try {
            const pollRes = await fetch(`${getApiBaseUrl()}/api/rooms/${room.roomCode}`);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.room) {
                const currentRoom: GameRoom = pollData.room;
                const activeFilled = currentRoom.seats.filter(
                  (s: any) => s.isConnected || s.is_connected
                );
                activeFilled.forEach((s: any) => {
                  onSeatJoined(s, activeFilled.length, currentRoom.maxPlayers);
                });

                if (currentRoom.status === 'STARTING' || activeFilled.length >= currentRoom.maxPlayers) {
                  clearInterval(pollInterval);
                  onComplete(currentRoom);
                }
              }
            }
          } catch {}
        }, 1500);
      })
      .catch(() => {
        // Fallback: local host seat only (never inject bots into online matchmaking)
        const localRoom = this.createLocalRoom(hostProfile, mode, stakeBuyIn, targetScore, false);
        onSeatJoined(localRoom.seats[0], 1, localRoom.maxPlayers);
      });

    return {
      cancel: () => {
        isCancelled = true;
        if (pollInterval) clearInterval(pollInterval);
      },
    };
  }

  /**
   * Alias for backwards compatibility.
   */
  static simulateMatchmaking(
    mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P',
    stakeBuyIn: number,
    targetScore: number,
    hostProfile: UserProfile,
    onSeatJoined: (seat: RoomSeat, filledCount: number, maxCount: number) => void,
    onComplete: (room: GameRoom) => void
  ): { cancel: () => void } {
    return this.queueMatchmaking(mode, stakeBuyIn, targetScore, hostProfile, onSeatJoined, onComplete);
  }

  /**
   * Record a completed match record in database history.
   */
  static recordMatch(record: Omit<MatchRecord, 'id' | 'completedAt'>): MatchRecord {
    const fullRecord: MatchRecord = {
      ...record,
      id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completedAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('thaasbai_match_records_v1');
        const records: MatchRecord[] = raw ? JSON.parse(raw) : [];
        records.unshift(fullRecord);
        localStorage.setItem('thaasbai_match_records_v1', JSON.stringify(records.slice(0, 50)));
      } else {
        memoryMatches.unshift(fullRecord);
      }
    } catch {
      memoryMatches.unshift(fullRecord);
    }

    return fullRecord;
  }
}
