import { Card, Suit } from '../models/types';

export type DhihaehVariant = 'DYNAMIC_CUT' | 'BLIND_RESERVE';

export interface DhihaehTrickCard {
  card: Card;
  playedBySeat: number;
}

export interface DhihaehTrick {
  trickNumber: number; // 1 to 13
  leadSuit: Suit | null;
  cards: DhihaehTrickCard[];
  winnerSeat: number | null;
}

export interface DhihaehPlayer {
  id: string;
  name: string;
  seatIndex: number; // 0: South (Human), 1: East, 2: North (Partner), 3: West
  teamId: 'TEAM_1' | 'TEAM_2'; // Team 1: 0 & 2 (Partners), Team 2: 1 & 3
  isAI: boolean;
  hand: Card[];
  capturedTens: Card[]; // 10s won in tricks
  tricksWon: number;
  blindReserveCard?: Card | null; // For Variant B: isolated face-down card
}

export interface DhihaehScore {
  team1Score: number;
  team2Score: number;
  team1Tens: number;
  team2Tens: number;
  team1Tricks: number;
  team2Tricks: number;
  outcomeType: 'HAASBAGGA' | 'BAGGA' | 'STANDARD' | 'TIE_BREAKER' | null;
  handWinnerTeam: 'TEAM_1' | 'TEAM_2' | null;
}

export interface DhihaehGameState {
  variant: DhihaehVariant;
  phase: 'DEALING' | 'TRICK_PLAY' | 'ROUND_OVER' | 'MATCH_OVER';
  players: DhihaehPlayer[];
  dealerSeat: number;
  activeSeat: number;
  trumpSuit: Suit | null;
  trumpDeclaredBySeat: number | null;
  trumpCard: Card | null;
  currentTrick: DhihaehTrick;
  trickHistory: DhihaehTrick[];
  score: DhihaehScore;
  targetScore: number; // e.g. 5 or 7 points
}
