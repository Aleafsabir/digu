import '../models/card_models.dart';
import '../digu/rummy_validator.dart';
import '../digu/team_solver.dart';

class AIDecisionResult {
  final bool isGinSlam;
  final PlayingCard cardToDiscard;
  final String? reason;

  const AIDecisionResult({
    required this.isGinSlam,
    required this.cardToDiscard,
    this.reason,
  });
}

class DiguAI {
  /// Evaluates whether the bot should draw the top face-up card of the Discard pile
  /// or draw a hidden card from the Stock pile.
  static bool shouldDrawDiscard({
    required List<PlayingCard> botHand,
    required PlayingCard? topDiscard,
  }) {
    if (topDiscard == null) return false;

    // 1. Strict Ace Rule Defense:
    // Never draw an Ace unless holding at least 2 Aces to form a set,
    // because unmelded Aces carry a devastating -15 debt penalty!
    if (topDiscard.rank == 1) {
      final existingAces = botHand.where((c) => c.rank == 1).length;
      if (existingAces < 2) return false;
    }

    // 2. 1,000-Point Run Check:
    final sameSuit = botHand.where((c) => c.suit == topDiscard.suit).toList();
    if (sameSuit.length >= 7) {
      final candidateRun = [...sameSuit, topDiscard];
      if (RummyValidator.checkThousandPointRun(candidateRun)) {
        return true;
      }
    }

    // 3. Optimization Evaluation:
    // Check if adding the discard card directly improves net score / reduces deadwood
    final currentOpt = TeamHandOptimizer.optimizeMergedHand(botHand);
    final testHand = [...botHand, topDiscard];

    int bestDebtWithDiscard = 9999;
    bool formsNewMeld = false;

    for (int i = 0; i < testHand.length; i++) {
      final subset10 = [
        for (int j = 0; j < testHand.length; j++)
          if (j != i) testHand[j]
      ];
      final res = TeamHandOptimizer.optimizeMergedHand(subset10);
      if (res.debtScore < bestDebtWithDiscard) {
        bestDebtWithDiscard = res.debtScore;
        if (res.melds.length > currentOpt.melds.length) {
          formsNewMeld = true;
        }
      }
    }

    if (bestDebtWithDiscard < currentOpt.debtScore) return true;
    if (formsNewMeld && bestDebtWithDiscard <= currentOpt.debtScore) return true;

    // Check for pairs (forming potential 3-card sets)
    final matchingRank = botHand.where((c) => c.rank == topDiscard.rank).length;
    if (matchingRank == 2) return true;

    return false;
  }

  /// From an 11-card hand, evaluate which card to discard,
  /// and determine if the bot can declare GIN SLAM.
  static AIDecisionResult chooseBestAction(List<PlayingCard> hand11) {
    if (hand11.length != 11) {
      throw ArgumentError('AI requires 11 cards to decide discard');
    }

    // 1. Check for 1,000-Point Run
    for (int i = 0; i < hand11.length; i++) {
      final finishCard = hand11[i];
      final subset10 = [
        for (int j = 0; j < hand11.length; j++)
          if (j != i) hand11[j]
      ];
      if (RummyValidator.checkThousandPointRun(subset10)) {
        return AIDecisionResult(
          isGinSlam: true,
          cardToDiscard: finishCard,
          reason: '1,000-Point Suited Run completed!',
        );
      }
    }

    // 2. Check for Standard Gin (0 deadwood)
    for (int i = 0; i < hand11.length; i++) {
      final finishCard = hand11[i];
      final subset10 = [
        for (int j = 0; j < hand11.length; j++)
          if (j != i) hand11[j]
      ];
      final opt = TeamHandOptimizer.optimizeMergedHand(subset10);
      if (opt.debtScore == 0 && RummyValidator.isValidGinHand(opt.melds)) {
        return AIDecisionResult(
          isGinSlam: true,
          cardToDiscard: finishCard,
          reason: 'Standard 4+3+3 Gin with 0 Deadwood completed!',
        );
      }
    }

    // 3. Evaluate best discard to minimize deadwood debt
    PlayingCard bestDiscard = hand11.first;
    int lowestDebt = 9999;
    int highestNet = -9999;

    for (int i = 0; i < hand11.length; i++) {
      final candidateToDiscard = hand11[i];
      final remaining10 = [
        for (int j = 0; j < hand11.length; j++)
          if (j != i) hand11[j]
      ];
      final opt = TeamHandOptimizer.optimizeMergedHand(remaining10);

      // Isolated Ace Defense: Discarding an unmelded Ace eliminates -15 debt!
      int adjustedDebt = opt.debtScore;
      if (candidateToDiscard.rank == 1 && opt.deadwood.contains(candidateToDiscard)) {
        adjustedDebt -= 15;
      }

      if (adjustedDebt < lowestDebt || (adjustedDebt == lowestDebt && opt.netScore > highestNet)) {
        lowestDebt = adjustedDebt;
        highestNet = opt.netScore;
        bestDiscard = candidateToDiscard;
      }
    }

    return AIDecisionResult(
      isGinSlam: false,
      cardToDiscard: bestDiscard,
    );
  }
}
