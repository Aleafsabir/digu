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
  /// Heuristic AI for Bondi:
  /// - Lead: bleed low off-suit cards or lead guaranteed Aces to maintain control.
  /// - Follow: bleed highest card of suit to shed strength, or shed safe off-suit cards when void.
  static PlayingCard selectCardToPlay({
    required List<PlayingCard> hand,
    required BondiTrick currentTrick,
  }) {
    final playableCards = hand.where((c) {
      return BondiValidator.isCardPlayable(c, hand, currentTrick);
    }).toList();

    assert(playableCards.isNotEmpty);
    if (playableCards.length == 1) return playableCards.first;

    final isLeading = currentTrick.cards.isEmpty || currentTrick.leadSuit == null;

    if (isLeading) {
      // If we hold the Ace of Spades on trick 1, must lead it
      if (currentTrick.trickNumber == 1) {
        final aceOfSpades = playableCards
            .where((c) => c.suit == Suit.spades && c.rank == 1)
            .toList();
        if (aceOfSpades.isNotEmpty) return aceOfSpades.first;
      }

      // Lead lowest card to shed from bottom
      playableCards.sort((a, b) => BondiValidator.getCardStrength(a)
          .compareTo(BondiValidator.getCardStrength(b)));
      return playableCards.first;
    }

    // Following:
    // If void in led suit, shed our highest rank off-suit card to dump danger!
    final hasLedSuit = BondiValidator.hasSuit(hand, currentTrick.leadSuit!);
    if (!hasLedSuit) {
      playableCards.sort((a, b) => BondiValidator.getCardStrength(b)
          .compareTo(BondiValidator.getCardStrength(a)));
      return playableCards.first; // Dump highest danger card
    }

    // In led suit: play lowest card that can follow or save Aces
    playableCards.sort((a, b) => BondiValidator.getCardStrength(a)
        .compareTo(BondiValidator.getCardStrength(b)));
    return playableCards.first;
  }
}
