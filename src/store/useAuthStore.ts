import { create } from 'zustand';
import { UserProfile } from '../types/auth';
import { CloudSyncService } from '../services/cloudSyncService';
import { CurrencyTransaction } from '../types/database';
import { DatabaseService } from '../services/databaseService';
import { SocialService } from '../services/socialService';
import { Capacitor } from '@capacitor/core';

interface AuthStoreState {
  profile: UserProfile;
  transactions: CurrencyTransaction[];
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  isSyncing: boolean;

  // Modals
  setAuthModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;

  // Profile modifications
  setDisplayName: (name: string) => void;
  setAvatar: (avatarId: string) => void;

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
  isSyncing: false,

  setAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),
  setProfileModalOpen: (open: boolean) => set({ isProfileModalOpen: open }),

  setDisplayName: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = { ...get().profile, displayName: trimmed };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
  },

  setAvatar: (avatarId: string) => {
    const updated = { ...get().profile, avatarId };
    CloudSyncService.saveProfileLocally(updated);
    set({ profile: updated });
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

      // On native mobile (Android / iOS), invoke Google Play Services One-Tap sign-in
      if (Capacitor.isNativePlatform()) {
        try {
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
          const res = await FirebaseAuthentication.signInWithGoogle();
          if (res?.user) {
            resolvedEmail = res.user.email || resolvedEmail;
            resolvedName = res.user.displayName || resolvedName;
            photoUrl = res.user.photoUrl || undefined;
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

      const updated = await CloudSyncService.linkCloudAccount(
        get().profile,
        'GOOGLE',
        {
          email: resolvedEmail || 'player@gmail.com',
          displayName: resolvedName || get().profile.displayName,
          avatarUrl: photoUrl,
        }
      );
      set({ profile: updated, isAuthModalOpen: false });
      SocialService.send('AUTH_INIT', {
        profileId: updated.id,
        displayName: updated.displayName,
        avatarId: updated.avatarId,
        friendCode: updated.friendCode,
        level: updated.level,
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
      const updated = await CloudSyncService.linkCloudAccount(
        get().profile,
        'APPLE',
        {
          email: 'apple.user@privaterelay.appleid.com',
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
  },
}));
