import '../models/card_models.dart';
import 'dhihaeh_engine.dart';

class DhihaehAI {
  /// Deterministic heuristic decision-making for Dhihaeh bots.
  static PlayingCard selectCardToPlay({
    required DhihaehPlayer bot,
    required DhihaehTrick currentTrick,
    required Suit? trumpSuit,
    required int partnerSeat,
  }) {
    final playableCards = bot.hand.where((c) {
      return DhihaehValidator.isCardPlayable(c, bot.hand, currentTrick);
    }).toList();

    assert(playableCards.isNotEmpty);
    if (playableCards.length == 1) return playableCards.first;

    final isLeading = currentTrick.cards.isEmpty || currentTrick.leadSuit == null;

    if (isLeading) {
      return _chooseOpeningLead(playableCards, trumpSuit);
    }

    return _chooseFollowCard(
      playableCards: playableCards,
      currentTrick: currentTrick,
      trumpSuit: trumpSuit,
      partnerSeat: partnerSeat,
    );
  }

  static PlayingCard _chooseOpeningLead(
    List<PlayingCard> playableCards,
    Suit? trumpSuit,
  ) {
    // 1. Lead Aces (non-trump first to extract opponent cards)
    final nonTrumpAces = playableCards
        .where((c) => c.rank == 1 && (trumpSuit == null || c.suit != trumpSuit))
        .toList();
    if (nonTrumpAces.isNotEmpty) return nonTrumpAces.first;

    // 2. Avoid leading unprotected 10s
    final safeCards = playableCards.where((c) => c.rank != 10).toList();
    final candidates = safeCards.isNotEmpty ? safeCards : playableCards;

    // 3. Lead lowest card to probe opponent hands
    candidates.sort((a, b) {
      return DhihaehValidator.getCardStrength(a)
          .compareTo(DhihaehValidator.getCardStrength(b));
    });
    return candidates.first;
  }

  static PlayingCard _chooseFollowCard({
    required List<PlayingCard> playableCards,
    required DhihaehTrick currentTrick,
    required Suit? trumpSuit,
    required int partnerSeat,
  }) {
    final currentWinnerSeat =
        DhihaehValidator.resolveTrickWinner(currentTrick, trumpSuit);
    final partnerIsWinning = currentWinnerSeat == partnerSeat;

    // If partner is currently winning the trick:
    if (partnerIsWinning) {
      // If we have a 10 and partner has won trick, feed the 10 to partner!
      final tens = playableCards.where((c) => c.rank == 10).toList();
      if (tens.isNotEmpty) return tens.first;

      // Otherwise dump lowest card
      playableCards.sort((a, b) => DhihaehValidator.getCardStrength(a)
          .compareTo(DhihaehValidator.getCardStrength(b)));
      return playableCards.first;
    }

    // Opponent is winning:
    // Determine which of our cards can beat the current winning card
    final winningCards = playableCards.where((c) {
      final simTrick = DhihaehTrick(
        trickNumber: currentTrick.trickNumber,
        leadSuit: currentTrick.leadSuit,
        cards: [
          ...currentTrick.cards,
          DhihaehTrickCard(card: c, playedBySeat: 99),
        ],
      );
      return DhihaehValidator.resolveTrickWinner(simTrick, trumpSuit) == 99;
    }).toList();

    if (winningCards.isNotEmpty) {
      // Pick the lowest winning card to conserve high cards
      winningCards.sort((a, b) => DhihaehValidator.getCardStrength(a)
          .compareTo(DhihaehValidator.getCardStrength(b)));
      return winningCards.first;
    }

    // Cannot win: dump lowest non-10 card if possible
    final nonTens = playableCards.where((c) => c.rank != 10).toList();
    final discardPool = nonTens.isNotEmpty ? nonTens : playableCards;
    discardPool.sort((a, b) => DhihaehValidator.getCardStrength(a)
        .compareTo(DhihaehValidator.getCardStrength(b)));
    return discardPool.first;
  }
}
