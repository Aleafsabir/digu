export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string; // e.g., "S-01" (Ace of Spades), "D-13" (King of Diamonds)
  suit: Suit;
  rank: Rank;
  isFaceDown?: boolean;
}

export type PlayType = 'VS_AI' | 'ONLINE';

export type AppScreen =
  | 'LAUNCH'
  | 'ACCOUNT_GATEWAY'
  | 'MAIN_LOBBY'
  | 'MODE_SELECT'
  | 'PLAY_TYPE_SELECT'
  | 'RULES_CONFIRM'
  | 'ONLINE_LOBBY'
  | 'TABLE';

export type GamePhase =
  | 'SCATTER_CUT'
  | 'ROUND_DEALING'
  | 'AWAIT_DRAW'
  | 'AWAIT_ACTION'
  | 'ROUND_RESOLVING'
  | 'MATCH_OVER';

export interface TableRules {
  mode: 'SOLO_2P' | 'SOLO_4P' | 'TEAM_4P';
  dealOption: 'DEAL_11_CARDS' | 'DRAW_FIRST_CARD';
  targetScore: number;         // e.g. 500, 1000, 1500
  turnTimeoutSeconds: number;  // Default: 30s
  playType?: PlayType;         // VS_AI (default) or ONLINE
  buyIn?: number;              // Table stake buy-in (e.g. 250, 1000, 5000)
  roomCode?: string;           // Optional room code (e.g. 'THAAS-8842')
}

export interface PlayerState {
  id: string;
  name: string;
  seatIndex: number;
  teamId: 'TEAM_A' | 'TEAM_B' | null;
  hand: Card[];
  handCount: number;
  cumulativeScore: number;
  consecutiveGins: number;
  scatterCard: Card | null;
  isConnected: boolean;
  isAI: boolean;
}

export interface GameState {
  roomId: string;
  rules: TableRules;
  phase: GamePhase;
  players: PlayerState[];
  dealerIndex: number;
  activePlayerIndex: number;
  stockPile: Card[];
  discardPile: Card[];
  finishSlotCard: Card | null; // Smashed face-down 11th card
  lastRoundWinnerId: string | null;
}

export type MeldType = 'SET' | 'RUN' | 'THOUSAND_POINT_RUN';

export interface MeldValidationResult {
  isValid: boolean;
  type?: MeldType;
  points: number;
  error?: string;
}

export interface PlayerRoundScore {
  playerId: string;
  name: string;
  seatIndex: number;
  teamId: 'TEAM_A' | 'TEAM_B' | null;
  melds: Card[][];
  deadwood: Card[];
  isWinner: boolean;
  hasGin: boolean;
  hasThousandPointRun: boolean;
  hasZeroMelds: boolean;
  meldScore: number;
  deadwoodDebt: number; // Negative or 0
  ginBonus: number;     // e.g. +100
  specialBonus: number; // e.g. +1000 for thousand-point run
  zeroMeldPenalty: number; // -100 if applicable
  consecutiveGinPenalty: number; // -100 if applicable to feeder
  netRoundScore: number;
  previousCumulativeScore: number;
  newCumulativeScore: number;
}

export interface TeamRoundScore {
  teamId: 'TEAM_A' | 'TEAM_B';
  playerIds: string[];
  melds: Card[][];
  deadwood: Card[];
  isWinner: boolean;
  hasGin: boolean;
  hasZeroMelds: boolean;
  meldScore: number;
  debtScore: number;
  ginBonus: number;
  zeroMeldPenalty: number;
  consecutiveGinPenalty?: number;
  netRoundScore: number;
  previousCumulativeScore: number;
  newCumulativeScore: number;
}

export interface RoundResolution {
  winnerPlayerId: string;
  winningTeamId: 'TEAM_A' | 'TEAM_B' | null;
  isThousandPointRun: boolean;
  finishCard: Card | null;
  playerScores: PlayerRoundScore[];
  teamScores?: TeamRoundScore[];
  matchOver: boolean;
  matchWinnerId?: string; // Player ID or 'TEAM_A'/'TEAM_B'
}
