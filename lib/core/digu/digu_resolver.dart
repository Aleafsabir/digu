import '../models/card_models.dart';
import 'rummy_validator.dart';
import 'team_solver.dart';

/// Supported table formats for Maldivian Digu (10-Card Rummy).
enum DiguTableFormat {
  duel1v1,
  partners2v2,
  freeForAll4p;

  String get displayLabel {
    switch (this) {
      case DiguTableFormat.duel1v1:
        return '1v1 Duel';
      case DiguTableFormat.partners2v2:
        return '2v2 Partners';
      case DiguTableFormat.freeForAll4p:
        return '4P Free-For-All';
    }
  }

  String get shortLabel {
    switch (this) {
      case DiguTableFormat.duel1v1:
        return '1v1';
      case DiguTableFormat.partners2v2:
        return '2v2 Partners';
      case DiguTableFormat.freeForAll4p:
        return '4P FFA';
    }
  }

  int get defaultTargetScore =>
      this == DiguTableFormat.duel1v1 ? 500 : 1000;

  List<int> get activeSeats =>
      this == DiguTableFormat.duel1v1 ? const [0, 2] : const [0, 1, 2, 3];
}

class DiguPlayerRoundScore {
  final int seatIndex;
  final String name;
  final String? teamId;
  final List<List<PlayingCard>> melds;
  final List<PlayingCard> deadwood;
  final bool isWinner;
  final bool hasGin;
  final bool hasThousandPointRun;
  final bool hasZeroMelds;
  final int meldScore;
  final int deadwoodDebt;
  final int ginBonus;
  final int specialBonus;
  final int zeroMeldPenalty;
  final int consecutiveGinPenalty;
  final int netRoundScore;
  final int previousCumulativeScore;
  final int newCumulativeScore;

  const DiguPlayerRoundScore({
    required this.seatIndex,
    required this.name,
    this.teamId,
    required this.melds,
    required this.deadwood,
    required this.isWinner,
    required this.hasGin,
    required this.hasThousandPointRun,
    required this.hasZeroMelds,
    required this.meldScore,
    required this.deadwoodDebt,
    required this.ginBonus,
    required this.specialBonus,
    required this.zeroMeldPenalty,
    required this.consecutiveGinPenalty,
    required this.netRoundScore,
    required this.previousCumulativeScore,
    required this.newCumulativeScore,
  });
}

class DiguRoundResolution {
  final int winnerSeat;
  final String? winningTeamId;
  final bool isThousandPointRun;
  final PlayingCard? finishCard;
  final Map<int, DiguPlayerRoundScore> playerScores;
  final List<int> updatedConsecutiveGins;
  final int team1RoundScore;
  final int team2RoundScore;
  final int team1CumulativeScore;
  final int team2CumulativeScore;
  final bool matchOver;
  final int? matchWinnerSeat;
  final String? matchWinningTeamId;

  const DiguRoundResolution({
    required this.winnerSeat,
    this.winningTeamId,
    required this.isThousandPointRun,
    required this.finishCard,
    required this.playerScores,
    required this.updatedConsecutiveGins,
    required this.team1RoundScore,
    required this.team2RoundScore,
    required this.team1CumulativeScore,
    required this.team2CumulativeScore,
    required this.matchOver,
    this.matchWinnerSeat,
    this.matchWinningTeamId,
  });
}

class DiguRoundResolver {
  static String _defaultSeatName(int seat, DiguTableFormat format) {
    switch (seat) {
      case 0:
        return 'You (South)';
      case 1:
        return 'East AI';
      case 2:
        return format == DiguTableFormat.partners2v2
            ? 'North Partner'
            : 'North Bot';
      case 3:
      default:
        return 'West AI';
    }
  }

  /// Resolves a completed Digu round across 1v1 Duel, 2v2 Partners, or 4P Free-For-All.
  ///
  /// [hands] is indexed by seat (0..3). Only the declaring player's 10-card remaining
  /// hand (excluding [finishCard]) should be passed at [declaringSeat].
  static DiguRoundResolution resolveRound({
    required DiguTableFormat format,
    required List<List<PlayingCard>> hands,
    required int declaringSeat,
    required PlayingCard? finishCard,
    List<int>? previousCumulativeScores,
    List<int>? previousConsecutiveGins,
    int targetScore = 1000,
    Map<int, String>? seatNames,
  }) {
    final activeSeats = format.activeSeats;
    final prevScores = List<int>.generate(
      4,
      (i) => (previousCumulativeScores != null && i < previousCumulativeScores.length)
          ? previousCumulativeScores[i]
          : 0,
    );
    final prevGins = List<int>.generate(
      4,
      (i) => (previousConsecutiveGins != null && i < previousConsecutiveGins.length)
          ? previousConsecutiveGins[i]
          : 0,
    );

    final declarerHand =
        hands[declaringSeat].map((c) => c.copyWith(isFaceDown: false)).toList();
    final isThousandRun = RummyValidator.checkThousandPointRun(declarerHand);
    final declarerOpt = TeamHandOptimizer.optimizeMergedHand(declarerHand);
    final isStandardGin = !isThousandRun &&
        declarerOpt.debtScore == 0 &&
        RummyValidator.isValidGinHand(declarerOpt.melds);

    if (!isThousandRun && !isStandardGin) {
      throw ArgumentError(
        'Invalid declaration at seat $declaringSeat: neither 4+3+3 Gin nor 1,000-point run.',
      );
    }

    final updatedConsecutiveGins = List<int>.filled(4, 0);
    updatedConsecutiveGins[declaringSeat] = prevGins[declaringSeat] + 1;
    final isThreeConsecutiveGins = updatedConsecutiveGins[declaringSeat] >= 3;

    // Anti-clockwise upstream feeder seat: (winner - 1 + numPlayers) % numPlayers
    final feederSeat = format == DiguTableFormat.duel1v1
        ? (declaringSeat == 0 ? 2 : 0)
        : (declaringSeat - 1 + 4) % 4;

    if (format == DiguTableFormat.partners2v2) {
      return _resolveTeamRound(
        format: format,
        hands: hands,
        declaringSeat: declaringSeat,
        finishCard: finishCard,
        isThousandRun: isThousandRun,
        isThreeConsecutiveGins: isThreeConsecutiveGins,
        feederSeat: feederSeat,
        prevScores: prevScores,
        updatedConsecutiveGins: updatedConsecutiveGins,
        targetScore: targetScore,
        seatNames: seatNames,
      );
    }

    return _resolveSoloRound(
      format: format,
      activeSeats: activeSeats,
      hands: hands,
      declaringSeat: declaringSeat,
      declarerHand: declarerHand,
      declarerOpt: declarerOpt,
      finishCard: finishCard,
      isThousandRun: isThousandRun,
      isThreeConsecutiveGins: isThreeConsecutiveGins,
      feederSeat: feederSeat,
      prevScores: prevScores,
      updatedConsecutiveGins: updatedConsecutiveGins,
      targetScore: targetScore,
      seatNames: seatNames,
    );
  }

  static DiguRoundResolution _resolveSoloRound({
    required DiguTableFormat format,
    required List<int> activeSeats,
    required List<List<PlayingCard>> hands,
    required int declaringSeat,
    required List<PlayingCard> declarerHand,
    required MergeOptimizationResult declarerOpt,
    required PlayingCard? finishCard,
    required bool isThousandRun,
    required bool isThreeConsecutiveGins,
    required int feederSeat,
    required List<int> prevScores,
    required List<int> updatedConsecutiveGins,
    required int targetScore,
    Map<int, String>? seatNames,
  }) {
    final Map<int, DiguPlayerRoundScore> playerScores = {};
    int? matchWinnerSeat;

    for (final seat in activeSeats) {
      final name = seatNames?[seat] ?? _defaultSeatName(seat, format);
      final prevCum = prevScores[seat];

      if (seat == declaringSeat) {
        final meldScore = RummyValidator.sumPoints(declarerHand);
        final ginBonus = isThousandRun ? 0 : 100;
        final specialBonus = isThousandRun ? 1000 : 0;
        final netRoundScore = isThousandRun ? 1000 : (meldScore + ginBonus);
        final newCum = prevCum + netRoundScore;

        playerScores[seat] = DiguPlayerRoundScore(
          seatIndex: seat,
          name: name,
          melds: isThousandRun ? [declarerHand] : declarerOpt.melds,
          deadwood: const [],
          isWinner: true,
          hasGin: !isThousandRun,
          hasThousandPointRun: isThousandRun,
          hasZeroMelds: false,
          meldScore: meldScore,
          deadwoodDebt: 0,
          ginBonus: ginBonus,
          specialBonus: specialBonus,
          zeroMeldPenalty: 0,
          consecutiveGinPenalty: 0,
          netRoundScore: netRoundScore,
          previousCumulativeScore: prevCum,
          newCumulativeScore: newCum,
        );

        if (newCum >= targetScore) {
          matchWinnerSeat = seat;
        }
      } else {
        final oppHand =
            hands[seat].map((c) => c.copyWith(isFaceDown: false)).toList();
        final opt = TeamHandOptimizer.optimizeMergedHand(oppHand);
        final hasZeroMelds = opt.melds.isEmpty;
        final isFeeder = isThreeConsecutiveGins && seat == feederSeat;

        int zeroMeldPenalty = 0;
        int consecutiveGinPenalty = 0;
        int meldScore = 0;
        int deadwoodDebt = 0;
        int netRoundScore = 0;

        if (isFeeder) {
          consecutiveGinPenalty = -100;
          netRoundScore = -100;
        } else if (hasZeroMelds) {
          zeroMeldPenalty = -100;
          netRoundScore = -100;
        } else {
          meldScore = opt.meldScore;
          deadwoodDebt = -opt.debtScore;
          netRoundScore = opt.netScore;
        }

        final newCum = prevCum + netRoundScore;
        playerScores[seat] = DiguPlayerRoundScore(
          seatIndex: seat,
          name: name,
          melds: opt.melds,
          deadwood: opt.deadwood,
          isWinner: false,
          hasGin: false,
          hasThousandPointRun: false,
          hasZeroMelds: hasZeroMelds,
          meldScore: meldScore,
          deadwoodDebt: deadwoodDebt,
          ginBonus: 0,
          specialBonus: 0,
          zeroMeldPenalty: zeroMeldPenalty,
          consecutiveGinPenalty: consecutiveGinPenalty,
          netRoundScore: netRoundScore,
          previousCumulativeScore: prevCum,
          newCumulativeScore: newCum,
        );
      }
    }

    // Track highest opponent score for legacy dual score displays
    final humanScore = playerScores[0]?.netRoundScore ?? 0;
    final bestOppScore = activeSeats
        .where((s) => s != 0)
        .map((s) => playerScores[s]?.netRoundScore ?? 0)
        .fold<int>(
          playerScores[2]?.netRoundScore ?? 0,
          (a, b) => a > b ? a : b,
        );
    final humanCum = playerScores[0]?.newCumulativeScore ?? 0;
    final oppCum = activeSeats
        .where((s) => s != 0)
        .map((s) => playerScores[s]?.newCumulativeScore ?? 0)
        .fold<int>(
          playerScores[2]?.newCumulativeScore ?? 0,
          (a, b) => a > b ? a : b,
        );

    return DiguRoundResolution(
      winnerSeat: declaringSeat,
      isThousandPointRun: isThousandRun,
      finishCard: finishCard,
      playerScores: playerScores,
      updatedConsecutiveGins: updatedConsecutiveGins,
      team1RoundScore: humanScore,
      team2RoundScore: bestOppScore,
      team1CumulativeScore: humanCum,
      team2CumulativeScore: oppCum,
      matchOver: matchWinnerSeat != null,
      matchWinnerSeat: matchWinnerSeat,
    );
  }

  static DiguRoundResolution _resolveTeamRound({
    required DiguTableFormat format,
    required List<List<PlayingCard>> hands,
    required int declaringSeat,
    required PlayingCard? finishCard,
    required bool isThousandRun,
    required bool isThreeConsecutiveGins,
    required int feederSeat,
    required List<int> prevScores,
    required List<int> updatedConsecutiveGins,
    required int targetScore,
    Map<int, String>? seatNames,
  }) {
    final winningTeamId = declaringSeat % 2 == 0 ? 'TEAM_A' : 'TEAM_B';
    final winningTeamSeats = winningTeamId == 'TEAM_A' ? const [0, 2] : const [1, 3];
    final losingTeamSeats = winningTeamId == 'TEAM_A' ? const [1, 3] : const [0, 2];

    final winCards = [
      for (final s in winningTeamSeats)
        ...hands[s].map((c) => c.copyWith(isFaceDown: false)),
    ];
    final loseCards = [
      for (final s in losingTeamSeats)
        ...hands[s].map((c) => c.copyWith(isFaceDown: false)),
    ];

    final winOpt = TeamHandOptimizer.optimizeMergedHand(winCards);
    final loseOpt = TeamHandOptimizer.optimizeMergedHand(loseCards);

    final int winGinBonus = isThousandRun ? 0 : 100;
    final int winSpecialBonus = isThousandRun ? 1000 : 0;
    final int winNetScore =
        isThousandRun ? 1000 : (winOpt.netScore + winGinBonus);

    final bool loseHasZeroMelds = loseOpt.melds.isEmpty;
    int loseZeroMeldPenalty = 0;
    int loseNetScore = 0;

    if (isThreeConsecutiveGins) {
      loseNetScore = -100;
    } else if (loseHasZeroMelds) {
      loseZeroMeldPenalty = -100;
      loseNetScore = -100;
    } else {
      loseNetScore = loseOpt.netScore;
    }

    final winPlayerShare = (winNetScore / 2).round();
    final losePlayerShare = (loseNetScore / 2).round();

    final Map<int, DiguPlayerRoundScore> playerScores = {};
    for (int seat = 0; seat < 4; seat++) {
      final isWinner = winningTeamSeats.contains(seat);
      final isFeeder = isThreeConsecutiveGins && seat == feederSeat;
      final teamId = seat % 2 == 0 ? 'TEAM_A' : 'TEAM_B';
      final name = seatNames?[seat] ?? _defaultSeatName(seat, format);
      final prevCum = prevScores[seat];

      if (isWinner) {
        final newCum = prevCum + winPlayerShare;
        playerScores[seat] = DiguPlayerRoundScore(
          seatIndex: seat,
          name: name,
          teamId: teamId,
          melds: winOpt.melds,
          deadwood: winOpt.deadwood,
          isWinner: true,
          hasGin: !isThousandRun,
          hasThousandPointRun: isThousandRun && seat == declaringSeat,
          hasZeroMelds: false,
          meldScore: (winOpt.meldScore / 2).round(),
          deadwoodDebt: -(winOpt.debtScore / 2).round(),
          ginBonus: (winGinBonus / 2).round(),
          specialBonus: (winSpecialBonus / 2).round(),
          zeroMeldPenalty: 0,
          consecutiveGinPenalty: 0,
          netRoundScore: winPlayerShare,
          previousCumulativeScore: prevCum,
          newCumulativeScore: newCum,
        );
      } else {
        final netShare = isFeeder ? -100 : losePlayerShare;
        final newCum = prevCum + netShare;
        playerScores[seat] = DiguPlayerRoundScore(
          seatIndex: seat,
          name: name,
          teamId: teamId,
          melds: loseOpt.melds,
          deadwood: loseOpt.deadwood,
          isWinner: false,
          hasGin: false,
          hasThousandPointRun: false,
          hasZeroMelds: loseHasZeroMelds,
          meldScore: loseHasZeroMelds ? 0 : (loseOpt.meldScore / 2).round(),
          deadwoodDebt: loseHasZeroMelds ? 0 : -(loseOpt.debtScore / 2).round(),
          ginBonus: 0,
          specialBonus: 0,
          zeroMeldPenalty: loseZeroMeldPenalty != 0 ? (loseZeroMeldPenalty / 2).round() : 0,
          consecutiveGinPenalty: isFeeder ? -100 : 0,
          netRoundScore: netShare,
          previousCumulativeScore: prevCum,
          newCumulativeScore: newCum,
        );
      }
    }

    final team1Round = winningTeamId == 'TEAM_A' ? winNetScore : loseNetScore;
    final team2Round = winningTeamId == 'TEAM_B' ? winNetScore : loseNetScore;
    final team1Cum =
        (playerScores[0]?.newCumulativeScore ?? 0) +
        (playerScores[2]?.newCumulativeScore ?? 0);
    final team2Cum =
        (playerScores[1]?.newCumulativeScore ?? 0) +
        (playerScores[3]?.newCumulativeScore ?? 0);

    String? matchWinningTeam;
    if (team1Cum >= targetScore && team1Cum >= team2Cum) {
      matchWinningTeam = 'TEAM_A';
    } else if (team2Cum >= targetScore) {
      matchWinningTeam = 'TEAM_B';
    }

    return DiguRoundResolution(
      winnerSeat: declaringSeat,
      winningTeamId: winningTeamId,
      isThousandPointRun: isThousandRun,
      finishCard: finishCard,
      playerScores: playerScores,
      updatedConsecutiveGins: updatedConsecutiveGins,
      team1RoundScore: team1Round,
      team2RoundScore: team2Round,
      team1CumulativeScore: team1Cum,
      team2CumulativeScore: team2Cum,
      matchOver: matchWinningTeam != null,
      matchWinningTeamId: matchWinningTeam,
    );
  }
}
