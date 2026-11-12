import 'package:flutter_test/flutter_test.dart';
import 'package:holhuashi_client/core/models/card_models.dart';
import 'package:holhuashi_client/core/deck/deck_engine.dart';
import 'package:holhuashi_client/core/bondi/bondi_engine.dart';

void main() {
  group('BondiEngine Tests', () {
    test('dealCards distributes all 52 cards equally among players', () {
      final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
      final hands = BondiEngine.dealCards(deck: deck, playerCount: 4);

      expect(hands.length, equals(4));
      for (final hand in hands) {
        expect(hand.length, equals(13));
      }

      final allIds = hands.expand((h) => h).map((c) => c.id).toSet();
      expect(allIds.length, equals(52));
    });

    test('findAceOfSpadesHolder correctly identifies player holding ♠A', () {
      final hands = [
        [const PlayingCard(id: 'H-01', suit: Suit.hearts, rank: 1)],
        [const PlayingCard(id: 'D-10', suit: Suit.diamonds, rank: 10)],
        [const PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1)], // Seat 2 holds ♠A
        [const PlayingCard(id: 'C-05', suit: Suit.clubs, rank: 5)],
      ];

      expect(BondiEngine.findAceOfSpadesHolder(hands), equals(2));
    });

    test('resolveTrickWinner picks highest card of the led suit', () {
      const trick = BondiTrick(
        trickNumber: 1,
        leadSuit: Suit.spades,
        cards: [
          BondiTrickCard(
            card: PlayingCard(id: 'S-07', suit: Suit.spades, rank: 7),
            playedBySeat: 0,
          ),
          BondiTrickCard(
            card: PlayingCard(id: 'S-13', suit: Suit.spades, rank: 13), // King of Spades (13)
            playedBySeat: 1,
          ),
          BondiTrickCard(
            card: PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1), // Ace of Spades (14 - highest)
            playedBySeat: 2,
          ),
          BondiTrickCard(
            card: PlayingCard(id: 'H-01', suit: Suit.hearts, rank: 1), // Off-suit
            playedBySeat: 3,
          ),
        ],
      );

      final winner = BondiValidator.resolveTrickWinner(trick);
      expect(winner, equals(2)); // Seat 2 Ace of Spades wins
    });
  });

  group('BondiAI Tests', () {
    test('AI must lead Ace of Spades on Trick 1 if holding it', () {
      final hand = [
        const PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1),
        const PlayingCard(id: 'H-05', suit: Suit.hearts, rank: 5),
        const PlayingCard(id: 'D-02', suit: Suit.diamonds, rank: 2),
      ];

      const trick = BondiTrick(trickNumber: 1, leadSuit: null, cards: []);
      final choice = BondiAI.selectCardToPlay(hand: hand, currentTrick: trick);

      expect(choice.suit, equals(Suit.spades));
      expect(choice.rank, equals(1));
    });

    test('AI sheds highest danger card when void in led suit', () {
      final hand = [
        const PlayingCard(id: 'H-13', suit: Suit.hearts, rank: 13), // High danger card (King)
        const PlayingCard(id: 'H-03', suit: Suit.hearts, rank: 3),
        const PlayingCard(id: 'D-04', suit: Suit.diamonds, rank: 4),
      ];

      // Led suit is Spades, player is void in Spades
      const trick = BondiTrick(
        trickNumber: 3,
        leadSuit: Suit.spades,
        cards: [
          BondiTrickCard(
            card: PlayingCard(id: 'S-09', suit: Suit.spades, rank: 9),
            playedBySeat: 0,
          ),
        ],
      );

      final choice = BondiAI.selectCardToPlay(hand: hand, currentTrick: trick);

      expect(choice.rank, equals(13)); // Sheds King of Hearts to escape danger
    });
  });
}
