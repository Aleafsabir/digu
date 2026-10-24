import { Card, Suit } from '../models/types';
import { RummyValidator } from './validator';

export interface FastMeld {
  cards: Card[];
  type: 'SET' | 'RUN';
  points: number;
}

export interface FastAnalysisResult {
  deadwoodPoints: number;
  melds: FastMeld[];
  unmeldedCards: Card[];
  isGinReady: boolean;
  validGinFinishCardIds: string[];
  isThousandRunReady: boolean;
}

const analysisCache = new Map<string, FastAnalysisResult>();

export class FastMeldParser {
  private static getCanonicalKey(cards: Card[]): string {
    return cards
      .map(c => `${c.rank}${c.suit[0]}`)
      .sort()
      .join(',');
  }

  static clearCache(): void {
    analysisCache.clear();
  }

  static analyzeHandFast(cards: Card[]): FastAnalysisResult {
    const key = this.getCanonicalKey(cards);
    const cached = analysisCache.get(key);
    if (cached) return cached;

    const N = cards.length;
    if (N === 0) {
      return {
        deadwoodPoints: 0,
        melds: [],
        unmeldedCards: [],
        isGinReady: false,
        validGinFinishCardIds: [],
        isThousandRunReady: false,
      };
    }

    // 1. Check Thousand-Point Run
    let isThousandRunReady = false;
    if (N === 10) {
      isThousandRunReady = RummyValidator.checkThousandPointRun(cards);
    } else if (N === 11) {
      for (let i = 0; i < N; i++) {
        const sub = cards.filter((_, idx) => idx !== i);
        if (RummyValidator.checkThousandPointRun(sub)) {
          isThousandRunReady = true;
          break;
        }
      }
    }

    // 2. Build Candidate Melds as Bitmasks
    const candidateMasks: number[] = [];
    const candidateMelds: FastMeld[] = [];

    // Sets (Rank match across distinct suits, Aces permitted)
    const rankMap = new Map<number, number[]>();
    for (let i = 0; i < N; i++) {
      const r = cards[i].rank;
      const list = rankMap.get(r) || [];
      list.push(i);
      rankMap.set(r, list);
    }

    rankMap.forEach(indices => {
      if (indices.length >= 3) {
        // Sets of 3
        for (let a = 0; a < indices.length - 2; a++) {
          for (let b = a + 1; b < indices.length - 1; b++) {
            for (let c = b + 1; c < indices.length; c++) {
              const mask = (1 << indices[a]) | (1 << indices[b]) | (1 << indices[c]);
              const meldCards = [cards[indices[a]], cards[indices[b]], cards[indices[c]]];
              candidateMasks.push(mask);
              candidateMelds.push({
                cards: meldCards,
                type: 'SET',
                points: RummyValidator.sumPoints(meldCards),
              });
            }
          }
        }
      }
      if (indices.length === 4) {
        const mask = (1 << indices[0]) | (1 << indices[1]) | (1 << indices[2]) | (1 << indices[3]);
        const meldCards = [cards[indices[0]], cards[indices[1]], cards[indices[2]], cards[indices[3]]];
        candidateMasks.push(mask);
        candidateMelds.push({
          cards: meldCards,
          type: 'SET',
          points: RummyValidator.sumPoints(meldCards),
        });
      }
    });

    // Runs (Strict Ace Rule: rank !== 1)
    const suitMap = new Map<Suit, { index: number; card: Card }[]>();
    for (let i = 0; i < N; i++) {
      if (cards[i].rank === 1) continue; // Aces strictly forbidden in standard sequences
      const s = cards[i].suit;
      const list = suitMap.get(s) || [];
      list.push({ index: i, card: cards[i] });
      suitMap.set(s, list);
    }

    suitMap.forEach(items => {
      items.sort((a, b) => a.card.rank - b.card.rank);
      const len = items.length;
      for (let size = 3; size <= Math.min(len, 7); size++) {
        for (let i = 0; i <= len - size; i++) {
          let isSeq = true;
          let mask = 0;
          const sliceCards: Card[] = [];
          for (let j = 0; j < size; j++) {
            if (j > 0 && items[i + j].card.rank !== items[i + j - 1].card.rank + 1) {
              isSeq = false;
              break;
            }
            mask |= (1 << items[i + j].index);
            sliceCards.push(items[i + j].card);
          }
          if (isSeq) {
            candidateMasks.push(mask);
            candidateMelds.push({
              cards: sliceCards,
              type: 'RUN',
              points: RummyValidator.sumPoints(sliceCards),
            });
          }
        }
      }
    });

    // 3. Fast Bitmask Search for Maximum Net Score = (Meld Points - Deadwood Debt)
    const totalPoints = cards.reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);
    let bestNetScore = -totalPoints;
    let bestMask = 0;
    let bestMeldIndices: number[] = [];

    // Sort candidate indices by points descending
    const order = candidateMelds
      .map((_, idx) => idx)
      .sort((a, b) => candidateMelds[b].points - candidateMelds[a].points);

    function solve(currIndex: number, usedMask: number, chosenIndices: number[], currentMeldPts: number) {
      const remainingUnusedPts = cards.reduce((sum, c, idx) => {
        return (usedMask & (1 << idx)) === 0 ? sum + RummyValidator.getCardPoints(c.rank) : sum;
      }, 0);
      const net = currentMeldPts - remainingUnusedPts;
      if (net > bestNetScore) {
        bestNetScore = net;
        bestMask = usedMask;
        bestMeldIndices = [...chosenIndices];
      }

      for (let k = currIndex; k < order.length; k++) {
        const cIdx = order[k];
        const mask = candidateMasks[cIdx];
        if ((usedMask & mask) === 0) {
          solve(
            k + 1,
            usedMask | mask,
            [...chosenIndices, cIdx],
            currentMeldPts + candidateMelds[cIdx].points
          );
        }
      }
    }

    solve(0, 0, [], 0);

    const selectedMelds = bestMeldIndices.map(idx => candidateMelds[idx]);
    const unmeldedCards = cards.filter((_, idx) => (bestMask & (1 << idx)) === 0);
    const deadwoodPoints = unmeldedCards.reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);

    // 4. Evaluate Gin Ready & Finish Cards for 11-card hand
    const validGinFinishCardIds: string[] = [];
    if (N === 11) {
      for (let i = 0; i < N; i++) {
        const finishCard = cards[i];
        const remaining10 = cards.filter((_, idx) => idx !== i);

        if (RummyValidator.checkThousandPointRun(remaining10)) {
          validGinFinishCardIds.push(finishCard.id);
          continue;
        }

        const subResult = FastMeldParser.analyzeHandFast(remaining10);
        if (subResult.deadwoodPoints === 0 && RummyValidator.validateGin(subResult.melds.map(m => m.cards))) {
          validGinFinishCardIds.push(finishCard.id);
        }
      }
    }

    const isGinReady = validGinFinishCardIds.length > 0 || isThousandRunReady || (N === 10 && deadwoodPoints === 0 && RummyValidator.validateGin(selectedMelds.map(m => m.cards)));

    const result: FastAnalysisResult = {
      deadwoodPoints,
      melds: selectedMelds,
      unmeldedCards,
      isGinReady,
      validGinFinishCardIds,
      isThousandRunReady,
    };

    if (analysisCache.size > 300) analysisCache.clear();
    analysisCache.set(key, result);

    return result;
  }
}
