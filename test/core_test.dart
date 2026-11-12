import 'package:flutter_test/flutter_test.dart';
import 'package:holhuashi_client/core/models/card_models.dart';
import 'package:holhuashi_client/core/deck/deck_engine.dart';
import 'package:holhuashi_client/core/digu/rummy_validator.dart';
import 'package:holhuashi_client/core/digu/team_solver.dart';

void main() {
  group('DeckEngine Tests', () {
    test('creates standard 52-card deck without jokers', () {
      final deck = DeckEngine.createStandardDeck();
      expect(deck.length, equals(52));
      final uniqueIds = deck.map((c) => c.id).toSet();
      expect(uniqueIds.length, equals(52));
    });

    test('first lead player is directly upstream of dealer', () {
      // 4 players, dealer is 0 -> lead is (0 - 1 + 4) % 4 = 3
      expect(DeckEngine.getFirstLeadPlayerIndex(0, 4), equals(3));
      // 2 players, dealer is 1 -> lead is (1 - 1 + 2) % 2 = 0
      expect(DeckEngine.getFirstLeadPlayerIndex(1, 2), equals(0));
    });
  });

  group('RummyValidator - Strict Ace Rule & Melds', () {
    test('Aces are permitted in Sets', () {
      final aceSet = [
        const PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1),
        const PlayingCard(id: 'H-01', suit: Suit.hearts, rank: 1),
        const PlayingCard(id: 'C-01', suit: Suit.clubs, rank: 1),
      ];
      final res = RummyValidator.validateMeld(aceSet);
      expect(res.isValid, isTrue);
      expect(res.type, equals(MeldType.set));
      expect(res.points, equals(45)); // 3 * 15
    });

    test('STRICT ACE RULE: Aces are strictly forbidden in standard runs', () {
      // Attempted A-2-3 run
      final aceLowRun = [
        const PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1),
        const PlayingCard(id: 'S-02', suit: Suit.spades, rank: 2),
        const PlayingCard(id: 'S-03', suit: Suit.spades, rank: 3),
      ];
      final resLow = RummyValidator.validateMeld(aceLowRun);
      expect(resLow.isValid, isFalse);
      expect(resLow.error, contains('Strict Ace Rule'));

      // Attempted Q-K-A run
      final aceHighRun = [
        const PlayingCard(id: 'S-12', suit: Suit.spades, rank: 12),
        const PlayingCard(id: 'S-13', suit: Suit.spades, rank: 13),
        const PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1),
      ];
      final resHigh = RummyValidator.validateMeld(aceHighRun);
      expect(resHigh.isValid, isFalse);
    });

    test('Standard runs without Aces are valid', () {
      final run = [
        const PlayingCard(id: 'H-04', suit: Suit.hearts, rank: 4),
        const PlayingCard(id: 'H-05', suit: Suit.hearts, rank: 5),
        const PlayingCard(id: 'H-06', suit: Suit.hearts, rank: 6),
      ];
      final res = RummyValidator.validateMeld(run);
      expect(res.isValid, isTrue);
      expect(res.type, equals(MeldType.run));
      expect(res.points, equals(15)); // 4 + 5 + 6
    });

    test('Special 1,000-Point Run recognizes Low and High runs', () {
      final lowThousand = List.generate(
        10,
        (i) => PlayingCard(
          id: 'D-${(i + 1).toString().padLeft(2, '0')}',
          suit: Suit.diamonds,
          rank: i + 1,
        ),
      );
      expect(RummyValidator.checkThousandPointRun(lowThousand), isTrue);

      final highTarget = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      final highThousand = highTarget
          .map((r) => PlayingCard(
                id: 'C-${r.toString().padLeft(2, '0')}',
                suit: Suit.clubs,
                rank: r,
              ))
          .toList();
      expect(RummyValidator.checkThousandPointRun(highThousand), isTrue);
    });
  });

  group('TeamHandOptimizer Tests', () {
    test('optimizes hand and separates melds from deadwood', () {
      final hand = [
        // Set of 7s (valid)
        const PlayingCard(id: 'S-07', suit: Suit.spades, rank: 7),
        const PlayingCard(id: 'H-07', suit: Suit.hearts, rank: 7),
        const PlayingCard(id: 'D-07', suit: Suit.diamonds, rank: 7),
        // Run of 4-5-6-7 (valid)
        const PlayingCard(id: 'C-04', suit: Suit.clubs, rank: 4),
        const PlayingCard(id: 'C-05', suit: Suit.clubs, rank: 5),
        const PlayingCard(id: 'C-06', suit: Suit.clubs, rank: 6),
        // Deadwood
        const PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1), // -15
      ];

      final result = TeamHandOptimizer.optimizeMergedHand(hand);
      expect(result.melds.length, equals(2));
      expect(result.deadwood.length, equals(1));
      expect(result.deadwood.first.rank, equals(1)); // Ace is deadwood
      expect(result.debtScore, equals(15));
    });
  });
}
