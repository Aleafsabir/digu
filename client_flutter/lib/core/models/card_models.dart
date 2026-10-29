/// Core domain models for playing cards and melds in Holhuashi.
library;

enum Suit {
  spades,
  hearts,
  diamonds,
  clubs;

  String get symbol {
    switch (this) {
      case Suit.spades:
        return '♠';
      case Suit.hearts:
        return '♥';
      case Suit.diamonds:
        return '♦';
      case Suit.clubs:
        return '♣';
    }
  }

  bool get isRed => this == Suit.hearts || this == Suit.diamonds;
}

class PlayingCard {
  final String id;
  final Suit suit;
  final int rank; // 1 (Ace) through 13 (King)
  final bool isFaceDown;

  const PlayingCard({
    required this.id,
    required this.suit,
    required this.rank,
    this.isFaceDown = false,
  });

  String get rankLabel {
    switch (rank) {
      case 1:
        return 'A';
      case 11:
        return 'J';
      case 12:
        return 'Q';
      case 13:
        return 'K';
      default:
        return rank.toString();
    }
  }

  int get pointValue {
    if (rank == 1) return 15;
    if (rank >= 10) return 10;
    return rank;
  }

  PlayingCard copyWith({bool? isFaceDown}) {
    return PlayingCard(
      id: id,
      suit: suit,
      rank: rank,
      isFaceDown: isFaceDown ?? this.isFaceDown,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlayingCard &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => '$rankLabel${suit.symbol}';
}

enum MeldType {
  set,
  run,
  thousandPointRun;
}

class MeldValidationResult {
  final bool isValid;
  final MeldType? type;
  final int points;
  final String? error;

  const MeldValidationResult({
    required this.isValid,
    this.type,
    required this.points,
    this.error,
  });
}
