import '../models/card_models.dart';

class RummyValidator {
  /// Valuation rules:
  /// - Ace: 15 points
  /// - Face Cards (K, Q, J, 10): 10 points each
  /// - Pip Cards (2-9): Face value (2 to 9 points)
  static int getCardPoints(int rank) {
    if (rank == 1) return 15;
    if (rank >= 10) return 10;
    return rank;
  }

  /// Sum points of a collection of cards.
  static int sumPoints(List<PlayingCard> cards) {
    return cards.fold(0, (sum, card) => sum + getCardPoints(card.rank));
  }

  /// Special 1,000-Point Run:
  /// Exactly 10 cards in one suit forming a single contiguous sequence:
  /// - Option 1 (Low): A-2-3-4-5-6-7-8-9-10
  /// - Option 2 (High): 5-6-7-8-9-10-J-Q-K-A
  /// Constraint: Must be held completely within an individual player's 10-card hand.
  static bool checkThousandPointRun(List<PlayingCard> hand) {
    if (hand.length != 10) return false;
    final suit = hand.first.suit;
    if (!hand.every((c) => c.suit == suit)) return false;

    final ranks = hand.map((c) => c.rank).toList()..sort();
    final isLowRun = List.generate(10, (i) => i + 1)
        .asMap()
        .entries
        .every((entry) => ranks[entry.key] == entry.value);

    const highTarget = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    final isHighRun = highTarget
        .asMap()
        .entries
        .every((entry) => ranks[entry.key] == entry.value);

    return isLowRun || isHighRun;
  }

  /// Set (Book): 3 or 4 cards of identical rank across distinct suits.
  /// Aces are allowed in Sets (3 or 4 Aces).
  static bool isValidSet(List<PlayingCard> cards) {
    if (cards.length != 3 && cards.length != 4) return false;
    final targetRank = cards.first.rank;
    final seenSuits = <Suit>{};

    for (final c in cards) {
      if (c.rank != targetRank || seenSuits.contains(c.suit)) return false;
      seenSuits.add(c.suit);
    }
    return true;
  }

  /// Sequence (Run): 3 or more continuous ranks of the same suit.
  /// THE STRICT ACE RULE (CRITICAL):
  /// Aces (Rank 1) CANNOT be used in standard sequences under any circumstance
  /// (neither A-2-3 nor Q-K-A is permitted).
  static bool isValidRun(List<PlayingCard> cards) {
    if (cards.length < 3) return false;
    // Aces strictly forbidden in standard runs
    if (cards.any((c) => c.rank == 1)) return false;

    final suit = cards.first.suit;
    if (!cards.every((c) => c.suit == suit)) return false;

    final ranks = cards.map((c) => c.rank).toList()..sort();
    for (int i = 0; i < ranks.length - 1; i++) {
      if (ranks[i + 1] != ranks[i] + 1) return false;
    }
    return true;
  }

  /// Detailed meld validator providing user-facing validation feedback and errors.
  static MeldValidationResult validateMeld(List<PlayingCard> cards) {
    if (cards.length < 3) {
      return MeldValidationResult(
        isValid: false,
        points: sumPoints(cards),
        error: 'Melds must have at least 3 cards.',
      );
    }

    if (isValidSet(cards)) {
      return MeldValidationResult(
        isValid: true,
        type: MeldType.set,
        points: sumPoints(cards),
      );
    }

    // Check if Ace was placed in an attempted run
    final containsAce = cards.any((c) => c.rank == 1);
    final sameSuit = cards.every((c) => c.suit == cards.first.suit);

    if (containsAce && sameSuit && cards.length >= 3) {
      return MeldValidationResult(
        isValid: false,
        points: sumPoints(cards),
        error:
            'Strict Ace Rule: Aces cannot be used in runs (only in Sets or the 1,000-Point Run).',
      );
    }

    if (isValidRun(cards)) {
      return MeldValidationResult(
        isValid: true,
        type: MeldType.run,
        points: sumPoints(cards),
      );
    }

    return MeldValidationResult(
      isValid: false,
      points: sumPoints(cards),
      error: 'Cards do not form a valid Set or Run.',
    );
  }

  /// Standard Gin check: exactly 10 cards partitioned into:
  /// One 4-card meld + Two 3-card melds (0 Deadwood)
  static bool isValidGinHand(List<List<PlayingCard>> melds) {
    if (melds.length != 3) return false;
    final lengths = melds.map((m) => m.length).toList()..sort();
    if (lengths[0] != 3 || lengths[1] != 3 || lengths[2] != 4) return false;

    for (final meld in melds) {
      final res = validateMeld(meld);
      if (!res.isValid) return false;
    }
    return true;
  }
}
