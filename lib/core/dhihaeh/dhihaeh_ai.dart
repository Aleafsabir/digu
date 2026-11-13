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

    // 2. If trump is established and holding high trump (Ace/King), draw trumps
    if (trumpSuit != null) {
      final highTrumps = playableCards
          .where((c) => c.suit == trumpSuit && (c.rank == 1 || c.rank == 13))
          .toList();
      if (highTrumps.isNotEmpty) return highTrumps.first;
    }

    // 3. Avoid leading unprotected 10s
    final safeCards = playableCards.where((c) => c.rank != 10).toList();
    final candidates = safeCards.isNotEmpty ? safeCards : playableCards;

    // 4. Lead lowest card to probe opponent hands
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
    final trickHasTen = currentTrick.cards.any((tc) => tc.card.rank == 10);
    final leadSuit = currentTrick.leadSuit ?? currentTrick.cards.first.card.suit;
    final holdingLedSuit = playableCards.any((c) => c.suit == leadSuit);

    // Subcase A: Holding led suit
    if (holdingLedSuit) {
      final winningPlay = currentTrick.cards.firstWhere(
        (tc) => tc.playedBySeat == currentWinnerSeat,
        orElse: () => currentTrick.cards.first,
      );
      final winningStrength = DhihaehValidator.getCardStrength(winningPlay.card);

      playableCards.sort((a, b) => DhihaehValidator.getCardStrength(a)
          .compareTo(DhihaehValidator.getCardStrength(b)));

      if (partnerIsWinning) {
        // Feed a 10 if partner's winning card is Ace or King
        if (winningStrength >= 13) {
          final tens = playableCards.where((c) => c.rank == 10).toList();
          if (tens.isNotEmpty) return tens.first;
        }
        return playableCards.first;
      }

      // Try to beat opponent with lowest winning card
      final winningCards = playableCards
          .where((c) => DhihaehValidator.getCardStrength(c) > winningStrength)
          .toList();
      if (winningCards.isNotEmpty) return winningCards.first;

      return playableCards.first;
    }

    // Subcase B: Void in led suit & trump not yet established (Dynamic Cut)
    if (trumpSuit == null) {
      if (!partnerIsWinning || trickHasTen) {
        // Choose the suit with the most cards and play its strongest card to establish trump
        final suitCounts = <Suit, List<PlayingCard>>{};
        for (final c in playableCards) {
          suitCounts.putIfAbsent(c.suit, () => []).add(c);
        }
        final sortedGroups = suitCounts.values.toList()
          ..sort((a, b) => b.length.compareTo(a.length));
        final bestGroup = sortedGroups.first
          ..sort((a, b) => DhihaehValidator.getCardStrength(b)
              .compareTo(DhihaehValidator.getCardStrength(a)));
        return bestGroup.first;
      }

      // Partner is safely winning with no 10s at risk: slough lowest non-10
      final lowNonTens = playableCards.where((c) => c.rank != 10).toList();
      final pool = lowNonTens.isNotEmpty ? lowNonTens : playableCards;
      pool.sort((a, b) => DhihaehValidator.getCardStrength(a)
          .compareTo(DhihaehValidator.getCardStrength(b)));
      return pool.first;
    }

    // Subcase C: Void in led suit & trump IS established
    if (partnerIsWinning) {
      final nonTrumps =
          playableCards.where((c) => c.suit != trumpSuit).toList();
      final tens = nonTrumps.where((c) => c.rank == 10).toList();
      if (tens.isNotEmpty) return tens.first;

      if (nonTrumps.isNotEmpty) {
        nonTrumps.sort((a, b) => DhihaehValidator.getCardStrength(a)
            .compareTo(DhihaehValidator.getCardStrength(b)));
        return nonTrumps.first;
      }
      return playableCards.first;
    }

    // Opponent is winning: cut/over-trump if possible
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
      winningCards.sort((a, b) => DhihaehValidator.getCardStrength(a)
          .compareTo(DhihaehValidator.getCardStrength(b)));
      return winningCards.first;
    }

    // Cannot win: slough lowest non-10 non-trump card if possible
    final nonTens =
        playableCards.where((c) => c.rank != 10 && c.suit != trumpSuit).toList();
    final discardPool = nonTens.isNotEmpty ? nonTens : playableCards;
    discardPool.sort((a, b) => DhihaehValidator.getCardStrength(a)
        .compareTo(DhihaehValidator.getCardStrength(b)));
    return discardPool.first;
  }
}
