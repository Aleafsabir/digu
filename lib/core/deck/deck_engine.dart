import 'dart:math';
import '../models/card_models.dart';

class DeckEngine {
  static const Map<Suit, String> _suitPrefix = {
    Suit.spades: 'S',
    Suit.hearts: 'H',
    Suit.diamonds: 'D',
    Suit.clubs: 'C',
  };

  /// Generates a pristine 52-card standard deck with canonical IDs (e.g., "S-01", "D-13").
  /// No jokers.
  static List<PlayingCard> createStandardDeck() {
    final List<PlayingCard> deck = [];
    for (final suit in Suit.values) {
      for (int rank = 1; rank <= 13; rank++) {
        final rankStr = rank.toString().padLeft(2, '0');
        deck.add(PlayingCard(
          id: '${_suitPrefix[suit]}-$rankStr',
          suit: suit,
          rank: rank,
          isFaceDown: true,
        ));
      }
    }
    return deck;
  }

  /// Pure Fisher-Yates shuffle algorithm using a Random generator.
  static List<T> shuffle<T>(List<T> items, [Random? rng]) {
    final random = rng ?? Random();
    final list = List<T>.from(items);
    for (int i = list.length - 1; i > 0; i--) {
      final j = random.nextInt(i + 1);
      final temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  /// First Turn Lead: The seat directly upstream of the dealer:
  /// (dealerIndex - 1 + numPlayers) % numPlayers
  static int getFirstLeadPlayerIndex(int dealerIndex, int numPlayers) {
    return (dealerIndex - 1 + numPlayers) % numPlayers;
  }
}
