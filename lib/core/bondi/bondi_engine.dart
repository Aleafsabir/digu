import '../models/card_models.dart';

enum BondiVariant {
  standard,
  suitBondi,
}

class BondiTrickCard {
  final PlayingCard card;
  final int playedBySeat;

  const BondiTrickCard({
    required this.card,
    required this.playedBySeat,
  });
}

class BondiTrick {
  final int trickNumber;
  final Suit? leadSuit;
  final List<BondiTrickCard> cards;
  final int? atRiskSeat;
  final PlayingCard? atRiskCard;
  final int? bondiInflictedBySeat;
  final int? bondiReceivedBySeat;
  final bool isCleanBurn;

  const BondiTrick({
    required this.trickNumber,
    this.leadSuit,
    this.cards = const [],
    this.atRiskSeat,
    this.atRiskCard,
    this.bondiInflictedBySeat,
    this.bondiReceivedBySeat,
    this.isCleanBurn = false,
  });

  BondiTrick copyWith({
    int? trickNumber,
    Suit? leadSuit,
    List<BondiTrickCard>? cards,
    int? atRiskSeat,
    PlayingCard? atRiskCard,
    int? bondiInflictedBySeat,
    int? bondiReceivedBySeat,
    bool? isCleanBurn,
  }) {
    return BondiTrick(
      trickNumber: trickNumber ?? this.trickNumber,
      leadSuit: leadSuit ?? this.leadSuit,
      cards: cards ?? this.cards,
      atRiskSeat: atRiskSeat ?? this.atRiskSeat,
      atRiskCard: atRiskCard ?? this.atRiskCard,
      bondiInflictedBySeat: bondiInflictedBySeat ?? this.bondiInflictedBySeat,
      bondiReceivedBySeat: bondiReceivedBySeat ?? this.bondiReceivedBySeat,
      isCleanBurn: isCleanBurn ?? this.isCleanBurn,
    );
  }
}

class BondiValidator {
  /// Numeric strength in Bondi:
  /// 2 = 2, ..., 10 = 10, J = 11, Q = 12, K = 13, A = 14 (Ace is strictly highest).
  static int getCardStrength(PlayingCard card) {
    return card.rank == 1 ? 14 : card.rank;
  }

  static bool hasSuit(List<PlayingCard> hand, Suit suit) {
    return hand.any((c) => c.suit == suit);
  }

  /// Check if a single card is legally playable to follow suit or lead.
  static bool isCardPlayable(
    PlayingCard card,
    List<PlayingCard> hand,
    BondiTrick currentTrick,
  ) {
    if (currentTrick.leadSuit == null || currentTrick.cards.isEmpty) {
      return true; // Any card can be led
    }

    final holdingLedSuit = hasSuit(hand, currentTrick.leadSuit!);
    if (holdingLedSuit) {
      return card.suit == currentTrick.leadSuit;
    }

    // Void: player can legally cut with an off-suit card
    return true;
  }

  /// For Suit Bondi: validate if the proposed dump contains ALL cards of that suit held in hand.
  static bool isValidSuitDump(
    List<PlayingCard> dumpCards,
    List<PlayingCard> hand,
    Suit dumpSuit,
  ) {
    if (dumpCards.isEmpty) return false;
    final allHeldOfSuit = hand.where((c) => c.suit == dumpSuit).toList();
    if (dumpCards.length != allHeldOfSuit.length) return false;
    return dumpCards.every((c) => c.suit == dumpSuit);
  }

  /// Get available suits that can be dumped in Suit Bondi when void in led suit.
  static List<({Suit suit, List<PlayingCard> cards})> getAvailableDumpSuits(
    List<PlayingCard> hand,
  ) {
    final result = <({Suit suit, List<PlayingCard> cards})>[];
    for (final suit in Suit.values) {
      final ofSuit = hand.where((c) => c.suit == suit).toList();
      if (ofSuit.isNotEmpty) {
        result.add((suit: suit, cards: ofSuit));
      }
    }
    return result;
  }

  /// Resolve the trick winner: highest card of the led suit claims/leads next.
  static int resolveTrickWinner(BondiTrick trick) {
    assert(trick.cards.isNotEmpty);
    final leadSuit = trick.leadSuit ?? trick.cards.first.card.suit;

    BondiTrickCard winner = trick.cards.first;
    for (int i = 1; i < trick.cards.length; i++) {
      final play = trick.cards[i];
      if (play.card.suit == leadSuit) {
        if (winner.card.suit != leadSuit ||
            getCardStrength(play.card) > getCardStrength(winner.card)) {
          winner = play;
        }
      }
    }
    return winner.playedBySeat;
  }
}

class BondiEngine {
  /// Deal 52 cards 1-by-1 anti-clockwise across players.
  static List<List<PlayingCard>> dealCards({
    required List<PlayingCard> deck,
    int playerCount = 4,
  }) {
    final hands = List.generate(playerCount, (_) => <PlayingCard>[]);
    int p = 0;
    for (final card in deck) {
      hands[p].add(card);
      p = (p + 1) % playerCount;
    }
    return hands;
  }

  /// Locate the player index holding the Ace of Spades (Opening lead of Hand 1).
  static int findAceOfSpadesHolder(List<List<PlayingCard>> hands) {
    for (int i = 0; i < hands.length; i++) {
      if (hands[i].any((c) => c.suit == Suit.spades && c.rank == 1)) {
        return i;
      }
    }
    return 0;
  }

  /// Count how many players still hold at least 1 card.
  static int getActivePlayerCount(List<List<PlayingCard>> seatHands) {
    return seatHands.where((h) => h.isNotEmpty).length;
  }

  /// Rotate anti-clockwise from [currentSeat], skipping emptied seats.
  static int getNextActiveSeat(
    int currentSeat,
    List<List<PlayingCard>> seatHands,
  ) {
    final total = seatHands.length;
    if (total == 0) return 0;
    int next = (currentSeat + 1) % total;
    int loopCount = 0;
    while (seatHands[next].isEmpty && loopCount < total) {
      next = (next + 1) % total;
      loopCount++;
    }
    return next;
  }

  /// Match completes once only 1 player remains with cards ("The Bondi").
  static bool isMatchOver(List<List<PlayingCard>> seatHands) {
    return getActivePlayerCount(seatHands) <= 1;
  }

  /// Return seat index of the single remaining player, or null if not yet decided.
  static int? getLoserSeat(List<List<PlayingCard>> seatHands) {
    final activeSeats = [
      for (int i = 0; i < seatHands.length; i++)
        if (seatHands[i].isNotEmpty) i,
    ];
    return activeSeats.length == 1 ? activeSeats.first : null;
  }

  /// Sort hand by suit and descending card rank for clear ergonomics.
  static void sortHand(List<PlayingCard> hand) {
    hand.sort((a, b) {
      if (a.suit != b.suit) return a.suit.index.compareTo(b.suit.index);
      return BondiValidator.getCardStrength(b)
          .compareTo(BondiValidator.getCardStrength(a));
    });
  }
}

class BondiAI {
  /// Heuristic AI for Bondi returning single card play (legacy wrapper).
  static PlayingCard selectCardToPlay({
    required List<PlayingCard> hand,
    required BondiTrick currentTrick,
  }) {
    return selectPlay(hand: hand, currentTrick: currentTrick).cards.first;
  }

  /// Full heuristic AI supporting Standard (1-card cut), Suit Bondi (mass suit dump),
  /// and safe last-player high-card burn when nobody remains to cut.
  static ({List<PlayingCard> cards, bool isSuitDump}) selectPlay({
    required List<PlayingCard> hand,
    required BondiTrick currentTrick,
    BondiVariant variant = BondiVariant.standard,
    int activePlayerCount = 4,
  }) {
    final playableCards = hand.where((c) {
      return BondiValidator.isCardPlayable(c, hand, currentTrick);
    }).toList();

    assert(playableCards.isNotEmpty);

    final isLeading = currentTrick.cards.isEmpty || currentTrick.leadSuit == null;

    if (isLeading) {
      // Must lead Ace of Spades on Trick 1 if holding it
      if (currentTrick.trickNumber == 1) {
        final aceOfSpades = playableCards
            .where((c) => c.suit == Suit.spades && c.rank == 1)
            .toList();
        if (aceOfSpades.isNotEmpty) {
          return (cards: [aceOfSpades.first], isSuitDump: false);
        }
      }

      // Lead lowest card to shed from bottom
      playableCards.sort((a, b) => BondiValidator.getCardStrength(a)
          .compareTo(BondiValidator.getCardStrength(b)));
      return (cards: [playableCards.first], isSuitDump: false);
    }

    final leadSuit = currentTrick.leadSuit!;
    final hasLedSuit = BondiValidator.hasSuit(hand, leadSuit);

    // Subcase 2A: Following led suit
    if (hasLedSuit) {
      playableCards.sort((a, b) => BondiValidator.getCardStrength(a)
          .compareTo(BondiValidator.getCardStrength(b)));

      final uniqueSeatsInTrick =
          currentTrick.cards.map((tc) => tc.playedBySeat).toSet().length;
      final isLastPlayer = uniqueSeatsInTrick >= activePlayerCount - 1;

      if (isLastPlayer) {
        // Nobody remains after us to cut: burn highest led-suit card safely
        return (cards: [playableCards.last], isSuitDump: false);
      }

      // Otherwise duck with lowest led-suit card
      return (cards: [playableCards.first], isSuitDump: false);
    }

    // Subcase 2B: Void in led suit (Giving Bondi!)
    if (variant == BondiVariant.suitBondi) {
      final availableSuits = BondiValidator.getAvailableDumpSuits(hand);
      availableSuits.sort((a, b) {
        final countCmp = b.cards.length.compareTo(a.cards.length);
        if (countCmp != 0) return countCmp;
        final aMax = a.cards
            .map(BondiValidator.getCardStrength)
            .reduce((x, y) => x > y ? x : y);
        final bMax = b.cards
            .map(BondiValidator.getCardStrength)
            .reduce((x, y) => x > y ? x : y);
        return bMax.compareTo(aMax);
      });
      final chosen = availableSuits.first;
      return (cards: chosen.cards, isSuitDump: true);
    }

    // Standard Bondi: shed highest-strength off-suit card
    playableCards.sort((a, b) => BondiValidator.getCardStrength(b)
        .compareTo(BondiValidator.getCardStrength(a)));
    return (cards: [playableCards.first], isSuitDump: false);
  }
}
