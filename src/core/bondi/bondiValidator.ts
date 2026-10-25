import { Card, Suit } from '../models/types';
import { BondiTrick } from './bondiTypes';

export class BondiValidator {
  /**
   * Numeric strength mapping:
   * 2 = 2, ..., 10 = 10, J = 11, Q = 12, K = 13, A = 14 (rank 1 -> 14)
   */
  static getCardStrength(card: Card): number {
    return card.rank === 1 ? 14 : card.rank;
  }

  static hasSuit(hand: Card[], suit: Suit): boolean {
    return hand.some(c => c.suit === suit);
  }

  /**
   * Check if a single card is legally playable to follow suit or lead.
   */
  static isCardPlayable(card: Card, hand: Card[], currentTrick: BondiTrick): boolean {
    if (!currentTrick.leadSuit || currentTrick.cards.length === 0) {
      return true; // Any card can be led
    }

    const holdingLedSuit = this.hasSuit(hand, currentTrick.leadSuit);
    if (holdingLedSuit) {
      return card.suit === currentTrick.leadSuit;
    }

    // Void: can give Bondi with off-suit card
    return true;
  }

  /**
   * For Suit Bondi: validate if the proposed dump contains ALL cards of that suit held in hand.
   */
  static isValidSuitDump(dumpCards: Card[], hand: Card[], dumpSuit: Suit): boolean {
    if (dumpCards.length === 0) return false;
    const allHeldOfSuit = hand.filter(c => c.suit === dumpSuit);
    if (dumpCards.length !== allHeldOfSuit.length) return false;
    return dumpCards.every(c => c.suit === dumpSuit);
  }

  /**
   * Get available suits that can be dumped in Suit Bondi when void in led suit.
   */
  static getAvailableDumpSuits(hand: Card[]): { suit: Suit; cards: Card[] }[] {
    const suits: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    const result: { suit: Suit; cards: Card[] }[] = [];
    for (const suit of suits) {
      const ofSuit = hand.filter(c => c.suit === suit);
      if (ofSuit.length > 0) {
        result.push({ suit, cards: ofSuit });
      }
    }
    return result;
  }
}
