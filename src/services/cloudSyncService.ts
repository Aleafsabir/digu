/**
 * CloudSyncService:
 * Local-First storage with Cloud Backend Sync Adapter.
 * 
 * - Persists profile locally for instant offline/guest play.
 * - Syncs to cloud backend (Supabase / Firebase / REST) upon authentication.
 */
import { UserProfile } from '../types/auth';

const STORAGE_KEY = 'thaasbai_player_profile_v1';

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
   * When a backend (Supabase / Firebase / REST) is configured, this pushes local changes to the cloud.
   */
  static async syncToCloud(profile: UserProfile): Promise<{ success: boolean; syncedAt: string }> {
    // Simulated cloud handshake / latency
    await new Promise(resolve => setTimeout(resolve, 600));

    // In a live environment with Supabase/Firebase credentials:
    // const { data, error } = await supabase.from('profiles').upsert(profile);
    const syncedAt = new Date().toISOString();
    const updated = {
      ...profile,
      cloudSyncStatus: 'SYNCED' as const,
      lastSyncedAt: syncedAt,
    };
    this.saveProfileLocally(updated);
    return { success: true, syncedAt };
  }

  /**
   * Link cloud account:
   * Upgrades a guest profile to a verified Google/Phone account, preserving all coins and stats.
   */
  static async linkCloudAccount(
    currentProfile: UserProfile,
    provider: 'GOOGLE' | 'APPLE' | 'PHONE',
    credentials: { email?: string; phone?: string; displayName?: string; avatarUrl?: string }
  ): Promise<UserProfile> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const friendCode =
      currentProfile.friendCode &&
      currentProfile.friendCode !== 'DIGU-7482' &&
      currentProfile.friendCode !== 'DIGU-GUES' &&
      currentProfile.friendCode !== 'HLH-7482'
        ? currentProfile.friendCode
        : generateFriendCode();

    const updated: UserProfile = {
      ...currentProfile,
      loginProvider: provider,
      friendCode,
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
