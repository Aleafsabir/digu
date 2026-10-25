import { Card, Suit } from '../models/types';
import { DhihaehGameState, DhihaehPlayer } from './dhihaehTypes';
import { DhihaehValidator } from './dhihaehValidator';
import { DhihaehResolver } from './dhihaehResolver';

export class DhihaehAI {
  /**
   * Decide the best card to play for an AI seat.
   */
  static chooseCardToPlay(
    player: DhihaehPlayer,
    state: DhihaehGameState
  ): Card {
    const hand = player.hand;
    const trick = state.currentTrick;
    const playableCards = DhihaehValidator.getPlayableCards(hand, trick);

    if (playableCards.length === 1) {
      return playableCards[0];
    }

    const partnerSeat = (player.seatIndex + 2) % 4;
    const isLeading = trick.cards.length === 0;

    // --- CASE 1: LEADING ---
    if (isLeading) {
      // 1. If we hold Aces (highest rank 14), lead an Ace in a non-trump suit to safely take trick
      const aces = playableCards.filter(
        c => c.rank === 1 && (!state.trumpSuit || c.suit !== state.trumpSuit)
      );
      if (aces.length > 0) return aces[0];

      // 2. If trump is established and we have high trump (Ace/King of trump), draw out trumps
      if (state.trumpSuit) {
        const highTrumps = playableCards.filter(
          c => c.suit === state.trumpSuit && (c.rank === 1 || c.rank === 13)
        );
        if (highTrumps.length > 0) return highTrumps[0];
      }

      // 3. Lead a safe low card from a long suit (avoid naked 10s)
      const safeLeads = playableCards.filter(c => c.rank !== 10);
      if (safeLeads.length > 0) {
        // Sort ascending by strength
        safeLeads.sort(
          (a, b) =>
            DhihaehValidator.getCardStrength(a) - DhihaehValidator.getCardStrength(b)
        );
        return safeLeads[0];
      }

      return playableCards[0];
    }

    // --- CASE 2: FOLLOWING SUIT OR VOID ---
    const currentWinnerSeat = DhihaehResolver.evaluateTrickWinner(trick, state.trumpSuit);
    const isPartnerWinning = currentWinnerSeat === partnerSeat;
    const trickHasTen = trick.cards.some(tc => tc.card.rank === 10);
    const leadSuit = trick.leadSuit || trick.cards[0].card.suit;
    const holdingLedSuit = DhihaehValidator.hasSuit(hand, leadSuit);

    // Subcase 2A: Holding led suit (must follow suit)
    if (holdingLedSuit) {
      const suitCards = playableCards; // Already filtered by validator
      // Sort ascending
      suitCards.sort(
        (a, b) =>
          DhihaehValidator.getCardStrength(a) - DhihaehValidator.getCardStrength(b)
      );

      // Current winning card in trick
      const currentWinningPlay = trick.cards.find(tc => tc.playedBySeat === currentWinnerSeat);
      const winningStrength = currentWinningPlay
        ? DhihaehValidator.getCardStrength(currentWinningPlay.card)
        : 0;

      if (isPartnerWinning) {
        // Partner is winning: if partner's card is very high (e.g. Ace/King) and we hold a 10 in this suit, feed 10!
        if (winningStrength >= 13) {
          const ten = suitCards.find(c => c.rank === 10);
          if (ten) return ten;
        }
        // Otherwise duck with our lowest card
        return suitCards[0];
      } else {
        // Opponent is currently winning: try to beat them with the lowest card that wins
        const winningOptions = suitCards.filter(
          c => DhihaehValidator.getCardStrength(c) > winningStrength
        );
        if (winningOptions.length > 0) {
          // Play lowest winning card
          return winningOptions[0];
        }
        // Cannot beat: discard lowest card
        return suitCards[0];
      }
    }

    // Subcase 2B: Void in led suit (Can Trump/Cut or Discard)
    // 1. Trump not yet declared (Variant A Dynamic Cut possibility)
    if (!state.trumpSuit) {
      if (!isPartnerWinning || trickHasTen) {
        // Cut to declare trump! Choose card from suit with most cards or highest strength
        const suitsCount: Record<Suit, number> = { SPADES: 0, HEARTS: 0, DIAMONDS: 0, CLUBS: 0 };
        playableCards.forEach(c => (suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1));
        const sortedSuits = Object.entries(suitsCount).sort((a, b) => b[1] - a[1]);
        const chosenSuit = sortedSuits[0][0] as Suit;
        const candidateCards = playableCards.filter(c => c.suit === chosenSuit);
        candidateCards.sort(
          (a, b) =>
            DhihaehValidator.getCardStrength(b) - DhihaehValidator.getCardStrength(a)
        );
        return candidateCards[0]; // Cut with strong card in our best suit!
      } else {
        // Partner is winning, just slough a low card (save 10s)
        const lowNonTens = playableCards.filter(c => c.rank !== 10);
        if (lowNonTens.length > 0) {
          lowNonTens.sort(
            (a, b) =>
              DhihaehValidator.getCardStrength(a) - DhihaehValidator.getCardStrength(b)
          );
          return lowNonTens[0];
        }
        return playableCards[0];
      }
    }

    // 2. Trump IS established
    const trumpsInHand = playableCards.filter(c => c.suit === state.trumpSuit);
    const nonTrumpsInHand = playableCards.filter(c => c.suit !== state.trumpSuit);

    if (isPartnerWinning) {
      // Partner winning: feed a 10 if we have one in off-suit, or slough lowest non-trump
      const tens = nonTrumpsInHand.filter(c => c.rank === 10);
      if (tens.length > 0) return tens[0];

      if (nonTrumpsInHand.length > 0) {
        nonTrumpsInHand.sort(
          (a, b) =>
            DhihaehValidator.getCardStrength(a) - DhihaehValidator.getCardStrength(b)
        );
        return nonTrumpsInHand[0];
      }
      return trumpsInHand[0];
    } else {
      // Opponent winning: cut with trump if possible and worthwhile
      if (trumpsInHand.length > 0) {
        // Check current highest trump in trick if any
        const trumpsInTrick = trick.cards.filter(tc => tc.card.suit === state.trumpSuit);
        let highestTrumpStrength = 0;
        trumpsInTrick.forEach(tc => {
          const s = DhihaehValidator.getCardStrength(tc.card);
          if (s > highestTrumpStrength) highestTrumpStrength = s;
        });

        const overTrumps = trumpsInHand.filter(
          c => DhihaehValidator.getCardStrength(c) > highestTrumpStrength
        );
        if (overTrumps.length > 0) {
          overTrumps.sort(
            (a, b) =>
              DhihaehValidator.getCardStrength(a) - DhihaehValidator.getCardStrength(b)
          );
          return overTrumps[0]; // Lowest winning trump
        }
      }

      // Cannot or choose not to cut: slough lowest non-trump card (protect 10s if possible)
      const lowNonTens = nonTrumpsInHand.filter(c => c.rank !== 10);
      if (lowNonTens.length > 0) {
        lowNonTens.sort(
          (a, b) =>
            DhihaehValidator.getCardStrength(a) - DhihaehValidator.getCardStrength(b)
        );
        return lowNonTens[0];
      }
      return playableCards[0];
    }
  }
}
