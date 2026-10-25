import { Card, Suit } from '../models/types';
import { BondiGameState, BondiPlayer } from './bondiTypes';
import { BondiValidator } from './bondiValidator';
import { BondiResolver } from './bondiResolver';

export class BondiAI {
  /**
   * Decide card(s) to play for an AI seat in Bondi.
   */
  static choosePlay(
    player: BondiPlayer,
    state: BondiGameState
  ): { cards: Card[]; isSuitDump: boolean } {
    const hand = player.hand;
    const trick = state.currentTrick;

    // --- CASE 1: LEADING ---
    if (!trick.leadSuit || trick.cards.length === 0) {
      // Find suit with longest length to safely lead low
      const suitCounts: Record<Suit, Card[]> = {
        SPADES: [],
        HEARTS: [],
        DIAMONDS: [],
        CLUBS: [],
      };
      hand.forEach(c => suitCounts[c.suit].push(c));

      // Sort hand ascending by strength
      const sorted = [...hand].sort(
        (a, b) => BondiValidator.getCardStrength(a) - BondiValidator.getCardStrength(b)
      );

      // Lead lowest card
      return { cards: [sorted[0]], isSuitDump: false };
    }

    // --- CASE 2: FOLLOWING SUIT OR GIVING BONDI ---
    const leadSuit = trick.leadSuit;
    const holdingLedSuit = BondiValidator.hasSuit(hand, leadSuit);

    // Subcase 2A: Must follow suit
    if (holdingLedSuit) {
      const suitCards = hand
        .filter(c => c.suit === leadSuit)
        .sort(
          (a, b) =>
            BondiValidator.getCardStrength(a) - BondiValidator.getCardStrength(b)
        );

      // Check if we are the last player in this trick
      const activeCount = BondiResolver.getActivePlayerCount(state.players);
      const isLastPlayer = trick.cards.length === activeCount - 1;

      if (isLastPlayer) {
        // Safe to burn highest card since nobody can give Bondi after us!
        return { cards: [suitCards[suitCards.length - 1]], isSuitDump: false };
      }

      // Otherwise, duck to avoid becoming at-risk: play lowest card
      return { cards: [suitCards[0]], isSuitDump: false };
    }

    // Subcase 2B: Void in led suit (GIVING BONDI!)
    if (state.variant === 'SUIT_BONDI') {
      // Suit Bondi: select best suit to mass-dump
      const availableSuits = BondiValidator.getAvailableDumpSuits(hand);
      // Sort by card count descending (dump largest bundle)
      availableSuits.sort((a, b) => b.cards.length - a.cards.length);

      const chosen = availableSuits[0];
      return { cards: chosen ? chosen.cards : [hand[0]], isSuitDump: true };
    }

    // Standard Bondi: play 1 off-suit card.
    // Dump our highest card (e.g. Ace/King of another suit) to penalize at-risk player!
    const sortedDesc = [...hand].sort(
      (a, b) => BondiValidator.getCardStrength(b) - BondiValidator.getCardStrength(a)
    );
    return { cards: [sortedDesc[0]], isSuitDump: false };
  }
}
