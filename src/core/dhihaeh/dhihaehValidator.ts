import { Card, Suit } from '../models/types';
import { DhihaehTrick } from './dhihaehTypes';

export class DhihaehValidator {
  /**
   * Numeric strength mapping:
   * 2 = 2, ..., 10 = 10, J = 11, Q = 12, K = 13, A = 14 (rank 1 -> strength 14)
   */
  static getCardStrength(card: Card): number {
    return card.rank === 1 ? 14 : card.rank;
  }

  /**
   * Check if a player has any card of the specified suit in their hand.
   */
  static hasSuit(hand: Card[], suit: Suit): boolean {
    return hand.some(c => c.suit === suit);
  }

  /**
   * Determine whether a card is legal to play in the current trick.
   * - If this is the lead play (cards.length === 0): any card in hand is legal.
   * - If suit was led:
   *    - If player holds the led suit: MUST play a card of that led suit.
   *    - If player is void in led suit: CAN play any card (trump or off-suit discard).
   */
  static isCardPlayable(card: Card, hand: Card[], currentTrick: DhihaehTrick): boolean {
    if (!currentTrick.leadSuit || currentTrick.cards.length === 0) {
      return true; // Any card can be led
    }

    const holdingLedSuit = this.hasSuit(hand, currentTrick.leadSuit);
    if (holdingLedSuit) {
      return card.suit === currentTrick.leadSuit;
    }

    // Void in led suit: player can play any card (trump cut or slough)
    return true;
  }

  /**
   * Returns list of playable cards for the player in the current state.
   */
  static getPlayableCards(hand: Card[], currentTrick: DhihaehTrick): Card[] {
    if (!currentTrick.leadSuit || currentTrick.cards.length === 0) {
      return [...hand];
    }
    const hasLed = this.hasSuit(hand, currentTrick.leadSuit);
    if (hasLed) {
      return hand.filter(c => c.suit === currentTrick.leadSuit);
    }
    return [...hand];
  }
}
