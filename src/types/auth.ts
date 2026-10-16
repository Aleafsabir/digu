/**
 * Authentication & Player Profile Types
 */

export type LoginProvider = 'GUEST' | 'GOOGLE' | 'APPLE' | 'PHONE';

export type CloudSyncStatus = 'LOCAL_ONLY' | 'SYNCING' | 'SYNCED' | 'ERROR';

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  bestWinStreak: number;
  totalGins: number;
  thousandPointRuns: number;
  totalPointsScored: number;
}

export interface AvatarPreset {
  id: string;
  name: string;
  title: string;
  icon: string; // Emoji or badge
  gradient: string;
  borderColor: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'sultan',
    name: 'Sultan',
    title: 'The Royal Ruler',
    icon: '👑',
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    borderColor: 'border-slate-500',
  },
  {
    id: 'boduthakurufaanu',
    name: 'Bodu Thakurufaanu',
    title: 'National Defender',
    icon: '🛡️',
    gradient: 'from-rose-700 to-slate-900',
    borderColor: 'border-rose-500',
  },
  {
    id: 'dheveli',
    name: 'Dheveli Player',
    title: 'Card Shark',
    icon: '♠️',
    gradient: 'from-sky-600 to-indigo-900',
    borderColor: 'border-sky-400',
  },
  {
    id: 'fisher',
    name: 'Keyolhu Fisher',
    title: 'Ocean Master',
    icon: '⚓',
    gradient: 'from-teal-600 to-cyan-900',
    borderColor: 'border-teal-400',
  },
  {
    id: 'queen',
    name: 'Rehendhi Queen',
    title: 'Island Royalty',
    icon: '💎',
    gradient: 'from-rose-500 to-pink-800',
    borderColor: 'border-rose-400',
  },
  {
    id: 'raivaru',
    name: 'Raivaru Singer',
    title: 'Cultural Bard',
    icon: '🪕',
    gradient: 'from-emerald-600 to-green-900',
    borderColor: 'border-emerald-400',
  },
  {
    id: 'holhuashi',
    name: 'Holhuashi Chief',
    title: 'Table Veteran',
    icon: '🌴',
    gradient: 'from-emerald-800 to-slate-900',
    borderColor: 'border-emerald-500',
  },
  {
    id: 'falhumathi',
    name: 'Falhumathi',
    title: 'Swift Competitor',
    icon: '🔥',
    gradient: 'from-purple-600 to-indigo-950',
    borderColor: 'border-purple-400',
  },
];

export interface UserProfile {
  id: string;
  displayName: string;
  avatarId: string;
  loginProvider: LoginProvider;
  phone?: string;
  email?: string;
  coins: number;
  gems: number;
  level: number;
  xp: number;
  xpNextLevel: number;
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  lastDailyBonusAt?: string | null;
  stats: PlayerStats;
  createdAt: string;
}
