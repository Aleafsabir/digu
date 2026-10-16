import { describe, it, expect } from 'vitest';
import { RummyValidator } from '../../src/core/engine/validator';
import { Card } from '../../src/core/models/types';

describe('RummyValidator', () => {
  describe('Card Points Valuation', () => {
    it('evaluates Ace as 15 points', () => {
      expect(RummyValidator.getCardPoints(1)).toBe(15);
    });

    it('evaluates Face cards (10, J, Q, K) as 10 points', () => {
      expect(RummyValidator.getCardPoints(10)).toBe(10);
      expect(RummyValidator.getCardPoints(11)).toBe(10);
      expect(RummyValidator.getCardPoints(12)).toBe(10);
      expect(RummyValidator.getCardPoints(13)).toBe(10);
    });

    it('evaluates Pip cards (2-9) at face value', () => {
      expect(RummyValidator.getCardPoints(2)).toBe(2);
      expect(RummyValidator.getCardPoints(7)).toBe(7);
      expect(RummyValidator.getCardPoints(9)).toBe(9);
    });
  });

  describe('Set Validation', () => {
    it('validates a 3-card set with matching ranks and distinct suits', () => {
      const set3: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
      ];
      expect(RummyValidator.isValidSet(set3)).toBe(true);
    });

    it('validates a 4-card set across all four suits', () => {
      const set4: Card[] = [
        { id: 'S-10', suit: 'SPADES', rank: 10 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
        { id: 'D-10', suit: 'DIAMONDS', rank: 10 },
        { id: 'C-10', suit: 'CLUBS', rank: 10 },
      ];
      expect(RummyValidator.isValidSet(set4)).toBe(true);
    });

    it('allows Aces in Sets (3 or 4 Aces)', () => {
      const aceSet3: Card[] = [
        { id: 'S-01', suit: 'SPADES', rank: 1 },
        { id: 'H-01', suit: 'HEARTS', rank: 1 },
        { id: 'D-01', suit: 'DIAMONDS', rank: 1 },
      ];
      const aceSet4: Card[] = [
        { id: 'S-01', suit: 'SPADES', rank: 1 },
        { id: 'H-01', suit: 'HEARTS', rank: 1 },
        { id: 'D-01', suit: 'DIAMONDS', rank: 1 },
        { id: 'C-01', suit: 'CLUBS', rank: 1 },
      ];
      expect(RummyValidator.isValidSet(aceSet3)).toBe(true);
      expect(RummyValidator.isValidSet(aceSet4)).toBe(true);
    });

    it('rejects sets with fewer than 3 or more than 4 cards', () => {
      const pair: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
      ];
      expect(RummyValidator.isValidSet(pair)).toBe(false);
    });

    it('rejects sets with duplicate suits or different ranks', () => {
      const dupSuit: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'S-07b', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
      ];
      const diffRank: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-08', suit: 'DIAMONDS', rank: 8 },
      ];
      expect(RummyValidator.isValidSet(dupSuit)).toBe(false);
      expect(RummyValidator.isValidSet(diffRank)).toBe(false);
    });
  });

  describe('Sequence (Run) Validation & Strict Ace Rule', () => {
    it('validates standard 3-card, 4-card, and 5-card runs in the same suit', () => {
      const run3: Card[] = [
        { id: 'C-04', suit: 'CLUBS', rank: 4 },
        { id: 'C-05', suit: 'CLUBS', rank: 5 },
        { id: 'C-06', suit: 'CLUBS', rank: 6 },
      ];
      const run4: Card[] = [
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
        { id: 'H-11', suit: 'HEARTS', rank: 11 },
        { id: 'H-12', suit: 'HEARTS', rank: 12 },
      ];
      expect(RummyValidator.isValidRun(run3)).toBe(true);
      expect(RummyValidator.isValidRun(run4)).toBe(true);
    });

    it('CRITICAL: Strictly rejects Aces in low runs (A-2-3 is FORBIDDEN)', () => {
      const a23: Card[] = [
        { id: 'S-01', suit: 'SPADES', rank: 1 },
        { id: 'S-02', suit: 'SPADES', rank: 2 },
        { id: 'S-03', suit: 'SPADES', rank: 3 },
      ];
      expect(RummyValidator.isValidRun(a23)).toBe(false);
      const validation = RummyValidator.validateMeld(a23);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Strict Ace Rule');
    });

    it('CRITICAL: Strictly rejects Aces in high runs (Q-K-A is FORBIDDEN)', () => {
      const qka: Card[] = [
        { id: 'D-12', suit: 'DIAMONDS', rank: 12 },
        { id: 'D-13', suit: 'DIAMONDS', rank: 13 },
        { id: 'D-01', suit: 'DIAMONDS', rank: 1 },
      ];
      expect(RummyValidator.isValidRun(qka)).toBe(false);
    });

    it('rejects runs with mixed suits or non-contiguous ranks', () => {
      const mixedSuit: Card[] = [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'H-05', suit: 'HEARTS', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
      ];
      const nonContiguous: Card[] = [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
        { id: 'S-07', suit: 'SPADES', rank: 7 },
      ];
      expect(RummyValidator.isValidRun(mixedSuit)).toBe(false);
      expect(RummyValidator.isValidRun(nonContiguous)).toBe(false);
    });
  });

  describe('Special 1,000-Point Run', () => {
    it('validates Option 1 (Low): A-2-3-4-5-6-7-8-9-10 in a single suit', () => {
      const low1000: Card[] = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ].map(r => ({ id: `S-${r.toString().padStart(2, '0')}`, suit: 'SPADES', rank: r as any }));

      expect(RummyValidator.checkThousandPointRun(low1000)).toBe(true);
    });

    it('validates Option 2 (High): 5-6-7-8-9-10-J-Q-K-A in a single suit', () => {
      const highRanks = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      const high1000: Card[] = highRanks.map(r => ({
        id: `H-${r.toString().padStart(2, '0')}`,
        suit: 'HEARTS',
        rank: r as any,
      }));

      expect(RummyValidator.checkThousandPointRun(high1000)).toBe(true);
    });

    it('rejects a 1,000-point run if suits are mixed', () => {
      const mixed: Card[] = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ].map((r, i) => ({
        id: `card-${r}`,
        suit: i === 5 ? 'HEARTS' : 'SPADES',
        rank: r as any,
      }));

      expect(RummyValidator.checkThousandPointRun(mixed)).toBe(false);
    });

    it('rejects a 1,000-point run if hand does not have exactly 10 cards', () => {
      const nineCards: Card[] = [
        1, 2, 3, 4, 5, 6, 7, 8, 9,
      ].map(r => ({ id: `S-${r}`, suit: 'SPADES', rank: r as any }));

      expect(RummyValidator.checkThousandPointRun(nineCards)).toBe(false);
    });
  });

  describe('Standard 10-Card Gin Validation (4+3+3 Partition)', () => {
    it('validates valid Gin with one 4-card meld and two 3-card melds (all distinct cards)', () => {
      const meld4: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-07', suit: 'CLUBS', rank: 7 },
      ];
      const meld3a: Card[] = [
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
        { id: 'H-11', suit: 'HEARTS', rank: 11 },
      ];
      const meld3b: Card[] = [
        { id: 'C-02', suit: 'CLUBS', rank: 2 },
        { id: 'C-03', suit: 'CLUBS', rank: 3 },
        { id: 'C-04', suit: 'CLUBS', rank: 4 },
      ];

      expect(RummyValidator.validateGin([meld4, meld3a, meld3b])).toBe(true);
      // Also valid regardless of order
      expect(RummyValidator.validateGin([meld3a, meld4, meld3b])).toBe(true);
    });

    it('rejects Gin if partitions are not exactly 4, 3, 3', () => {
      const meld5: Card[] = [2, 3, 4, 5, 6].map(r => ({ id: `S-${r}`, suit: 'SPADES', rank: r as any }));
      const meld3: Card[] = [8, 9, 10].map(r => ({ id: `H-${r}`, suit: 'HEARTS', rank: r as any }));
      const meld2: Card[] = [12, 13].map(r => ({ id: `C-${r}`, suit: 'CLUBS', rank: r as any }));

      expect(RummyValidator.validateGin([meld5, meld3, meld2])).toBe(false);
    });

    it('rejects Gin if any card is duplicated across melds', () => {
      const meld4: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-07', suit: 'CLUBS', rank: 7 },
      ];
      const meld3a: Card[] = [
        { id: 'S-07', suit: 'SPADES', rank: 7 }, // Duplicate card!
        { id: 'H-08', suit: 'HEARTS', rank: 8 },
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
      ];
      const meld3b: Card[] = [
        { id: 'C-02', suit: 'CLUBS', rank: 2 },
        { id: 'C-03', suit: 'CLUBS', rank: 3 },
        { id: 'C-04', suit: 'CLUBS', rank: 4 },
      ];

      expect(RummyValidator.validateGin([meld4, meld3a, meld3b])).toBe(false);
    });
  });
});
