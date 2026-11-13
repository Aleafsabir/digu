import 'package:flutter_test/flutter_test.dart';
import 'package:holhuashi_client/core/models/card_models.dart';
import 'package:holhuashi_client/core/deck/deck_engine.dart';
import 'package:holhuashi_client/core/dhihaeh/dhihaeh_engine.dart';
import 'package:holhuashi_client/core/dhihaeh/dhihaeh_ai.dart';

void main() {
  group('DhihaehEngine Tests', () {
    test('deal3PassBatch distributes 52 cards across 4 players in 5-4-4 batches', () {
      final deck = DeckEngine.shuffle(DeckEngine.createStandardDeck());
      final hands = DhihaehEngine.deal3PassBatch(shuffledDeck: deck, dealerSeat: 3);

      expect(hands.length, equals(4));
      for (int i = 0; i < 4; i++) {
        expect(hands[i].length, equals(13));
      }

      // Check all 52 cards are accounted for
      final allCards = hands.expand((h) => h).map((c) => c.id).toSet();
      expect(allCards.length, equals(52));
    });

    test('resolveTrickWinner obeys lead suit and trump suit cutting', () {
      // Trick without trump: highest of lead suit wins
      final trickNoTrump = DhihaehTrick(
        trickNumber: 1,
        leadSuit: Suit.spades,
        cards: const [
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-07', suit: Suit.spades, rank: 7),
            playedBySeat: 0,
          ),
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-13', suit: Suit.spades, rank: 13), // King of Spades
            playedBySeat: 1,
          ),
          DhihaehTrickCard(
            card: PlayingCard(id: 'H-01', suit: Suit.hearts, rank: 1), // Ace of Hearts (off-suit, non-trump)
            playedBySeat: 2,
          ),
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-10', suit: Suit.spades, rank: 10),
            playedBySeat: 3,
          ),
        ],
      );
      final winnerNoTrump = DhihaehValidator.resolveTrickWinner(trickNoTrump, null);
      expect(winnerNoTrump, equals(1)); // Seat 1 King of Spades wins

      // Trick with trump cut: Hearts is trump, Seat 2 trump cut wins over Spades King
      final winnerWithTrump = DhihaehValidator.resolveTrickWinner(trickNoTrump, Suit.hearts);
      expect(winnerWithTrump, equals(2)); // Seat 2 Ace of Hearts wins
    });

    test('evaluateRoundScore handles Haasbagga (4 Tens + 13 tricks) & Bagga (4 Tens + <13 tricks)', () {
      final haasbagga = DhihaehEngine.evaluateRoundScore(
        team1Tens: 4,
        team2Tens: 0,
        team1Tricks: 13,
        team2Tricks: 0,
        team1PreviousScore: 0,
        team2PreviousScore: 0,
      );

      expect(haasbagga.outcomeType, equals(DhihaehOutcome.haasbagga));
      expect(haasbagga.handWinnerTeam, equals('TEAM_1'));
      expect(haasbagga.team1Score, equals(1000));
      expect(haasbagga.team2Score, equals(0));

      final bagga = DhihaehEngine.evaluateRoundScore(
        team1Tens: 4,
        team2Tens: 0,
        team1Tricks: 8,
        team2Tricks: 5,
        team1PreviousScore: 0,
        team2PreviousScore: 0,
      );

      expect(bagga.outcomeType, equals(DhihaehOutcome.bagga));
      expect(bagga.handWinnerTeam, equals('TEAM_1'));
      expect(bagga.team1Score, equals(4));
      expect(bagga.team2Score, equals(0));
    });

    test('evaluateRoundScore handles 3 Tens (+1 pt) & 2-2 Tens tie breaker (0 pts)', () {
      final standard = DhihaehEngine.evaluateRoundScore(
        team1Tens: 3,
        team2Tens: 1,
        team1Tricks: 9,
        team2Tricks: 4,
        team1PreviousScore: 2,
        team2PreviousScore: 1,
      );
      expect(standard.outcomeType, equals(DhihaehOutcome.standard));
      expect(standard.handWinnerTeam, equals('TEAM_1'));
      expect(standard.team1Score, equals(3));

      final tieBreak = DhihaehEngine.evaluateRoundScore(
        team1Tens: 2,
        team2Tens: 2,
        team1Tricks: 8,
        team2Tricks: 5,
        team1PreviousScore: 1,
        team2PreviousScore: 1,
      );

      expect(tieBreak.outcomeType, equals(DhihaehOutcome.tieBreaker));
      expect(tieBreak.handWinnerTeam, equals('TEAM_1'));
      expect(tieBreak.team1Score, equals(1));
      expect(tieBreak.team2Score, equals(1));
    });
  });

  group('DhihaehAI Tests', () {
    test('AI follows lead suit when possible', () {
      const bot = DhihaehPlayer(
        id: 'bot-1',
        name: 'East AI',
        seatIndex: 1,
        teamId: 'TEAM_2',
        isAI: true,
        hand: [
          PlayingCard(id: 'S-04', suit: Suit.spades, rank: 4),
          PlayingCard(id: 'H-09', suit: Suit.hearts, rank: 9),
        ],
      );

      const trick = DhihaehTrick(
        trickNumber: 1,
        leadSuit: Suit.spades,
        cards: [
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-07', suit: Suit.spades, rank: 7),
            playedBySeat: 0,
          ),
        ],
      );

      final choice = DhihaehAI.selectCardToPlay(
        bot: bot,
        currentTrick: trick,
        trumpSuit: null,
        partnerSeat: 3,
      );

      expect(choice.suit, equals(Suit.spades));
    });

    test('AI feeds Ten to partner when partner is winning the trick', () {
      const bot = DhihaehPlayer(
        id: 'bot-1',
        name: 'East AI',
        seatIndex: 1,
        teamId: 'TEAM_2',
        isAI: true,
        hand: [
          PlayingCard(id: 'S-10', suit: Suit.spades, rank: 10),
          PlayingCard(id: 'S-03', suit: Suit.spades, rank: 3),
        ],
      );

      // Seat 3 is partner of Seat 1 and is currently winning with Ace of Spades
      const trick = DhihaehTrick(
        trickNumber: 2,
        leadSuit: Suit.spades,
        cards: [
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-05', suit: Suit.spades, rank: 5),
            playedBySeat: 0,
          ),
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-01', suit: Suit.spades, rank: 1), // Ace of Spades (partner winning)
            playedBySeat: 3,
          ),
        ],
      );

      final choice = DhihaehAI.selectCardToPlay(
        bot: bot,
        currentTrick: trick,
        trumpSuit: null,
        partnerSeat: 3,
      );

      expect(choice.rank, equals(10)); // AI dumps Ten to partner
    });

    test('AI executes Dynamic Cut with highest card in strongest suit when void and no trump', () {
      const bot = DhihaehPlayer(
        id: 'bot-1',
        name: 'East AI',
        seatIndex: 1,
        teamId: 'TEAM_2',
        isAI: true,
        hand: [
          PlayingCard(id: 'H-01', suit: Suit.hearts, rank: 1),
          PlayingCard(id: 'H-13', suit: Suit.hearts, rank: 13),
          PlayingCard(id: 'H-05', suit: Suit.hearts, rank: 5),
          PlayingCard(id: 'D-02', suit: Suit.diamonds, rank: 2),
        ],
      );

      const trick = DhihaehTrick(
        trickNumber: 2,
        leadSuit: Suit.spades,
        cards: [
          DhihaehTrickCard(
            card: PlayingCard(id: 'S-12', suit: Suit.spades, rank: 12),
            playedBySeat: 0,
          ),
        ],
      );

      final choice = DhihaehAI.selectCardToPlay(
        bot: bot,
        currentTrick: trick,
        trumpSuit: null,
        partnerSeat: 3,
      );

      expect(choice.suit, equals(Suit.hearts));
    });
  });
}
