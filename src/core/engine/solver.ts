import { Card, Suit } from '../models/types';
import { RummyValidator } from './validator';

export interface MergeOptimizationResult {
  melds: Card[][];
  deadwood: Card[];
  meldScore: number;
  debtScore: number;
  netScore: number;
}

export class TeamHandOptimizer {
  private static getSubsets<T>(array: T[], size: number): T[][] {
    if (size === 0) return [[]];
    if (array.length === 0) return [];
    const head = array[0];
    const tail = array.slice(1);
    const withHead = this.getSubsets(tail, size - 1).map(subset => [head, ...subset]);
    const withoutHead = this.getSubsets(tail, size);
    return [...withHead, ...withoutHead];
  }

  /**
   * Extracts all valid candidate melds (Sets of 3 or 4, Runs of 3 to 7) from cards.
   * Strictly enforces the Ace rule: Aces cannot be in runs.
   */
  static extractCandidateMelds(cards: Card[]): Card[][] {
    const candidates: Card[][] = [];

    // 1. Sets (Aces allowed)
    const rankMap = new Map<number, Card[]>();
    cards.forEach(c => {
      const list = rankMap.get(c.rank) || [];
      list.push(c);
      rankMap.set(c.rank, list);
    });

    rankMap.forEach(group => {
      // In a standard 52-card deck, at most 4 cards can have the same rank (one per suit)
      if (group.length >= 3) {
        candidates.push(...this.getSubsets(group, 3));
      }
      if (group.length === 4) {
        candidates.push(group);
      }
    });

    // 2. Runs (Aces excluded)
    const suitMap = new Map<Suit, Card[]>();
    cards
      .filter(c => c.rank !== 1) // Aces forbidden in standard sequences
      .forEach(c => {
        const list = suitMap.get(c.suit) || [];
        list.push(c);
        suitMap.set(c.suit, list);
      });

    suitMap.forEach(group => {
      // Sort cards by rank
      const sorted = [...group].sort((a, b) => a.rank - b.rank);
      // Generate contiguous sub-arrays of length 3 to min(sorted.length, 7)
      for (let len = 3; len <= Math.min(sorted.length, 7); len++) {
        for (let i = 0; i <= sorted.length - len; i++) {
          const slice = sorted.slice(i, i + len);
          if (RummyValidator.isValidRun(slice)) {
            candidates.push(slice);
          }
        }
      }
    });

    return candidates;
  }

  /**
   * Backtracking combinatorial solver for merged team hands (typically 20 cards)
   * or individual hands (10 cards).
   * Finds the disjoint partition of melds that maximizes:
   * Net Score = sum(meld points) - sum(deadwood debt points)
   */
  static optimizeMergedHand(cards: Card[]): MergeOptimizationResult {
    const candidates = this.extractCandidateMelds(cards);

    const totalCardPoints = cards.reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);
    // Base case: 0 melds => netScore = -totalCardPoints
    let bestNetScore = -totalCardPoints;
    let bestMelds: Card[][] = [];

    // Map each card ID to its points for quick lookup
    const cardPointsMap = new Map<string, number>();
    cards.forEach(c => cardPointsMap.set(c.id, RummyValidator.getCardPoints(c.rank)));

    // Precalculate points for each candidate
    const candidatePoints = candidates.map(meld =>
      meld.reduce((sum, c) => sum + (cardPointsMap.get(c.id) ?? 0), 0)
    );

    // Sort candidates by total points descending to explore high-yield branches early
    const sortedIndices = candidates
      .map((_, idx) => idx)
      .sort((a, b) => candidatePoints[b] - candidatePoints[a]);

    const sortedCandidates = sortedIndices.map(i => candidates[i]);
    const sortedCandidatePoints = sortedIndices.map(i => candidatePoints[i]);

    function search(
      index: number,
      usedIds: Set<string>,
      currentMelds: Card[][],
      currentMeldPoints: number
    ) {
      // Unmelded debt = totalCardPoints - currentMeldPoints
      // Net score = currentMeldPoints - (totalCardPoints - currentMeldPoints) = 2 * currentMeldPoints - totalCardPoints
      const currentDebtPoints = totalCardPoints - currentMeldPoints;
      const currentNet = currentMeldPoints - currentDebtPoints;

      if (currentNet > bestNetScore) {
        bestNetScore = currentNet;
        bestMelds = [...currentMelds];
      }

      for (let i = index; i < sortedCandidates.length; i++) {
        const meld = sortedCandidates[i];

        // Check if any card in meld is already used
        let hasConflict = false;
        for (const c of meld) {
          if (usedIds.has(c.id)) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          for (const c of meld) usedIds.add(c.id);
          currentMelds.push(meld);

          search(
            i + 1,
            usedIds,
            currentMelds,
            currentMeldPoints + sortedCandidatePoints[i]
          );

          for (const c of meld) usedIds.delete(c.id);
          currentMelds.pop();
        }
      }
    }

    search(0, new Set(), [], 0);

    const usedCardIds = new Set(bestMelds.flat().map(c => c.id));
    const deadwood = cards.filter(c => !usedCardIds.has(c.id));
    const meldScore = bestMelds.flat().reduce((sum, c) => sum + (cardPointsMap.get(c.id) ?? 0), 0);
    const debtScore = deadwood.reduce((sum, c) => sum + (cardPointsMap.get(c.id) ?? 0), 0);

    return {
      melds: bestMelds,
      deadwood,
      meldScore,
      debtScore,
      netScore: meldScore - debtScore,
    };
  }

  /**
   * Find all cards in an 11-card hand that, if discarded, leave a 100% legal Gin (0 Deadwood).
   */
  static getValidGinFinishCardIds(cards: Card[]): string[] {
    if (cards.length !== 11) return [];

    const validIds: string[] = [];
    for (let i = 0; i < cards.length; i++) {
      const remaining10 = cards.filter((_, idx) => idx !== i);
      if (RummyValidator.checkThousandPointRun(remaining10)) {
        validIds.push(cards[i].id);
        continue;
      }
      if (RummyValidator.findStandardGinPartition(remaining10) !== null) {
        validIds.push(cards[i].id);
        continue;
      }
      const opt = this.optimizeMergedHand(remaining10);
      if (opt.debtScore === 0 && RummyValidator.validateGin(opt.melds)) {
        validIds.push(cards[i].id);
      }
    }
    return validIds;
  }

  /**
   * Resolves the single finish card to discard for Gin.
   * If preferredCardId is valid, honors it; otherwise auto-selects the first legal finish card.
   */
  static resolveGinFinishCardId(cards: Card[], preferredCardId?: string | null): string | null {
    const validIds = this.getValidGinFinishCardIds(cards);
    if (validIds.length === 0) return null;
    if (preferredCardId && validIds.includes(preferredCardId)) {
      return preferredCardId;
    }
    return validIds[0];
  }
}
