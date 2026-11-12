import '../models/card_models.dart';
import 'rummy_validator.dart';

class MergeOptimizationResult {
  final List<List<PlayingCard>> melds;
  final List<PlayingCard> deadwood;
  final int meldScore;
  final int debtScore;
  final int netScore;

  const MergeOptimizationResult({
    required this.melds,
    required this.deadwood,
    required this.meldScore,
    required this.debtScore,
    required this.netScore,
  });
}

class TeamHandOptimizer {
  static List<List<T>> _getSubsets<T>(List<T> array, int size) {
    if (size == 0) return [[]];
    if (array.isEmpty) return [];
    final head = array.first;
    final tail = array.sublist(1);
    final withHead =
        _getSubsets(tail, size - 1).map((subset) => [head, ...subset]).toList();
    final withoutHead = _getSubsets(tail, size);
    return [...withHead, ...withoutHead];
  }

  /// Extracts all valid candidate melds (Sets of 3 or 4, Runs of 3 to 7) from cards.
  /// Strictly enforces the Ace rule: Aces cannot be in runs.
  static List<List<PlayingCard>> extractCandidateMelds(
      List<PlayingCard> cards) {
    final List<List<PlayingCard>> candidates = [];

    // 1. Sets (Aces allowed)
    final Map<int, List<PlayingCard>> rankMap = {};
    for (final c in cards) {
      rankMap.putIfAbsent(c.rank, () => []).add(c);
    }

    for (final group in rankMap.values) {
      if (group.length >= 3) {
        candidates.addAll(_getSubsets(group, 3));
      }
      if (group.length == 4) {
        candidates.add(group);
      }
    }

    // 2. Runs (Aces excluded)
    final Map<Suit, List<PlayingCard>> suitMap = {};
    for (final c in cards.where((c) => c.rank != 1)) {
      suitMap.putIfAbsent(c.suit, () => []).add(c);
    }

    for (final group in suitMap.values) {
      final sorted = List<PlayingCard>.from(group)
        ..sort((a, b) => a.rank.compareTo(b.rank));

      for (int len = 3; len <= sorted.length && len <= 7; len++) {
        for (int i = 0; i <= sorted.length - len; i++) {
          final slice = sorted.sublist(i, i + len);
          if (RummyValidator.isValidRun(slice)) {
            candidates.add(slice);
          }
        }
      }
    }

    return candidates;
  }

  /// Backtracking combinatorial solver for merged team hands (20 cards)
  /// or individual hands (10 cards).
  /// Finds the disjoint partition of melds that maximizes:
  /// Net Score = sum(meld points) - sum(deadwood debt points)
  static MergeOptimizationResult optimizeMergedHand(List<PlayingCard> cards) {
    final candidates = extractCandidateMelds(cards);
    final totalCardPoints = cards.fold(
        0, (sum, c) => sum + RummyValidator.getCardPoints(c.rank));

    int bestNetScore = -totalCardPoints;
    List<List<PlayingCard>> bestMelds = [];

    final cardPointsMap = <String, int>{
      for (final c in cards) c.id: RummyValidator.getCardPoints(c.rank),
    };

    final candidatePoints = candidates
        .map((meld) =>
            meld.fold(0, (sum, c) => sum + (cardPointsMap[c.id] ?? 0)))
        .toList();

    final sortedIndices = List.generate(candidates.length, (i) => i)
      ..sort((a, b) => candidatePoints[b].compareTo(candidatePoints[a]));

    final sortedCandidates = [for (final i in sortedIndices) candidates[i]];
    final sortedCandidatePoints = [
      for (final i in sortedIndices) candidatePoints[i]
    ];

    void search(
      int index,
      Set<String> usedIds,
      List<List<PlayingCard>> currentMelds,
      int currentMeldPoints,
    ) {
      final currentDebtPoints = totalCardPoints - currentMeldPoints;
      final currentNet = currentMeldPoints - currentDebtPoints;

      if (currentNet > bestNetScore) {
        bestNetScore = currentNet;
        bestMelds = List.from(currentMelds);
      }

      for (int i = index; i < sortedCandidates.length; i++) {
        final meld = sortedCandidates[i];

        bool hasConflict = false;
        for (final c in meld) {
          if (usedIds.contains(c.id)) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          for (final c in meld) {
            usedIds.add(c.id);
          }
          currentMelds.add(meld);

          search(
            i + 1,
            usedIds,
            currentMelds,
            currentMeldPoints + sortedCandidatePoints[i],
          );

          for (final c in meld) {
            usedIds.remove(c.id);
          }
          currentMelds.removeLast();
        }
      }
    }

    search(0, <String>{}, [], 0);

    final usedCardIds = {
      for (final meld in bestMelds)
        for (final c in meld) c.id
    };
    final deadwood = cards.where((c) => !usedCardIds.contains(c.id)).toList();
    final meldScore = bestMelds
        .expand((m) => m)
        .fold(0, (sum, c) => sum + (cardPointsMap[c.id] ?? 0));
    final debtScore =
        deadwood.fold(0, (sum, c) => sum + (cardPointsMap[c.id] ?? 0));

    return MergeOptimizationResult(
      melds: bestMelds,
      deadwood: deadwood,
      meldScore: meldScore,
      debtScore: debtScore,
      netScore: meldScore - debtScore,
    );
  }
}
