import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../src/store/useAuthStore';
import { CloudSyncService } from '../../src/services/cloudSyncService';
import { UserProfile } from '../../src/types/auth';

// Mock localStorage for Node.js test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};
globalThis.localStorage = localStorageMock as any;

describe('Cloud Sync & Google Data Restoration', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.restoreAllMocks();
    useAuthStore.setState({
      profile: {
        id: 'guest_default',
        displayName: 'Guest Player',
        loginProvider: 'GUEST',
        coins: 10000,
        gems: 50,
        level: 1,
        xp: 0,
        xpNextLevel: 500,
        friendCode: 'HLH-00000',
        avatarId: 'holhuashi_boy',
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalGins: 0,
          thousandPointRuns: 0,
          totalPointsScored: 0,
          winStreak: 0,
          bestWinStreak: 0,
        },
        createdAt: new Date().toISOString(),
        lastSyncedAt: null,
        presenceStatus: 'IN_LOBBY',
        cloudSyncStatus: 'LOCAL_ONLY',
      },
      conflictData: null,
      isSyncing: false,
      isAuthModalOpen: false,
    });
  });

  it('merges profiles with smart chip combination and highest level/stats', () => {
    const cloud: UserProfile = {
      id: 'cloud_user_123',
      displayName: 'CloudMaster',
      email: 'master@gmail.com',
      loginProvider: 'GOOGLE',
      coins: 45000,
      gems: 150,
      level: 12,
      xp: 250,
      xpNextLevel: 1000,
      friendCode: 'HLH-11111',
      avatarId: 'sultan',
      stats: {
        gamesPlayed: 50,
        gamesWon: 35,
        totalGins: 20,
        bestWinStreak: 8,
        winStreak: 2,
        thousandPointRuns: 0,
        totalPointsScored: 12000,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: '2026-01-02T00:00:00.000Z',
      cloudSyncStatus: 'SYNCED',
    };

    const local: UserProfile = {
      id: 'guest_local_456',
      displayName: 'Guest Player',
      loginProvider: 'GUEST',
      coins: 15000,
      gems: 20,
      level: 4,
      xp: 80,
      xpNextLevel: 400,
      friendCode: 'HLH-22222',
      avatarId: 'holhuashi_boy',
      stats: {
        gamesPlayed: 10,
        gamesWon: 6,
        totalGins: 3,
        bestWinStreak: 4,
        winStreak: 1,
        thousandPointRuns: 0,
        totalPointsScored: 3500,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: null,
      cloudSyncStatus: 'LOCAL_ONLY',
    };

    const merged = CloudSyncService.mergeProfiles(cloud, local, true);

    // Sum of chips: 45,000 + 15,000 = 60,000
    expect(merged.coins).toBe(60000);
    // Gems: 150 + 20 = 170
    expect(merged.gems).toBe(170);
    // Highest level is kept: 12
    expect(merged.level).toBe(12);
    // Best stats: cloud had 35 wins / 50 played, bestWinStreak 8
    expect(merged.stats.bestWinStreak).toBe(8);
    expect(merged.stats.gamesPlayed).toBe(50);
    // Identity preserved
    expect(merged.displayName).toBe('CloudMaster');
    expect(merged.email).toBe('master@gmail.com');
  });

  it('detects conflict when signing into Google if local profile has significant progression', async () => {
    // Setup local guest profile with some played games
    const { loginAsGuest, loginWithGoogle } = useAuthStore.getState();
    loginAsGuest();
    useAuthStore.setState(prev => ({
      profile: {
        ...prev.profile,
        coins: 25000,
        stats: {
          ...prev.profile.stats,
          gamesPlayed: 15,
          gamesWon: 10,
        },
      },
    }));

    // Mock fetch for google-auth returning an existing cloud account
    const mockCloudProfile: UserProfile = {
      id: 'usr_google_real',
      googleId: 'google_sub_123',
      displayName: 'Ali Master',
      email: 'ali@gmail.com',
      loginProvider: 'GOOGLE',
      coins: 85000,
      gems: 200,
      level: 18,
      xp: 450,
      xpNextLevel: 1000,
      friendCode: 'HLH-99999',
      avatarId: 'sultan',
      stats: {
        gamesPlayed: 120,
        gamesWon: 85,
        totalGins: 45,
        bestWinStreak: 12,
        winStreak: 3,
        thousandPointRuns: 1,
        totalPointsScored: 24000,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: '2026-01-02T00:00:00.000Z',
      cloudSyncStatus: 'SYNCED',
    };

    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/profile/google-auth')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            exists: true,
            profile: mockCloudProfile,
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    });

    await loginWithGoogle('ali@gmail.com', 'Ali Master');

    const state = useAuthStore.getState();
    // Conflict modal should be triggered
    expect(state.conflictData).not.toBeNull();
    expect(state.conflictData?.cloud.email).toBe('ali@gmail.com');
    expect(state.conflictData?.local.coins).toBe(25000);
  });

  it('restores cloud profile directly when local profile has no significant progress', async () => {
    // Fresh guest profile (0 games played, base coins)
    const { loginAsGuest, loginWithGoogle } = useAuthStore.getState();
    loginAsGuest();

    const mockCloudProfile: UserProfile = {
      id: 'usr_google_real',
      googleId: 'google_sub_123',
      displayName: 'Island Champion',
      email: 'champ@gmail.com',
      loginProvider: 'GOOGLE',
      coins: 99000,
      gems: 500,
      level: 25,
      xp: 900,
      xpNextLevel: 1000,
      friendCode: 'HLH-77777',
      avatarId: 'sultan',
      stats: {
        gamesPlayed: 300,
        gamesWon: 210,
        totalGins: 110,
        bestWinStreak: 19,
        winStreak: 4,
        thousandPointRuns: 2,
        totalPointsScored: 45000,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: '2026-01-02T00:00:00.000Z',
      cloudSyncStatus: 'SYNCED',
    };

    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/profile/google-auth')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            exists: true,
            profile: mockCloudProfile,
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    });

    await loginWithGoogle('champ@gmail.com');

    const state = useAuthStore.getState();
    // Should NOT have conflict data
    expect(state.conflictData).toBeNull();
    // Profile should be restored from cloud!
    expect(state.profile.displayName).toBe('Island Champion');
    expect(state.profile.coins).toBe(99000);
    expect(state.profile.level).toBe(25);
    expect(state.profile.stats.totalGins).toBe(110);
  });

  it('resolves conflict with smart chip merge when chosen by player', async () => {
    const cloud: UserProfile = {
      id: 'cloud_1',
      displayName: 'CloudAli',
      email: 'ali@gmail.com',
      loginProvider: 'GOOGLE',
      coins: 50000,
      gems: 100,
      level: 10,
      xp: 100,
      xpNextLevel: 1000,
      friendCode: 'HLH-1',
      avatarId: 'sultan',
      stats: {
        gamesPlayed: 20,
        gamesWon: 15,
        totalGins: 10,
        bestWinStreak: 5,
        winStreak: 1,
        thousandPointRuns: 0,
        totalPointsScored: 8000,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: '2026-01-02T00:00:00.000Z',
      cloudSyncStatus: 'SYNCED',
    };

    const local: UserProfile = {
      id: 'local_1',
      displayName: 'LocalAli',
      loginProvider: 'GUEST',
      coins: 10000,
      gems: 50,
      level: 5,
      xp: 50,
      xpNextLevel: 500,
      friendCode: 'HLH-2',
      avatarId: 'holhuashi_boy',
      stats: {
        gamesPlayed: 5,
        gamesWon: 3,
        totalGins: 2,
        bestWinStreak: 2,
        winStreak: 0,
        thousandPointRuns: 0,
        totalPointsScored: 2000,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      lastSyncedAt: null,
      cloudSyncStatus: 'LOCAL_ONLY',
    };

    useAuthStore.setState({ conflictData: { cloud, local } });

    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/profile/resolve-conflict')) {
        const merged = CloudSyncService.mergeProfiles(cloud, local, true);
        return {
          ok: true,
          json: async () => ({
            success: true,
            profile: merged,
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    });

    await useAuthStore.getState().resolveConflict('cloud', true);

    const state = useAuthStore.getState();
    expect(state.conflictData).toBeNull();
    // Merged coins: 50,000 + 10,000 = 60,000
    expect(state.profile.coins).toBe(60000);
    expect(state.profile.gems).toBe(150);
    expect(state.profile.level).toBe(10);
  });
});
