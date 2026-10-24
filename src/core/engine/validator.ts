import { Card, Rank, Suit, MeldValidationResult } from '../models/types';

export class RummyValidator {
  /**
   * Valuation rules:
   * Ace: 15 points
   * Face Cards (K, Q, J, 10): 10 points each
   * Pip Cards (2-9): Face value (2 to 9 points)
   */
  static getCardPoints(rank: Rank): number {
    if (rank === 1) return 15;
    if (rank >= 10) return 10;
    return rank;
  }

  /**
   * Sum points of a collection of cards.
   */
  static sumPoints(cards: Card[]): number {
    return cards.reduce((sum, card) => sum + this.getCardPoints(card.rank), 0);
  }

  /**
   * Special 1,000-Point Run:
   * Exactly 10 cards in one suit forming a single contiguous sequence:
   * Option 1 (Low): A-2-3-4-5-6-7-8-9-10
   * Option 2 (High): 5-6-7-8-9-10-J-Q-K-A
   * Constraint: Must be held completely within an individual player's 10-card hand.
   */
  static checkThousandPointRun(hand: Card[]): boolean {
    if (hand.length !== 10) return false;
    const suit = hand[0].suit;
    if (!hand.every(c => c.suit === suit)) return false;

    const ranks = hand.map(c => c.rank).sort((a, b) => a - b);
    const isLowRun = ranks.every((r, idx) => r === idx + 1);
    const highTarget = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const isHighRun = ranks.every((r, idx) => r === highTarget[idx]);

    return isLowRun || isHighRun;
  }

  /**
   * Set (Book): 3 or 4 cards of identical rank across distinct suits.
   * Aces are allowed in Sets (3 or 4 Aces).
   */
  static isValidSet(cards: Card[]): boolean {
    if (cards.length !== 3 && cards.length !== 4) return false;
    const targetRank = cards[0].rank;
    const seenSuits = new Set<Suit>();

    for (const c of cards) {
      if (c.rank !== targetRank || seenSuits.has(c.suit)) return false;
      seenSuits.add(c.suit);
    }
    return true;
  }

  /**
   * Sequence (Run): 3 or more continuous ranks of the same suit.
   * THE STRICT ACE RULE (CRITICAL):
   * Aces (Rank 1) CANNOT be used in standard sequences under any circumstance
   * (neither A-2-3 nor Q-K-A is permitted).
   */
  static isValidRun(cards: Card[]): boolean {
    if (cards.length < 3) return false;
    // Aces forbidden in standard runs
    if (cards.some(c => c.rank === 1)) return false;

    const suit = cards[0].suit;
    if (!cards.every(c => c.suit === suit)) return false;

    const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i + 1] !== ranks[i] + 1) return false;
    }
    return true;
  }

  /**
   * Detailed meld validator providing user-facing validation feedback and errors.
   */
  static validateMeld(cards: Card[]): MeldValidationResult {
    if (cards.length < 3) {
      return {
        isValid: false,
        points: this.sumPoints(cards),
        error: 'Melds must have at least 3 cards.',
      };
    }

    if (this.isValidSet(cards)) {
      return {
        isValid: true,
        type: 'SET',
        points: this.sumPoints(cards),
      };
    }

    // Check if Ace was placed in an attempted run
    const containsAce = cards.some(c => c.rank === 1);
    const sameSuit = cards.every(c => c.suit === cards[0].suit);

    if (containsAce && sameSuit && cards.length >= 3) {
      return {
        isValid: false,
        points: this.sumPoints(cards),
        error: 'Strict Ace Rule: Aces cannot be used in runs (only in Sets or the 1,000-Point Run).',
      };
    }

    if (this.isValidRun(cards)) {
      return {
        isValid: true,
        type: 'RUN',
        points: this.sumPoints(cards),
      };
    }

    return {
      isValid: false,
      points: this.sumPoints(cards),
      error: 'Invalid meld: Cards do not form a valid Set (matching rank, unique suits) or Run (consecutive ranks, same suit, no Aces).',
    };
  }

  /**
   * Standard Gin: Hand must contain exactly 10 melded cards partitioned into:
   * One 4-Card Meld + Two 3-Card Melds = 10 Cards (0 Deadwood).
   * Supports standard 3-meld hands as well as composite runs (e.g. 7-card run + 3-card run).
   */
  static validateGin(melds: Card[][]): boolean {
    return this.decomposeGinMelds(melds) !== null;
  }

  /**
   * Decomposes any valid 10-card Gin hand into exactly three melds:
   * One 4-card meld + Two 3-card melds (0 Deadwood).
   * Supports standard 3-meld hands, composite runs (e.g. 7-card run + 3-card meld,
   * 6-card run + 4-card meld), or raw 10-card sets.
   */
  static decomposeGinMelds(melds: Card[][]): Card[][] | null {
    if (!melds || melds.length === 0) return null;

    const allCards = melds.flat();
    if (allCards.length !== 10) return null;
    const uniqueIds = new Set(allCards.map(c => c.id));
    if (uniqueIds.size !== 10) return null;

    // Fast-path: Hand already provided as 3 valid melds of sizes [3, 3, 4]
    if (melds.length === 3) {
      const sizes = melds.map(m => m.length).sort((a, b) => a - b);
      if (sizes[0] === 3 && sizes[1] === 3 && sizes[2] === 4) {
        if (melds.every(group => this.isValidSet(group) || this.isValidRun(group))) {
          return melds;
        }
      }
    }

    // Direct decomposition of composite runs when 2 melds are provided:
    // e.g. [7-card run, 3-card meld] -> [4-card run, 3-card run, 3-card meld]
    if (melds.length === 2) {
      const sortedByLen = [...melds].sort((a, b) => a.length - b.length);
      const mSmall = sortedByLen[0];
      const mLarge = sortedByLen[1];

      if (mSmall.length === 3 && mLarge.length === 7 && (this.isValidSet(mSmall) || this.isValidRun(mSmall)) && this.isValidRun(mLarge)) {
        const sortedLarge = [...mLarge].sort((a, b) => a.rank - b.rank);
        const run3 = sortedLarge.slice(0, 3);
        const run4 = sortedLarge.slice(3, 7);
        if (this.isValidRun(run3) && this.isValidRun(run4)) {
          return [run4, run3, mSmall];
        }
        const run4Alt = sortedLarge.slice(0, 4);
        const run3Alt = sortedLarge.slice(4, 7);
        if (this.isValidRun(run4Alt) && this.isValidRun(run3Alt)) {
          return [run4Alt, run3Alt, mSmall];
        }
      }

      if (mSmall.length === 4 && mLarge.length === 6 && (this.isValidSet(mSmall) || this.isValidRun(mSmall)) && this.isValidRun(mLarge)) {
        const sortedLarge = [...mLarge].sort((a, b) => a.rank - b.rank);
        const run3a = sortedLarge.slice(0, 3);
        const run3b = sortedLarge.slice(3, 6);
        if (this.isValidRun(run3a) && this.isValidRun(run3b)) {
          return [mSmall, run3a, run3b];
        }
      }
    }

    // Comprehensive combinatorial 4+3+3 search across the 10 distinct cards
    return this.findStandardGinPartition(allCards);
  }

  /**
   * Finds a valid 4+3+3 partition (One 4-Card Meld + Two 3-Card Melds)
   * among exactly 10 distinct cards, or returns null if impossible.
   */
  static findStandardGinPartition(cards: Card[]): Card[][] | null {
    if (cards.length !== 10) return null;
    const uniqueIds = new Set(cards.map(c => c.id));
    if (uniqueIds.size !== 10) return null;

    const n = 10;
    // Iterate through all 4-card combinations for the 4-card meld (10 choose 4 = 210)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          for (let l = k + 1; l < n; l++) {
            const m4 = [cards[i], cards[j], cards[k], cards[l]];
            if (this.isValidSet(m4) || this.isValidRun(m4)) {
              // 6 remaining cards
              const remaining6: Card[] = [];
              for (let idx = 0; idx < n; idx++) {
                if (idx !== i && idx !== j && idx !== k && idx !== l) {
                  remaining6.push(cards[idx]);
                }
              }

              // Check partitions of remaining6 into two 3-card melds (5 choose 2 = 10 combinations)
              for (let p = 1; p < 6; p++) {
                for (let q = p + 1; q < 6; q++) {
                  const m3a = [remaining6[0], remaining6[p], remaining6[q]];
                  if (this.isValidSet(m3a) || this.isValidRun(m3a)) {
                    const m3b: Card[] = [];
                    for (let rIdx = 1; rIdx < 6; rIdx++) {
                      if (rIdx !== p && rIdx !== q) {
                        m3b.push(remaining6[rIdx]);
                      }
                    }
                    if (this.isValidSet(m3b) || this.isValidRun(m3b)) {
                      return [m4, m3a, m3b];
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return null;
  }
}
