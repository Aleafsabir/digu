import { create } from 'zustand';
import { UserProfile } from '../types/auth';
import { CloudSyncService, generateFriendCode } from '../services/cloudSyncService';
import { CurrencyTransaction } from '../types/database';
import { DatabaseService } from '../services/databaseService';
import { SocialService } from '../services/socialService';
import { Capacitor } from '@capacitor/core';

interface AuthStoreState {
  profile: UserProfile;
  transactions: CurrencyTransaction[];
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  conflictData: { cloud: UserProfile; local: UserProfile } | null;
  isSyncing: boolean;

  // Modals
  setAuthModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  setConflictData: (data: { cloud: UserProfile; local: UserProfile } | null) => void;
  resolveConflict: (choice: 'cloud' | 'local', mergeChips: boolean) => Promise<void>;

  // Profile modifications
  setDisplayName: (name: string) => void;
  setAvatar: (avatarId: string) => void;
  regenerateFriendCode: () => string;

  // Auth providers
  loginAsGuest: () => void;
  loginWithGoogle: (email?: string, name?: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  syncWithCloud: () => Promise<void>;

  // Economy & Progression
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  executeBuyIn: (amount: number, description: string, referenceId?: string) => boolean;
  awardPayout: (amount: number, description: string, referenceId?: string) => void;
  claimDailyBonus: () => { success: boolean; bonusAmount?: number; message?: string };
  refreshTransactions: () => void;
  addXP: (amount: number) => void;
  recordMatchResult: (result: {
    isWin: boolean;
    isGin: boolean;
    isThousandRun?: boolean;
    points: number;
    coinsWon?: number;
    referenceId?: string;
  }) => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  profile: CloudSyncService.loadProfile(),
  transactions: DatabaseService.getTransactions(),
  isAuthModalOpen: false,
  isProfileModalOpen: false,
  conflictData: null,
  isSyncing: false,

  setAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),
  setProfileModalOpen: (open: boolean) => set({ isProfileModalOpen: open }),
  setConflictData: (data: { cloud: UserProfile; local: UserProfile } | null) => set({ conflictData: data }),

  resolveConflict: async (choice: 'cloud' | 'local', mergeChips: boolean) => {
    const { conflictData } = get();
    if (!conflictData) return;
    set({ isSyncing: true });
    try {
      const resolved = await CloudSyncService.resolveConflict(
        choice,
        mergeChips,
        conflictData.cloud,
        conflictData.local
      );
      set({ profile: resolved, conflictData: null, isAuthModalOpen: false });
      SocialService.send('AUTH_INIT', {
        profileId: resolved.id,
        displayName: resolved.displayName,
        avatarId: resolved.avatarId,
        friendCode: resolved.friendCode,
        level: resolved.level,
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  setDisplayName: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = { ...get().profile, displayName: trimmed };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
    CloudSyncService.syncToCloud(updated).catch(() => {});
  },

  setAvatar: (avatarId: string) => {
    const updated = { ...get().profile, avatarId };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
    CloudSyncService.syncToCloud(updated).catch(() => {});
  },

  regenerateFriendCode: () => {
    const newCode = generateFriendCode();
    const updated = { ...get().profile, friendCode: newCode };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
    CloudSyncService.syncToCloud(updated).catch(() => {});
    SocialService.send('AUTH_INIT', {
      profileId: updated.id,
      displayName: updated.displayName,
      avatarId: updated.avatarId,
      friendCode: updated.friendCode,
      level: updated.level,
    });
    return newCode;
  },

  loginAsGuest: () => {
    set({ isAuthModalOpen: false });
  },

  loginWithGoogle: async (email?: string, name?: string) => {
    set({ isSyncing: true });
    try {
      let resolvedEmail = email;
      let resolvedName = name;
      let photoUrl: string | undefined;
      let googleId: string | undefined;
      let idToken: string | undefined;

      // On native mobile (Android / iOS), invoke Google Play Services One-Tap sign-in
      if (Capacitor.isNativePlatform()) {
        try {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
          const res = await FirebaseAuthentication.signInWithGoogle();
          if (res?.user) {
            resolvedEmail = res.user.email || resolvedEmail;
            resolvedName = res.user.displayName || resolvedName;
            photoUrl = res.user.photoUrl || undefined;
            googleId = res.user.uid;
            idToken = (res as any).credential?.idToken;
          }
        } catch (nativeErr: any) {
          console.warn('[Auth] Native Google Sign-In error:', nativeErr);
          // If user cancelled the picker dialog, do not proceed with fallback
          if (
            nativeErr?.message?.includes('cancel') ||
            nativeErr?.code === 'SIGN_IN_CANCELLED' ||
            nativeErr?.message?.includes('12501')
          ) {
            return;
          }
        }
      }

      const currentLocal = get().profile;
      const authRes = await CloudSyncService.googleAuth(
        {
          idToken,
          googleId,
          email: resolvedEmail || 'player@gmail.com',
          displayName: resolvedName,
          avatarUrl: photoUrl,
        },
        currentLocal
      );

      if (authRes.exists) {
        // Check if there is an active local guest session with progress to compare
        const isFreshGuest =
          currentLocal.loginProvider === 'GUEST' &&
          (currentLocal.stats?.gamesPlayed || 0) === 0 &&
          currentLocal.coins === 10000;

        if (
          !isFreshGuest &&
          (authRes.profile.coins !== currentLocal.coins ||
            authRes.profile.level !== currentLocal.level ||
            (authRes.profile.stats?.gamesPlayed || 0) !== (currentLocal.stats?.gamesPlayed || 0))
        ) {
          // Significant conflict: present interactive choice modal
          set({
            conflictData: { cloud: authRes.profile, local: currentLocal },
            isAuthModalOpen: false,
          });
          return;
        }

        // Direct restore: restore cloud profile immediately
        CloudSyncService.saveProfileLocally(authRes.profile);
        set({ profile: authRes.profile, isAuthModalOpen: false });
        SocialService.send('AUTH_INIT', {
          profileId: authRes.profile.id,
          displayName: authRes.profile.displayName,
          avatarId: authRes.profile.avatarId,
          friendCode: authRes.profile.friendCode,
          level: authRes.profile.level,
        });
        return;
      }

      // New cloud profile registered
      CloudSyncService.saveProfileLocally(authRes.profile);
      set({ profile: authRes.profile, isAuthModalOpen: false });
      SocialService.send('AUTH_INIT', {
        profileId: authRes.profile.id,
        displayName: authRes.profile.displayName,
        avatarId: authRes.profile.avatarId,
        friendCode: authRes.profile.friendCode,
        level: authRes.profile.level,
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  loginWithPhone: async (phone: string) => {
    set({ isSyncing: true });
    try {
      const updated = await CloudSyncService.linkCloudAccount(
        get().profile,
        'PHONE',
        {
          phone: `+960 ${phone}`,
        }
      );
      set({ profile: updated, isAuthModalOpen: false });
    } finally {
      set({ isSyncing: false });
    }
  },

  loginWithApple: async () => {
    set({ isSyncing: true });
    try {
      let email: string | undefined;
      let displayName: string | undefined;

      if (Capacitor.isNativePlatform()) {
        try {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
          const res = await FirebaseAuthentication.signInWithApple();
          if (res?.user) {
            email = res.user.email || undefined;
            displayName = res.user.displayName || undefined;
          }
        } catch (nativeErr: any) {
          console.warn('[Auth] Native Apple Sign-In error:', nativeErr);
          if (
            nativeErr?.message?.includes('cancel') ||
            nativeErr?.code === 'SIGN_IN_CANCELLED' ||
            nativeErr?.message?.includes('1001')
          ) {
            return;
          }
        }
      }

      const updated = await CloudSyncService.linkCloudAccount(
        get().profile,
        'APPLE',
        {
          email: email || 'player.apple@privaterelay.appleid.com',
          displayName,
        }
      );
      set({ profile: updated, isAuthModalOpen: false });
    } finally {
      set({ isSyncing: false });
    }
  },

  syncWithCloud: async () => {
    set({ isSyncing: true });
    try {
      await CloudSyncService.syncToCloud(get().profile);
      set({
        profile: {
          ...get().profile,
          cloudSyncStatus: 'SYNCED',
          lastSyncedAt: new Date().toISOString(),
        },
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  addCoins: (amount: number) => {
    if (amount <= 0) return;
    const p = get().profile;
    const balanceBefore = p.coins;
    const balanceAfter = balanceBefore + amount;
    const updated = { ...p, coins: balanceAfter };
    CloudSyncService.saveProfileLocally(updated);
    DatabaseService.recordTransaction({
      profileId: p.id,
      type: 'DAILY_BONUS',
      currencyType: 'COINS',
      amount,
      balanceBefore,
      balanceAfter,
      description: `Added ${amount.toLocaleString()} coins`,
    });
    set({ profile: updated, transactions: DatabaseService.getTransactions() });
    CloudSyncService.syncToCloud(updated).catch(() => {});
  },

  spendCoins: (amount: number) => {
    if (amount <= 0) return true;
    const p = get().profile;
    if (p.coins < amount) return false;
    const balanceBefore = p.coins;
    const balanceAfter = balanceBefore - amount;
    const updated = { ...p, coins: balanceAfter };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
    CloudSyncService.syncToCloud(updated).catch(() => {});
    return true;
  },

  executeBuyIn: (amount: number, description: string, referenceId?: string): boolean => {
    if (amount <= 0) return true;
    const p = get().profile;
    if (p.coins < amount) return false;
    const balanceBefore = p.coins;
    const balanceAfter = balanceBefore - amount;
    const updated = { ...p, coins: balanceAfter };
    CloudSyncService.saveProfileLocally(updated);

    DatabaseService.recordTransaction({
      profileId: p.id,
      type: 'MATCH_BUY_IN',
      currencyType: 'COINS',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      referenceId,
      description,
    });

    set({ profile: updated, transactions: DatabaseService.getTransactions() });
    CloudSyncService.syncToCloud(updated).catch(() => {});
    return true;
  },

  awardPayout: (amount: number, description: string, referenceId?: string) => {
    if (amount <= 0) return;
    const p = get().profile;
    const balanceBefore = p.coins;
    const balanceAfter = balanceBefore + amount;
    const updated = { ...p, coins: balanceAfter };
    CloudSyncService.saveProfileLocally(updated);

    DatabaseService.recordTransaction({
      profileId: p.id,
      type: 'MATCH_PAYOUT',
      currencyType: 'COINS',
      amount,
      balanceBefore,
      balanceAfter,
      referenceId,
      description,
    });

    set({ profile: updated, transactions: DatabaseService.getTransactions() });
    CloudSyncService.syncToCloud(updated).catch(() => {});
  },

  claimDailyBonus: (): { success: boolean; bonusAmount?: number; message?: string } => {
    const p = get().profile;
    const now = new Date();
    if (p.lastDailyBonusAt) {
      const last = new Date(p.lastDailyBonusAt);
      const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        return {
          success: false,
          message: `Daily reward available in ${remainingHours}h`,
        };
      }
    }

    const bonusAmount = 1000;
    const balanceBefore = p.coins;
    const balanceAfter = balanceBefore + bonusAmount;
    const updated: UserProfile = {
      ...p,
      coins: balanceAfter,
      lastDailyBonusAt: now.toISOString(),
    };

    CloudSyncService.saveProfileLocally(updated);

    DatabaseService.recordTransaction({
      profileId: p.id,
      type: 'DAILY_BONUS',
      currencyType: 'COINS',
      amount: bonusAmount,
      balanceBefore,
      balanceAfter,
      referenceId: `DAILY_${now.toISOString().split('T')[0]}`,
      description: `Claimed Daily Reward (+${bonusAmount.toLocaleString()} Coins)`,
    });

    set({ profile: updated, transactions: DatabaseService.getTransactions() });
    CloudSyncService.syncToCloud(updated).catch(() => {});
    return { success: true, bonusAmount, message: `Received +${bonusAmount} free coins!` };
  },

  refreshTransactions: () => {
    set({ transactions: DatabaseService.getTransactions() });
  },

  addXP: (amount: number) => {
    if (amount <= 0) return;
    let { level, xp, xpNextLevel } = get().profile;
    xp += amount;
    while (xp >= xpNextLevel) {
      xp -= xpNextLevel;
      level += 1;
      xpNextLevel = Math.round(xpNextLevel * 1.4); // progressive level curve
    }
    const updated = { ...get().profile, level, xp, xpNextLevel };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
    CloudSyncService.syncToCloud(updated).catch(() => {});
  },

  recordMatchResult: ({ isWin, isGin, isThousandRun, points, coinsWon, referenceId }) => {
    const p = get().profile;
    const existing = p?.stats;
    const currentStreak = isWin ? (existing?.winStreak || 0) + 1 : 0;
    const bestStreak = Math.max(existing?.bestWinStreak || 0, currentStreak);

    const stats = {
      gamesPlayed: (existing?.gamesPlayed || 0) + 1,
      gamesWon: (existing?.gamesWon || 0) + (isWin ? 1 : 0),
      winStreak: currentStreak,
      bestWinStreak: bestStreak,
      totalGins: (existing?.totalGins || 0) + (isGin ? 1 : 0),
      thousandPointRuns: (existing?.thousandPointRuns || 0) + (isThousandRun ? 1 : 0),
      totalPointsScored: (existing?.totalPointsScored || 0) + Math.max(0, points || 0),
    };

    let newCoins = p?.coins ?? 10000;
    const payout = coinsWon !== undefined ? coinsWon : (isWin ? 250 : 0);
    if (payout > 0) {
      newCoins += payout;
      DatabaseService.recordTransaction({
        profileId: p?.id || 'guest',
        type: isWin ? 'MATCH_PAYOUT' : 'ROUND_WIN',
        currencyType: 'COINS',
        amount: payout,
        balanceBefore: p?.coins ?? 10000,
        balanceAfter: newCoins,
        referenceId,
        description: isWin ? `Match Victory (+${payout.toLocaleString()} coins)` : `Round Bonus (+${payout.toLocaleString()} coins)`,
      });
    }

    // Award XP
    let xpGain = isWin ? 150 : 50;
    if (isGin) xpGain += 100;

    let level = p?.level || 1;
    let xp = (p?.xp || 0) + xpGain;
    let xpNextLevel = p?.xpNextLevel || 500;
    while (xp >= xpNextLevel) {
      xp -= xpNextLevel;
      level += 1;
      xpNextLevel = Math.round(xpNextLevel * 1.4);
    }

    const updated: UserProfile = {
      ...p,
      coins: newCoins,
      level,
      xp,
      xpNextLevel,
      stats,
    };

    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated, transactions: DatabaseService.getTransactions() });
    CloudSyncService.syncToCloud(updated).catch(() => {});
  },
}));
