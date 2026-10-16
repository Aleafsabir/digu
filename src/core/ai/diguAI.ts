import { Card, TableRules } from '../models/types';
import { RummyValidator } from '../engine/validator';
import { TeamHandOptimizer } from '../engine/solver';

export interface AIDecisionResult {
  action: 'DISCARD' | 'GIN_SLAM';
  cardId: string;
  reason?: string;
}

export class DiguAI {
  /**
   * Draw Decision:
   * Should the bot draw the face-up top card of the Discard Pile
   * or draw a hidden card from the Stock Deck?
   */
  static shouldDrawDiscard(
    botHand: Card[],
    topDiscard: Card | null,
    _rules?: TableRules
  ): boolean {
    if (!topDiscard) return false;

    // 1. Strict Ace Rule Defense:
    // If the top discard is an Ace (rank 1), NEVER draw it unless the bot already has
    // at least two Aces (to form a 3-Ace or 4-Ace set).
    // Because unmelded Aces carry a devastating -15 debt penalty!
    if (topDiscard.rank === 1) {
      const existingAces = botHand.filter(c => c.rank === 1).length;
      if (existingAces < 2) {
        return false;
      }
    }

    // 2. 1,000-Point Run Check:
    // If topDiscard directly extends a suited sequence toward a 10-card suited run
    const sameSuitCards = botHand.filter(c => c.suit === topDiscard.suit);
    if (sameSuitCards.length >= 7) {
      const candidateRun = [...sameSuitCards, topDiscard];
      if (RummyValidator.checkThousandPointRun(candidateRun)) {
        return true;
      }
    }

    // 3. Hand Deadwood Optimization Comparison:
    const currentOpt = TeamHandOptimizer.optimizeMergedHand(botHand);
    const currentDebt = currentOpt.debtScore;
    const currentMeldPoints = currentOpt.melds.reduce((sum, m) => sum + RummyValidator.sumPoints(m), 0);

    // Hand with top discard added (11 cards)
    const testHand = [...botHand, topDiscard];

    // Find the best 10-card subset from the 11 cards if we took the discard
    let bestDebtWithDiscard = Infinity;
    let bestMeldPointsWithDiscard = 0;

    for (let i = 0; i < testHand.length; i++) {
      const subset10 = testHand.filter((_, idx) => idx !== i);
      const opt = TeamHandOptimizer.optimizeMergedHand(subset10);
      if (opt.debtScore < bestDebtWithDiscard) {
        bestDebtWithDiscard = opt.debtScore;
        bestMeldPointsWithDiscard = opt.melds.reduce((sum, m) => sum + RummyValidator.sumPoints(m), 0);
      }
    }

    // Bot wants the discard if it strictly improves debt or increases melds by >= 10 points
    if (bestDebtWithDiscard < currentDebt) {
      return true;
    }
    if (bestDebtWithDiscard === currentDebt && bestMeldPointsWithDiscard > currentMeldPoints) {
      return true;
    }

    return false;
  }

  /**
   * Discard Decision:
   * From an 11-card hand, determine which card to discard,
   * and check if the bot can declare GIN SLAM!
   */
  static chooseBestAction(botHand11: Card[]): AIDecisionResult {
    if (botHand11.length !== 11) {
      throw new Error(`AI requires an 11-card hand to evaluate discard, received ${botHand11.length}`);
    }

    // 1. Check for 1,000-Point Run:
    for (let i = 0; i < botHand11.length; i++) {
      const finishCard = botHand11[i];
      const subset10 = botHand11.filter((_, idx) => idx !== i);
      if (RummyValidator.checkThousandPointRun(subset10)) {
        return {
          action: 'GIN_SLAM',
          cardId: finishCard.id,
          reason: '1,000-Point Suited Run completed!',
        };
      }
    }

    // 2. Check for Standard Gin (exactly 4+3+3 with 0 deadwood points):
    for (let i = 0; i < botHand11.length; i++) {
      const finishCandidate = botHand11[i];
      const subset10 = botHand11.filter((_, idx) => idx !== i);
      const opt = TeamHandOptimizer.optimizeMergedHand(subset10);

      if (opt.debtScore === 0 && RummyValidator.validateGin(opt.melds)) {
        return {
          action: 'GIN_SLAM',
          cardId: finishCandidate.id,
          reason: 'Standard 4+3+3 Gin with 0 Deadwood completed!',
        };
      }
    }

    // 3. General Discard Evaluation:
    // Test all 11 candidate cards and score the remaining 10 cards.
    // Lower score is better!
    let bestCardId = botHand11[botHand11.length - 1].id;
    let minEvaluationScore = Infinity;

    for (let i = 0; i < botHand11.length; i++) {
      const candidateToDiscard = botHand11[i];
      const remaining10 = botHand11.filter((_, idx) => idx !== i);
      const opt = TeamHandOptimizer.optimizeMergedHand(remaining10);

      let evaluationScore = opt.debtScore;

      // Penalty logic: If candidate card is an isolated Ace, discarding it eliminates the -15 debt!
      if (candidateToDiscard.rank === 1) {
        evaluationScore -= 5; // Preference to discard dangerous unmelded Ace
      }

      // Reward higher meld points
      const meldPoints = opt.melds.reduce((sum, m) => sum + RummyValidator.sumPoints(m), 0);
      evaluationScore -= meldPoints * 0.1;

      if (evaluationScore < minEvaluationScore) {
        minEvaluationScore = evaluationScore;
        bestCardId = candidateToDiscard.id;
      }
    }

    return {
      action: 'DISCARD',
      cardId: bestCardId,
      reason: 'Optimized minimum deadwood debt',
    };
  }
}
