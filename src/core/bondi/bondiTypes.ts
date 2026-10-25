import { Card, Suit } from '../models/types';

export type BondiVariant = 'STANDARD' | 'SUIT_BONDI';

export interface BondiTrickCard {
  card: Card;
  playedBySeat: number;
}

export interface BondiTrick {
  trickNumber: number;
  leadSuit: Suit | null;
  cards: BondiTrickCard[];
  atRiskSeat: number | null; // Seat holding the highest card of led suit
  atRiskCard: Card | null;
  bondiInflictedBySeat?: number | null;
  bondiReceivedBySeat?: number | null;
  isCleanBurn?: boolean;
}

export interface BondiPlayer {
  id: string;
  name: string;
  seatIndex: number;
  isAI: boolean;
  hand: Card[];
  hasExited: boolean;
  exitRank?: number; // 1 = First out, 2 = Second out...
}

export interface BondiGameState {
  variant: BondiVariant;
  playerCount: number; // 2 to 6
  phase: 'DEALING' | 'TRICK_PLAY' | 'MATCH_OVER';
  players: BondiPlayer[];
  activeSeat: number;
  currentTrick: BondiTrick;
  burnedCardsCount: number;
  loserSeat: number | null; // The Bondi
  humanWon: boolean | null; // true if human cleared, false if human lost
}
