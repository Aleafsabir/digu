import { describe, it, expect } from 'vitest';
import { Card, TableRules } from '../../src/core/models/types';
import { DiguAI } from '../../src/core/ai/diguAI';

const DEFAULT_RULES: TableRules = {
  mode: 'TEAM_4P',
  dealOption: 'DEAL_11_CARDS',
  targetScore: 1000,
  turnTimeoutSeconds: 30,
};

describe('DiguAI Autonomous Engine', () => {
  describe('shouldDrawDiscard', () => {
    it('declines drawing if discard pile is empty', () => {
      const hand: Card[] = [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
      ];
      expect(DiguAI.shouldDrawDiscard(hand, null, DEFAULT_RULES)).toBe(false);
    });

    it('strictly avoids drawing a single loose Ace due to -15 debt penalty', () => {
      // Bot has no other Aces
      const botHand: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-04', suit: 'CLUBS', rank: 4 },
        { id: 'C-05', suit: 'CLUBS', rank: 5 },
        { id: 'C-06', suit: 'CLUBS', rank: 6 },
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
        { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
        { id: 'S-03', suit: 'SPADES', rank: 3 },
      ];
      const discardAce: Card = { id: 'S-01', suit: 'SPADES', rank: 1 };

      expect(DiguAI.shouldDrawDiscard(botHand, discardAce, DEFAULT_RULES)).toBe(false);
    });

    it('draws an Ace if bot already holds 2 Aces to form a 3-Ace set', () => {
      const botHand: Card[] = [
        { id: 'S-01', suit: 'SPADES', rank: 1 },
        { id: 'H-01', suit: 'HEARTS', rank: 1 },
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-04', suit: 'CLUBS', rank: 4 },
        { id: 'C-05', suit: 'CLUBS', rank: 5 },
        { id: 'C-06', suit: 'CLUBS', rank: 6 },
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
      ];
      const discardAce: Card = { id: 'D-01', suit: 'DIAMONDS', rank: 1 };

      expect(DiguAI.shouldDrawDiscard(botHand, discardAce, DEFAULT_RULES)).toBe(true);
    });

    it('draws a discard card that completes a run and significantly reduces debt', () => {
      const botHand: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-04', suit: 'CLUBS', rank: 4 },
        { id: 'C-05', suit: 'CLUBS', rank: 5 },
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
        { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
        { id: 'S-03', suit: 'SPADES', rank: 3 },
        { id: 'D-12', suit: 'DIAMONDS', rank: 12 },
      ];
      // C-06 completes C-04, C-05, C-06 run
      const discardCard: Card = { id: 'C-06', suit: 'CLUBS', rank: 6 };

      expect(DiguAI.shouldDrawDiscard(botHand, discardCard, DEFAULT_RULES)).toBe(true);
    });
  });

  describe('chooseBestAction', () => {
    it('detects when 11-card hand can declare Gin and returns GIN_SLAM with 11th card', () => {
      // 4-card meld: 7S, 7H, 7D, 7C
      // 3-card meld: 8H, 9H, 10H
      // 3-card meld: 4S, 5S, 6S
      // 11th deadwood card: 2C
      const botHand11: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-07', suit: 'CLUBS', rank: 7 },
        { id: 'H-08', suit: 'HEARTS', rank: 8 },
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
        { id: 'C-02', suit: 'CLUBS', rank: 2 },
      ];

      const action = DiguAI.chooseBestAction(botHand11);
      expect(action.action).toBe('GIN_SLAM');
      expect(action.cardId).toBe('C-02');
    });

    it('detects 1,000-Point Suited Run and slams the 11th card', () => {
      // A suited run from rank 1 to 10 in Hearts + extra card 9S
      const thousandRun: Card[] = Array.from({ length: 10 }, (_, i) => ({
        id: `H-${String(i + 1).padStart(2, '0')}`,
        suit: 'HEARTS',
        rank: (i + 1) as any,
      }));
      const extraCard: Card = { id: 'S-09', suit: 'SPADES', rank: 9 };
      const botHand11 = [...thousandRun, extraCard];

      const action = DiguAI.chooseBestAction(botHand11);
      expect(action.action).toBe('GIN_SLAM');
      expect(action.cardId).toBe('S-09');
    });

    it('chooses the worst deadwood card to discard when Gin is not yet ready', () => {
      // Complete meld: 7S, 7H, 7D
      // Complete meld: 4S, 5S, 6S
      // Deadwood: 2C, 3C, King of Hearts (10 pts), Queen of Clubs (10 pts), isolated Ace (-15 pts)
      const botHand11: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
        { id: 'C-02', suit: 'CLUBS', rank: 2 },
        { id: 'C-03', suit: 'CLUBS', rank: 3 },
        { id: 'H-13', suit: 'HEARTS', rank: 13 },
        { id: 'C-12', suit: 'CLUBS', rank: 12 },
        { id: 'S-01', suit: 'SPADES', rank: 1 }, // Dangerous isolated Ace
      ];

      const action = DiguAI.chooseBestAction(botHand11);
      expect(action.action).toBe('DISCARD');
      // Must discard one of the deadwood cards, particularly the high-debt card or Ace
      expect(['S-01', 'H-13', 'C-12']).toContain(action.cardId);
    });
  });
});
