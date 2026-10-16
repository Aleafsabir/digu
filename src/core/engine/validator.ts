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
   */
  static validateGin(melds: Card[][]): boolean {
    if (melds.length !== 3) return false;
    const sizes = melds.map(m => m.length).sort((a, b) => a - b);
    if (sizes[0] !== 3 || sizes[1] !== 3 || sizes[2] !== 4) return false;

    // Ensure all 10 cards are distinct
    const allCards = melds.flat();
    const uniqueIds = new Set(allCards.map(c => c.id));
    if (uniqueIds.size !== 10) return false;

    return melds.every(group => this.isValidSet(group) || this.isValidRun(group));
  }
}
