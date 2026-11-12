import '../models/card_models.dart';

enum DhihaehVariant {
  dynamicCut,
  blindReserve,
}

enum DhihaehPhase {
  dealing,
  trickPlay,
  roundOver,
  matchOver,
}

enum DhihaehOutcome {
  haasbagga, // All 4 Tens captured = 1000 points auto win
  bagga,      // 4 points
  standard,   // 3-1 or 2-2 tie-break
  tieBreaker,
}

class DhihaehTrickCard {
  final PlayingCard card;
  final int playedBySeat;

  const DhihaehTrickCard({
    required this.card,
    required this.playedBySeat,
  });
}

class DhihaehTrick {
  final int trickNumber; // 1 to 13
  final Suit? leadSuit;
  final List<DhihaehTrickCard> cards;
  final int? winnerSeat;

  const DhihaehTrick({
    required this.trickNumber,
    this.leadSuit,
    this.cards = const [],
    this.winnerSeat,
  });

  DhihaehTrick copyWith({
    int? trickNumber,
    Suit? leadSuit,
    List<DhihaehTrickCard>? cards,
    int? winnerSeat,
  }) {
    return DhihaehTrick(
      trickNumber: trickNumber ?? this.trickNumber,
      leadSuit: leadSuit ?? this.leadSuit,
      cards: cards ?? this.cards,
      winnerSeat: winnerSeat ?? this.winnerSeat,
    );
  }
}

class DhihaehPlayer {
  final String id;
  final String name;
  final int seatIndex; // 0: South (Human), 1: East, 2: North (Partner), 3: West (Dealer)
  final String teamId; // Team 1: 0 & 2. Team 2: 1 & 3
  final bool isAI;
  final List<PlayingCard> hand;
  final List<PlayingCard> capturedTens;
  final int tricksWon;
  final PlayingCard? blindReserveCard;

  const DhihaehPlayer({
    required this.id,
    required this.name,
    required this.seatIndex,
    required this.teamId,
    required this.isAI,
    required this.hand,
    this.capturedTens = const [],
    this.tricksWon = 0,
    this.blindReserveCard,
  });

  DhihaehPlayer copyWith({
    List<PlayingCard>? hand,
    List<PlayingCard>? capturedTens,
    int? tricksWon,
    PlayingCard? blindReserveCard,
  }) {
    return DhihaehPlayer(
      id: id,
      name: name,
      seatIndex: seatIndex,
      teamId: teamId,
      isAI: isAI,
      hand: hand ?? this.hand,
      capturedTens: capturedTens ?? this.capturedTens,
      tricksWon: tricksWon ?? this.tricksWon,
      blindReserveCard: blindReserveCard ?? this.blindReserveCard,
    );
  }
}

class DhihaehScore {
  final int team1Score;
  final int team2Score;
  final int team1Tens;
  final int team2Tens;
  final int team1Tricks;
  final int team2Tricks;
  final DhihaehOutcome? outcomeType;
  final String? handWinnerTeam;

  const DhihaehScore({
    this.team1Score = 0,
    this.team2Score = 0,
    this.team1Tens = 0,
    this.team2Tens = 0,
    this.team1Tricks = 0,
    this.team2Tricks = 0,
    this.outcomeType,
    this.handWinnerTeam,
  });

  DhihaehScore copyWith({
    int? team1Score,
    int? team2Score,
    int? team1Tens,
    int? team2Tens,
    int? team1Tricks,
    int? team2Tricks,
    DhihaehOutcome? outcomeType,
    String? handWinnerTeam,
  }) {
    return DhihaehScore(
      team1Score: team1Score ?? this.team1Score,
      team2Score: team2Score ?? this.team2Score,
      team1Tens: team1Tens ?? this.team1Tens,
      team2Tens: team2Tens ?? this.team2Tens,
      team1Tricks: team1Tricks ?? this.team1Tricks,
      team2Tricks: team2Tricks ?? this.team2Tricks,
      outcomeType: outcomeType ?? this.outcomeType,
      handWinnerTeam: handWinnerTeam ?? this.handWinnerTeam,
    );
  }
}

class DhihaehValidator {
  /// Numeric strength in Dhihaeh:
  /// Ace is highest (14), followed by K (13), Q (12), J (11), 10 (10) down to 2.
  static int getCardStrength(PlayingCard card) {
    return card.rank == 1 ? 14 : card.rank;
  }

  static bool hasSuit(List<PlayingCard> hand, Suit suit) {
    return hand.any((c) => c.suit == suit);
  }

  static bool isCardPlayable(
    PlayingCard card,
    List<PlayingCard> hand,
    DhihaehTrick trick,
  ) {
    if (trick.leadSuit == null || trick.cards.isEmpty) {
      return true; // Any card can be led
    }

    final hasLed = hasSuit(hand, trick.leadSuit!);
    if (hasLed) {
      return card.suit == trick.leadSuit;
    }

    // Void in lead suit: can play any card (including trump or off-suit)
    return true;
  }

  /// Resolve the winner seat of a 4-card trick based on lead suit and trump suit.
  static int resolveTrickWinner(DhihaehTrick trick, Suit? trumpSuit) {
    assert(trick.cards.isNotEmpty);
    final leadSuit = trick.leadSuit ?? trick.cards.first.card.suit;

    DhihaehTrickCard winningPlay = trick.cards.first;
    bool isTrumped = trumpSuit != null && winningPlay.card.suit == trumpSuit;

    for (int i = 1; i < trick.cards.length; i++) {
      final play = trick.cards[i];
      final card = play.card;

      if (trumpSuit != null && card.suit == trumpSuit) {
        if (!isTrumped) {
          winningPlay = play;
          isTrumped = true;
        } else if (getCardStrength(card) > getCardStrength(winningPlay.card)) {
          winningPlay = play;
        }
      } else if (!isTrumped && card.suit == leadSuit) {
        if (getCardStrength(card) > getCardStrength(winningPlay.card)) {
          winningPlay = play;
        }
      }
    }

    return winningPlay.playedBySeat;
  }
}

class DhihaehEngine {
  /// Deal 52 cards across 4 players in 3 authentic Maldivian passes (5 - 4 - 4).
  /// Dealing order: Anti-clockwise starting from the player to dealer's right.
  /// When dealerSeat = 3 (West): Pass order is South (0), East (1), North (2), West (3).
  static List<List<PlayingCard>> deal3PassBatch({
    required List<PlayingCard> shuffledDeck,
    int dealerSeat = 3,
  }) {
    assert(shuffledDeck.length == 52);
    final hands = List.generate(4, (_) => <PlayingCard>[]);

    int cardIndex = 0;

    // Pass 1: 5 cards each
    for (int p = 0; p < 4; p++) {
      final seat = (dealerSeat + 1 + p) % 4;
      hands[seat].addAll(shuffledDeck.sublist(cardIndex, cardIndex + 5));
      cardIndex += 5;
    }

    // Pass 2: 4 cards each
    for (int p = 0; p < 4; p++) {
      final seat = (dealerSeat + 1 + p) % 4;
      hands[seat].addAll(shuffledDeck.sublist(cardIndex, cardIndex + 4));
      cardIndex += 4;
    }

    // Pass 3: 4 cards each (completing 13 cards each)
    for (int p = 0; p < 4; p++) {
      final seat = (dealerSeat + 1 + p) % 4;
      hands[seat].addAll(shuffledDeck.sublist(cardIndex, cardIndex + 4));
      cardIndex += 4;
    }

    return hands;
  }

  /// Sort hand by suit and descending card strength for clean display.
  static void sortHand(List<PlayingCard> hand) {
    hand.sort((a, b) {
      if (a.suit != b.suit) return a.suit.index.compareTo(b.suit.index);
      return DhihaehValidator.getCardStrength(b)
          .compareTo(DhihaehValidator.getCardStrength(a));
    });
  }

  /// Evaluate round score given captured Tens and tricks won.
  static DhihaehScore evaluateRoundScore({
    required int team1Tens,
    required int team2Tens,
    required int team1Tricks,
    required int team2Tricks,
    required int team1PreviousScore,
    required int team2PreviousScore,
  }) {
    DhihaehOutcome outcome;
    String handWinner;
    int t1Add = 0;
    int t2Add = 0;

    if (team1Tens == 4) {
      outcome = DhihaehOutcome.haasbagga;
      handWinner = 'TEAM_1';
      t1Add = 1000;
    } else if (team2Tens == 4) {
      outcome = DhihaehOutcome.haasbagga;
      handWinner = 'TEAM_2';
      t2Add = 1000;
    } else if (team1Tens == 3) {
      outcome = DhihaehOutcome.standard;
      handWinner = 'TEAM_1';
      t1Add = team1Tricks >= 7 ? 2 : 1;
    } else if (team2Tens == 3) {
      outcome = DhihaehOutcome.standard;
      handWinner = 'TEAM_2';
      t2Add = team2Tricks >= 7 ? 2 : 1;
    } else {
      // 2 - 2 Tie breaker decided by trick count
      outcome = DhihaehOutcome.tieBreaker;
      if (team1Tricks > team2Tricks) {
        handWinner = 'TEAM_1';
        t1Add = 1;
      } else if (team2Tricks > team1Tricks) {
        handWinner = 'TEAM_2';
        t2Add = 1;
      } else {
        handWinner = 'DRAW';
      }
    }

    return DhihaehScore(
      team1Score: team1PreviousScore + t1Add,
      team2Score: team2PreviousScore + t2Add,
      team1Tens: team1Tens,
      team2Tens: team2Tens,
      team1Tricks: team1Tricks,
      team2Tricks: team2Tricks,
      outcomeType: outcome,
      handWinnerTeam: handWinner,
    );
  }
}
