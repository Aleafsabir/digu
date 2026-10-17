/**
 * Database & Realtime Network Types
 * Matching PostgreSQL Schema (server/db/schema.sql)
 */

export type CurrencyTransactionType =
  | 'MATCH_BUY_IN'
  | 'MATCH_PAYOUT'
  | 'ROUND_WIN'
  | 'DAILY_BONUS'
  | 'STORE_PURCHASE'
  | 'REFUND';

export interface CurrencyTransaction {
  id: string;
  profileId: string;
  type: CurrencyTransactionType;
  currencyType: 'COINS' | 'GEMS';
  amount: number; // Negative for debits/buy-ins, positive for payouts/bonuses
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // Room code or Match ID
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type GameRoomStatus =
  | 'WAITING'
  | 'STARTING'
  | 'PLAYING'
  | 'COMPLETED'
  | 'ABANDONED';

export interface RoomSeat {
  roomId: string;
  seatIndex: number;
  profileId?: string;
  playerName: string;
  avatarId: string;
  teamId: 'TEAM_A' | 'TEAM_B' | null;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: string;
}

export interface GameRoom {
  id: string;
  roomCode: string; // e.g. 'THAAS-8842'
  mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P';
  stakeBuyIn: number;
  targetScore: number;
  status: GameRoomStatus;
  hostPlayerId?: string;
  maxPlayers: number;
  currentPlayerCount: number;
  potTotal: number;
  isPrivate: boolean;
  seats: RoomSeat[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecord {
  id: string;
  roomId?: string;
  mode: 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P';
  winningSeatOrTeam: string;
  potTotal: number;
  houseRake: number;
  totalRounds: number;
  durationSeconds: number;
  scores?: Record<string, unknown>;
  completedAt: string;
}

export interface BuyInTier {
  id: string;
  name: string;
  subtitle: string;
  buyIn: number;
  targetScore: number;
  badge: string;
  badgeColor: string;
  gradient: string;
  icon: string;
}

export const BUY_IN_TIERS: BuyInTier[] = [
  {
    id: 'novice',
    name: 'Novice Lounge',
    subtitle: 'Casual Table',
    buyIn: 250,
    targetScore: 500,
    badge: 'CASUAL',
    badgeColor: 'bg-emerald-400 text-slate-950',
    gradient: 'from-emerald-950/60 to-slate-900',
    icon: '🌱',
  },
  {
    id: 'heritage',
    name: 'Heritage Holhuashi',
    subtitle: 'Classic High Stakes',
    buyIn: 1000,
    targetScore: 1000,
    badge: 'POPULAR',
    badgeColor: 'bg-gradient-to-r from-[#05D59A] to-[#047857] text-[#02140D] font-black',
    gradient: 'from-[#031B11] to-[#010D08]',
    icon: '🌴',
  },
  {
    id: 'sultan',
    name: "Sultan's High-Roller",
    subtitle: 'Championship Table',
    buyIn: 5000,
    targetScore: 1000,
    badge: 'ELITE',
    badgeColor: 'bg-rose-500 text-white',
    gradient: 'from-rose-950/60 to-slate-900',
    icon: '👑',
  },
];
