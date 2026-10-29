import '../models/card_models.dart';
import 'team_solver.dart';

enum HandSortMode {
  melds,
  suit,
  rank,
}

class HandSorter {
  /// Sort cards by Melds first, then Deadwood by rank
  static List<PlayingCard> sortByMelds(List<PlayingCard> hand) {
    final opt = TeamHandOptimizer.optimizeMergedHand(hand);
    final sorted = <PlayingCard>[];

    // 1. Add all cards currently in valid melds
    for (final meld in opt.melds) {
      sorted.addAll(meld);
    }

    // 2. Add remaining deadwood sorted by rank
    final deadwood = List<PlayingCard>.from(opt.deadwood)
      ..sort((a, b) => a.rank.compareTo(b.rank));
    sorted.addAll(deadwood);

    return sorted;
  }

  /// Sort cards grouped by Suit, then by Rank
  static List<PlayingCard> sortBySuit(List<PlayingCard> hand) {
    return List<PlayingCard>.from(hand)
      ..sort((a, b) {
        if (a.suit != b.suit) {
          return a.suit.index.compareTo(b.suit.index);
        }
        return a.rank.compareTo(b.rank);
      });
  }

  /// Sort cards strictly by Rank (1 to 13)
  static List<PlayingCard> sortByRank(List<PlayingCard> hand) {
    return List<PlayingCard>.from(hand)
      ..sort((a, b) {
        if (a.rank != b.rank) {
          return a.rank.compareTo(b.rank);
        }
        return a.suit.index.compareTo(b.suit.index);
      });
  }
}
