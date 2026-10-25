/**
 * CloudSyncService:
 * Local-First storage with Cloud Backend Sync Adapter.
 * 
 * - Persists profile locally for instant offline/guest play.
 * - Syncs to cloud backend (Supabase / Firebase / REST) upon authentication.
 */
import { UserProfile } from '../types/auth';
import { getBackendBaseUrl } from '../config/networkConfig';

const STORAGE_KEY = 'thaasbai_player_profile_v1';
const PENDING_SYNC_KEY = 'thaasbai_pending_sync_v1';

/**
 * Generate a unique 5-digit Holhuashi Friend Code (e.g. HLH-49201)
 */
export function generateFriendCode(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `HLH-${digits}`;
}

export function createGuestProfile(): UserProfile {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const guestNumber = Math.floor(1000 + Math.random() * 9000);
  return {
    id: `guest_${randomSuffix}_${Date.now().toString(36)}`,
    displayName: `Player ${guestNumber}`,
    avatarId: 'sultan',
    loginProvider: 'GUEST',
    coins: 10000, // 10,000 free starting chips
    gems: 50,     // 50 starting gems
    level: 1,
    xp: 0,
    xpNextLevel: 500,
    cloudSyncStatus: 'LOCAL_ONLY',
    friendCode: generateFriendCode(),
    presenceStatus: 'IN_LOBBY',
    lastSyncedAt: null,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      winStreak: 0,
      bestWinStreak: 0,
      totalGins: 0,
      thousandPointRuns: 0,
      totalPointsScored: 0,
    },
    createdAt: new Date().toISOString(),
  };
}

export const DEFAULT_GUEST_PROFILE: UserProfile = createGuestProfile();

export class CloudSyncService {
  /**
   * Load profile from local storage, falling back to default guest profile.
   * Automatically migrates legacy shared/static friend codes (e.g. DIGU-7482) to unique codes.
   */
  static loadProfile(): UserProfile {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Auto-migrate if friend code is missing, empty, or the old hardcoded 'DIGU-7482'
          const isLegacySharedCode =
            !parsed.friendCode ||
            parsed.friendCode === 'DIGU-7482' ||
            parsed.friendCode === 'DIGU-GUES' ||
            parsed.friendCode === 'HLH-7482';

          const friendCode = isLegacySharedCode ? generateFriendCode() : parsed.friendCode;

          const profile: UserProfile = {
            ...createGuestProfile(),
            ...parsed,
            friendCode,
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              winStreak: 0,
              bestWinStreak: 0,
              totalGins: 0,
              thousandPointRuns: 0,
              totalPointsScored: 0,
              ...(parsed.stats || {}),
            },
          };

          // If the profile had the legacy hardcoded code, persist the new unique code immediately
          if (isLegacySharedCode) {
            CloudSyncService.saveProfileLocally(profile);
          }

          return profile;
        }
      }
    } catch {
      // Fallback cleanly without stderr spam in test environment
    }
    const freshProfile = createGuestProfile();
    CloudSyncService.saveProfileLocally(freshProfile);
    return freshProfile;
  }

  /**
   * Save profile to local storage.
   */
  static saveProfileLocally(profile: UserProfile): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      }
    } catch {
      // Fail silent in non-DOM/test environments
    }
  }

  /**
   * Cloud sync adapter:
   * Flushes local progression and economy changes to the PostgreSQL backend.
   * If network is unreachable, queues the payload in localStorage for automatic retry.
   */
  static async syncToCloud(profile: UserProfile): Promise<{ success: boolean; syncedAt: string }> {
    const syncedAt = new Date().toISOString();

    // Guest profiles stay local-only
    if (profile.loginProvider === 'GUEST') {
      const updated = {
        ...profile,
        cloudSyncStatus: 'LOCAL_ONLY' as const,
        lastSyncedAt: syncedAt,
      };
      this.saveProfileLocally(updated);
      return { success: true, syncedAt };
    }

    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/profile/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (res.ok) {
        // Clear pending sync queue on success
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.removeItem(PENDING_SYNC_KEY);
        }

        const updated = {
          ...profile,
          cloudSyncStatus: 'SYNCED' as const,
          lastSyncedAt: syncedAt,
        };
        this.saveProfileLocally(updated);
        return { success: true, syncedAt };
      }
    } catch (netErr) {
      // Offline / network failure: queue pending sync
      console.warn('[CloudSync] Network sync failed, queueing offline payload:', netErr);
    }

    // Queue offline sync
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(profile));
      }
    } catch {}

    const updated = {
      ...profile,
      cloudSyncStatus: 'LOCAL_ONLY' as const,
      lastSyncedAt: syncedAt,
    };
    this.saveProfileLocally(updated);
    return { success: false, syncedAt };
  }

  /**
   * Flushes any queued offline sync payload if connectivity is restored.
   */
  static async flushPendingSync(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(PENDING_SYNC_KEY);
        if (raw) {
          const queuedProfile = JSON.parse(raw);
          const baseUrl = getBackendBaseUrl();
          const res = await fetch(`${baseUrl}/api/profile/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: queuedProfile }),
          });
          if (res.ok) {
            localStorage.removeItem(PENDING_SYNC_KEY);
          }
        }
      }
    } catch {}
  }

  /**
   * Authenticates with Google against the PostgreSQL backend.
   * Checks if a cloud profile exists for this Google user and returns it.
   */
  static async googleAuth(
    credentials: {
      idToken?: string;
      googleId?: string;
      email: string;
      displayName?: string;
      avatarUrl?: string;
    },
    localProfile: UserProfile
  ): Promise<{ exists: boolean; profile: UserProfile }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/profile/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credentials,
          localProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          return {
            exists: !!data.exists,
            profile: data.profile,
          };
        }
      }
    } catch (err) {
      console.warn('[CloudSync] Server google-auth failed, using local fallback:', err);
    }

    // Offline / fallback response
    const friendCode =
      localProfile.friendCode &&
      localProfile.friendCode !== 'DIGU-7482' &&
      localProfile.friendCode !== 'DIGU-GUES' &&
      localProfile.friendCode !== 'HLH-7482'
        ? localProfile.friendCode
        : generateFriendCode();

    const fallbackProfile: UserProfile = {
      ...localProfile,
      loginProvider: 'GOOGLE',
      googleId: credentials.googleId,
      email: credentials.email,
      displayName: credentials.displayName || localProfile.displayName,
      avatarUrl: credentials.avatarUrl || localProfile.avatarUrl,
      friendCode,
      cloudSyncStatus: 'LOCAL_ONLY',
      lastSyncedAt: new Date().toISOString(),
    };

    return {
      exists: false,
      profile: fallbackProfile,
    };
  }

  /**
   * Intelligently merges a cloud profile with a local guest profile.
   * Keeps highest levels, stats, and combines coins & gems.
   */
  static mergeProfiles(
    cloudProfile: UserProfile,
    localProfile: UserProfile,
    combineChips: boolean = true
  ): UserProfile {
    const finalProfile: UserProfile = { ...cloudProfile };

    if (combineChips) {
      finalProfile.coins = Number(cloudProfile.coins || 0) + Number(localProfile.coins || 0);
      finalProfile.gems = Number(cloudProfile.gems || 0) + Number(localProfile.gems || 0);
    }

    finalProfile.level = Math.max(Number(cloudProfile.level) || 1, Number(localProfile.level) || 1);
    finalProfile.xp = Math.max(Number(cloudProfile.xp) || 0, Number(localProfile.xp) || 0);
    finalProfile.xpNextLevel = Math.max(
      Number(cloudProfile.xpNextLevel) || 500,
      Number(localProfile.xpNextLevel) || 500
    );

    const cloudStats = cloudProfile.stats || {
      gamesPlayed: 0,
      gamesWon: 0,
      totalGins: 0,
      bestWinStreak: 0,
      winStreak: 0,
      thousandPointRuns: 0,
      totalPointsScored: 0,
    };
    const localStats = localProfile.stats || {
      gamesPlayed: 0,
      gamesWon: 0,
      totalGins: 0,
      bestWinStreak: 0,
      winStreak: 0,
      thousandPointRuns: 0,
      totalPointsScored: 0,
    };

    finalProfile.stats = {
      ...cloudStats,
      gamesPlayed: Math.max(cloudStats.gamesPlayed || 0, localStats.gamesPlayed || 0),
      gamesWon: Math.max(cloudStats.gamesWon || 0, localStats.gamesWon || 0),
      totalGins: Math.max(cloudStats.totalGins || 0, localStats.totalGins || 0),
      bestWinStreak: Math.max(cloudStats.bestWinStreak || 0, localStats.bestWinStreak || 0),
    };

    finalProfile.loginProvider = 'GOOGLE';
    finalProfile.cloudSyncStatus = 'SYNCED';
    return finalProfile;
  }

  /**
   * Resolves a save conflict between Cloud Profile and Local Profile.
   */
  static async resolveConflict(
    choice: 'cloud' | 'local',
    mergeChips: boolean,
    cloudProfile: UserProfile,
    localProfile: UserProfile
  ): Promise<UserProfile> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/profile/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice,
          mergeChips,
          cloudProfile,
          localProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          this.saveProfileLocally(data.profile);
          return data.profile;
        }
      }
    } catch (err) {
      console.warn('[CloudSync] Server resolve-conflict failed, resolving locally:', err);
    }

    // Local resolution fallback
    let finalProfile: UserProfile;
    if (choice === 'cloud') {
      if (mergeChips) {
        finalProfile = this.mergeProfiles(cloudProfile, localProfile, true);
      } else {
        finalProfile = { ...cloudProfile };
      }
    } else {
      finalProfile = {
        ...localProfile,
        loginProvider: 'GOOGLE',
        googleId: cloudProfile.googleId || localProfile.googleId,
        email: cloudProfile.email || localProfile.email,
      };
    }

    finalProfile.cloudSyncStatus = 'SYNCED';
    finalProfile.lastSyncedAt = new Date().toISOString();
    this.saveProfileLocally(finalProfile);
    return finalProfile;
  }

  /**
   * Legacy Link Cloud Account compatibility helper.
   */
  static async linkCloudAccount(
    currentProfile: UserProfile,
    provider: 'GOOGLE' | 'APPLE' | 'PHONE',
    credentials: { email?: string; phone?: string; displayName?: string; avatarUrl?: string; googleId?: string }
  ): Promise<UserProfile> {
    if (provider === 'GOOGLE' && credentials.email) {
      const authRes = await this.googleAuth(
        {
          email: credentials.email,
          googleId: credentials.googleId,
          displayName: credentials.displayName,
          avatarUrl: credentials.avatarUrl,
        },
        currentProfile
      );
      this.saveProfileLocally(authRes.profile);
      return authRes.profile;
    }

    const updated: UserProfile = {
      ...currentProfile,
      loginProvider: provider,
      googleId: credentials.googleId || currentProfile.googleId,
      email: credentials.email || currentProfile.email,
      phone: credentials.phone || currentProfile.phone,
      displayName: credentials.displayName || currentProfile.displayName,
      avatarUrl: credentials.avatarUrl || currentProfile.avatarUrl,
      cloudSyncStatus: 'SYNCED',
      lastSyncedAt: new Date().toISOString(),
    };

    this.saveProfileLocally(updated);
    return updated;
  }
}
