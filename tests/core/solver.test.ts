import { describe, it, expect } from 'vitest';
import { TeamHandOptimizer } from '../../src/core/engine/solver';
import { Card } from '../../src/core/models/types';

describe('TeamHandOptimizer (20-Card Merged Optimizer)', () => {
  it('extracts candidate sets and runs respecting the strict Ace rule', () => {
    const cards: Card[] = [
      // 3 Aces (should be recognized as candidate Set)
      { id: 'S-01', suit: 'SPADES', rank: 1 },
      { id: 'H-01', suit: 'HEARTS', rank: 1 },
      { id: 'D-01', suit: 'DIAMONDS', rank: 1 },
      // Run: 4-5-6 Clubs
      { id: 'C-04', suit: 'CLUBS', rank: 4 },
      { id: 'C-05', suit: 'CLUBS', rank: 5 },
      { id: 'C-06', suit: 'CLUBS', rank: 6 },
    ];

    const candidates = TeamHandOptimizer.extractCandidateMelds(cards);
    expect(candidates.length).toBe(2);

    // Candidates should not contain any run featuring an Ace
    for (const c of candidates) {
      if (c.length >= 3 && c.every(card => card.suit === c[0].suit)) {
        expect(c.some(card => card.rank === 1)).toBe(false);
      }
    }
  });

  it('optimizes a 20-card merged team hand to maximize Net Score', () => {
    // 20 cards combined from two players:
    // Meld 1: 7-7-7-7 (Set of four 7s, 40 pts)
    // Meld 2: 8-9-10 Hearts (Run, 27 pts)
    // Meld 3: J-Q-K Spades (Run, 30 pts)
    // Meld 4: A-A-A (Set of three Aces, 45 pts)
    // Remaining 6 cards: 2C, 3D, 4H, 2S, 3S, 5D (Deadwood: 2+3+4+2+3+5 = 19 debt)
    const cards: Card[] = [
      // Four 7s
      { id: 'S-07', suit: 'SPADES', rank: 7 },
      { id: 'H-07', suit: 'HEARTS', rank: 7 },
      { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
      { id: 'C-07', suit: 'CLUBS', rank: 7 },
      // Hearts 8-9-10
      { id: 'H-08', suit: 'HEARTS', rank: 8 },
      { id: 'H-09', suit: 'HEARTS', rank: 9 },
      { id: 'H-10', suit: 'HEARTS', rank: 10 },
      // Spades J-Q-K
      { id: 'S-11', suit: 'SPADES', rank: 11 },
      { id: 'S-12', suit: 'SPADES', rank: 12 },
      { id: 'S-13', suit: 'SPADES', rank: 13 },
      // Three Aces
      { id: 'S-01', suit: 'SPADES', rank: 1 },
      { id: 'H-01', suit: 'HEARTS', rank: 1 },
      { id: 'D-01', suit: 'DIAMONDS', rank: 1 },
      // 7 deadwood cards
      { id: 'C-02', suit: 'CLUBS', rank: 2 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'S-02', suit: 'SPADES', rank: 2 },
      { id: 'S-03', suit: 'SPADES', rank: 3 },
      { id: 'D-05', suit: 'DIAMONDS', rank: 5 },
      { id: 'C-06', suit: 'CLUBS', rank: 6 },
    ];

    expect(cards.length).toBe(20);

    const result = TeamHandOptimizer.optimizeMergedHand(cards);

    // Four melds should be identified
    expect(result.melds.length).toBe(4);
    // Exactly 7 cards deadwood
    expect(result.deadwood.length).toBe(7);

    // Deadwood debt: 2+3+4+2+3+5+6 = 25
    expect(result.debtScore).toBe(25);

    // Meld points: (4*7=28) + (8+9+10=27) + (10+10+10=30) + (15*3=45) = 130
    expect(result.meldScore).toBe(130);

    // Net score: 130 - 25 = 105
    expect(result.netScore).toBe(105);
  });

  it('handles hand with 0 melds correctly', () => {
    // 10 cards with no possible sets or runs
    const noMeldCards: Card[] = [
      { id: 'S-02', suit: 'SPADES', rank: 2 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'D-06', suit: 'DIAMONDS', rank: 6 },
      { id: 'C-08', suit: 'CLUBS', rank: 8 },
      { id: 'S-10', suit: 'SPADES', rank: 10 },
      { id: 'H-12', suit: 'HEARTS', rank: 12 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'C-05', suit: 'CLUBS', rank: 5 },
      { id: 'S-07', suit: 'SPADES', rank: 7 },
      { id: 'H-09', suit: 'HEARTS', rank: 9 },
    ];

    const result = TeamHandOptimizer.optimizeMergedHand(noMeldCards);
    expect(result.melds.length).toBe(0);
    expect(result.deadwood.length).toBe(10);
    expect(result.meldScore).toBe(0);
    expect(result.netScore).toBeLessThan(0);
  });
});
