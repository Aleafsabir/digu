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
}
