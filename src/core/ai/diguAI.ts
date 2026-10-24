import { Card, TableRules } from '../models/types';
import { RummyValidator } from '../engine/validator';
import { FastMeldParser } from '../engine/fastMeldParser';

export type AITier = 'casual' | 'regular' | 'master';

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
    _rules?: TableRules,
    tier: AITier = 'master'
  ): boolean {
    if (!topDiscard) return false;

    // 1. Strict Ace Rule Defense (Regular & Master):
    // Never draw an Ace unless holding at least 2 Aces to form a set,
    // because unmelded Aces carry a devastating -15 debt penalty!
    if (topDiscard.rank === 1) {
      const existingAces = botHand.filter(c => c.rank === 1).length;
      if (existingAces < 2) {
        return false;
      }
    }

    // 2. 1,000-Point Run Check:
    const sameSuitCards = botHand.filter(c => c.suit === topDiscard.suit);
    if (sameSuitCards.length >= 7) {
      const candidateRun = [...sameSuitCards, topDiscard];
      if (RummyValidator.checkThousandPointRun(candidateRun)) {
        return true;
      }
    }

    // Casual Tier: Only draws if it immediately completes a 3-card meld
    if (tier === 'casual') {
      const testHand = [...botHand, topDiscard];
      const baseResult = FastMeldParser.analyzeHandFast(botHand);
      const testResult = FastMeldParser.analyzeHandFast(testHand);
      return testResult.melds.length > baseResult.melds.length;
    }

    // Regular & Master Tier:
    const currentAnalysis = FastMeldParser.analyzeHandFast(botHand);
    const currentDebt = currentAnalysis.deadwoodPoints;

    const testHand = [...botHand, topDiscard];
    let bestDebtWithDiscard = Infinity;
    let formsNewMeld = false;

    for (let i = 0; i < testHand.length; i++) {
      const subset10 = testHand.filter((_, idx) => idx !== i);
      const res = FastMeldParser.analyzeHandFast(subset10);
      if (res.deadwoodPoints < bestDebtWithDiscard) {
        bestDebtWithDiscard = res.deadwoodPoints;
        if (res.melds.length > currentAnalysis.melds.length) {
          formsNewMeld = true;
        }
      }
    }

    // If taking discard directly reduces deadwood or creates a new meld
    if (bestDebtWithDiscard < currentDebt) {
      return true;
    }
    if (formsNewMeld && bestDebtWithDiscard <= currentDebt) {
      return true;
    }

    // Master Tier: Also check for strong near-meld building (pairs / 2-card consecutive runs)
    if (tier === 'master') {
      const matchingRank = botHand.filter(c => c.rank === topDiscard.rank).length;
      if (matchingRank === 2) return true; // Forms a 3-card set

      if (topDiscard.rank !== 1) {
        const hasAdjacentRunCard = botHand.some(
          c => c.suit === topDiscard.suit && c.rank !== 1 && Math.abs(c.rank - topDiscard.rank) === 1
        );
        if (hasAdjacentRunCard && bestDebtWithDiscard <= currentDebt + 4) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Discard Decision:
   * From an 11-card hand, determine which card to discard,
   * and check if the bot can declare GIN SLAM!
   */
  static chooseBestAction(
    botHand11: Card[],
    tier: AITier = 'master',
    downstreamPickups: Card[] = []
  ): AIDecisionResult {
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

    // 2. Check for Standard Gin (0 deadwood):
    for (let i = 0; i < botHand11.length; i++) {
      const finishCandidate = botHand11[i];
      const subset10 = botHand11.filter((_, idx) => idx !== i);
      const res = FastMeldParser.analyzeHandFast(subset10);

      if (
        RummyValidator.findStandardGinPartition(subset10) !== null ||
        (res.deadwoodPoints === 0 && RummyValidator.validateGin(res.melds.map(m => m.cards)))
      ) {
        return {
          action: 'GIN_SLAM',
          cardId: finishCandidate.id,
          reason: 'Standard 4+3+3 Gin with 0 Deadwood completed!',
        };
      }
    }

    // 3. Discard Evaluation based on Tier:
    const candidateScores: { card: Card; score: number }[] = [];

    for (let i = 0; i < botHand11.length; i++) {
      const candidateToDiscard = botHand11[i];
      const remaining10 = botHand11.filter((_, idx) => idx !== i);
      const res = FastMeldParser.analyzeHandFast(remaining10);

      let evaluationScore = res.deadwoodPoints;

      // Unmelded Ace Danger: If candidate is an isolated Ace, discarding it eliminates the -15 debt penalty!
      if (candidateToDiscard.rank === 1) {
        evaluationScore -= 12;
      }

      // Reward higher meld points
      const meldPoints = res.melds.reduce((sum, m) => sum + m.points, 0);
      evaluationScore -= meldPoints * 0.15;

      // Master Tier: Downstream Feeder Defense (Avoid feeding downstream opponent!)
      if (tier === 'master' && downstreamPickups.length > 0) {
        const feedsDownstreamRank = downstreamPickups.some(c => c.rank === candidateToDiscard.rank);
        const feedsDownstreamSuit = downstreamPickups.some(
          c => c.suit === candidateToDiscard.suit && Math.abs(c.rank - candidateToDiscard.rank) <= 1
        );
        if (feedsDownstreamRank || feedsDownstreamSuit) {
          evaluationScore += 25; // Heavily disincentivize discarding cards that feed downstream!
        }
      }

      candidateScores.push({ card: candidateToDiscard, score: evaluationScore });
    }

    candidateScores.sort((a, b) => a.score - b.score);

    // Casual Tier: 25% chance to pick a random non-melded card to simulate human sub-optimal play
    if (tier === 'casual' && Math.random() < 0.25 && candidateScores.length > 2) {
      const randomIdx = 1 + Math.floor(Math.random() * (candidateScores.length - 1));
      return {
        action: 'DISCARD',
        cardId: candidateScores[randomIdx].card.id,
        reason: 'Casual play variance',
      };
    }

    return {
      action: 'DISCARD',
      cardId: candidateScores[0].card.id,
      reason: tier === 'master' ? 'Master tactical discard' : 'Optimized minimum deadwood debt',
    };
  }
}
