/**
 * Authoritative Server Game Engine for Holhuashi (Digu, Dhihaeh, Bondi)
 * Pure deterministic rule validation, scoring, anti-cheat state sanitization,
 * and heuristic bot autoplay.
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface ServerCard {
  id: string;
  suit: Suit;
  rank: number; // 1 (Ace) through 13 (King)
  isFaceDown?: boolean;
}

export type GameMode =
  | 'DIGU'
  | 'DHIHAEH'
  | 'BONDI'
  | 'TEAM_4P'
  | 'SOLO_4P'
  | 'SOLO_2P';

export type MeldType = 'set' | 'run' | 'thousandPointRun';

export interface MeldValidationResult {
  isValid: boolean;
  type?: MeldType;
  points: number;
  error?: string;
}

export interface MergeOptimizationResult {
  melds: ServerCard[][];
  deadwood: ServerCard[];
  meldScore: number;
  debtScore: number;
  netScore: number;
}

export interface DiguBotDecision {
  isGinSlam: boolean;
  cardToDiscard: ServerCard;
  melds?: ServerCard[][];
  isThousandPointRun?: boolean;
  reason?: string;
}

export interface DhihaehTrickCard {
  card: ServerCard;
  playedBySeat: number;
}

export interface DhihaehTrick {
  trickNumber: number;
  leadSuit: Suit | null;
  cards: DhihaehTrickCard[];
  winnerSeat?: number | null;
}

export type DhihaehOutcome = 'haasbagga' | 'bagga' | 'standard' | 'tieBreaker';

export interface DhihaehRoundScoreResult {
  team1Score: number;
  team2Score: number;
  team1Delta: number;
  team2Delta: number;
  team1Tens: number;
  team2Tens: number;
  team1Tricks: number;
  team2Tricks: number;
  outcomeType: DhihaehOutcome;
  handWinnerTeam: 'TEAM_A' | 'TEAM_B' | 'DRAW';
  baggasAwarded: number;
  haasbaggasAwarded: number;
}

export interface BondiTrickCard {
  card: ServerCard;
  playedBySeat: number;
}

export interface BondiTrick {
  trickNumber: number;
  leadSuit: Suit | null;
  cards: BondiTrickCard[];
  atRiskSeat?: number | null;
  atRiskCard?: ServerCard | null;
  bondiInflictedBySeat?: number | null;
  bondiReceivedBySeat?: number | null;
  isCleanBurn: boolean;
}

export const DHIHAEH_HAASBAGGA_POINTS = 1000;
export const DHIHAEH_BAGGA_POINTS = 4;

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_PREFIX: Record<Suit, string> = {
  spades: 'S',
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
};

/**
 * Normalizes suit strings from either lowercase or uppercase client payloads.
 */
export function normalizeSuit(suitInput: string): Suit {
  const lower = String(suitInput || 'spades').toLowerCase();
  if (lower === 'hearts' || lower === 'h') return 'hearts';
  if (lower === 'diamonds' || lower === 'd') return 'diamonds';
  if (lower === 'clubs' || lower === 'c') return 'clubs';
  return 'spades';
}

/**
 * Generates a standard 52-card deck (no jokers) with canonical IDs (e.g., "S-01", "D-13").
 */
export function createStandardDeck(): ServerCard[] {
  const deck: ServerCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      const rankStr = String(rank).padStart(2, '0');
      deck.push({
        id: `${SUIT_PREFIX[suit]}-${rankStr}`,
        suit,
        rank,
        isFaceDown: false,
      });
    }
  }
  return deck;
}

/**
 * Deterministic-capable Fisher-Yates shuffle.
 */
export function shuffleDeck<T>(items: T[], seed?: number): T[] {
  const list = [...items];
  let currentSeed = seed ?? Date.now();
  const nextRand = (): number => {
    if (seed === undefined) {
      return Math.random();
    }
    // Mulberry32 deterministic PRNG
    let t = (currentSeed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
  return list;
}

// ============================================================================
// 1. DIGU (MALDIVIAN 10-CARD RUMMY) RULES & SOLVER
// ============================================================================

/**
 * Card point values in Digu:
 * - Ace (1): 15 points
 * - Court / 10 (10, 11, 12, 13): 10 points
 * - Pip cards (2-9): face value
 */
export function getDiguCardPoints(rank: number): number {
  if (rank === 1) return 15;
  if (rank >= 10) return 10;
  return rank;
}

export function sumDiguPoints(cards: ServerCard[]): number {
  return cards.reduce((acc, c) => acc + getDiguCardPoints(c.rank), 0);
}

/**
 * Set (Book): 3 or 4 cards of identical rank across distinct suits.
 * Aces ARE allowed in Sets.
 */
export function isValidDiguSet(cards: ServerCard[]): boolean {
  if (cards.length !== 3 && cards.length !== 4) return false;
  const targetRank = cards[0].rank;
  const seenSuits = new Set<Suit>();

  for (const c of cards) {
    const s = normalizeSuit(c.suit);
    if (c.rank !== targetRank || seenSuits.has(s)) return false;
    seenSuits.add(s);
  }
  return true;
}

/**
 * Standard Sequence (Run): 3 or more contiguous cards of the same suit.
 * STRICT ACE RULE: Aces (rank === 1) are strictly prohibited in standard runs
 * (neither A-2-3 nor Q-K-A is valid in standard meld play).
 */
export function isValidDiguRun(cards: ServerCard[]): boolean {
  if (cards.length < 3) return false;
  if (cards.some((c) => c.rank === 1)) return false;

  const targetSuit = normalizeSuit(cards[0].suit);
  if (!cards.every((c) => normalizeSuit(c.suit) === targetSuit)) return false;

  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i + 1] !== ranks[i] + 1) return false;
  }
  return true;
}

/**
 * Special 1,000-Point Contiguous Run:
 * Strictly 10-card contiguous suited runs including Ace:
 * - 10-card Low Run: A-2-3-4-5-6-7-8-9-10 of the same suit
 * - 10-card High Run: 5-6-7-8-9-10-J-Q-K-A of the same suit
 */
export function isThousandPointRun(cards: ServerCard[]): boolean {
  if (cards.length !== 10) return false;
  const targetSuit = normalizeSuit(cards[0].suit);
  if (!cards.every((c) => normalizeSuit(c.suit) === targetSuit)) return false;

  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i] === ranks[i + 1]) return false;
  }

  // Must contain Ace (rank 1)
  if (ranks[0] !== 1) return false;

  // Low Ace run: 1, 2, ..., 10
  const isLowContiguous = ranks.every((r, idx) => r === idx + 1);
  if (isLowContiguous) return true;

  // High Ace run: 1 followed by 5..13
  const isHighContiguous = ranks
    .slice(1)
    .every((r, idx) => r === 5 + idx);
  return isHighContiguous;
}

/**
 * Validates a candidate meld and returns its type and point value.
 */
export function validateDiguMeld(cards: ServerCard[]): MeldValidationResult {
  if (cards.length < 3) {
    return {
      isValid: false,
      points: sumDiguPoints(cards),
      error: 'Melds must contain at least 3 cards.',
    };
  }

  if (isThousandPointRun(cards)) {
    return {
      isValid: true,
      type: 'thousandPointRun',
      points: 1000,
    };
  }

  if (isValidDiguSet(cards)) {
    return {
      isValid: true,
      type: 'set',
      points: sumDiguPoints(cards),
    };
  }

  const containsAce = cards.some((c) => c.rank === 1);
  const sameSuit = cards.every(
    (c) => normalizeSuit(c.suit) === normalizeSuit(cards[0].suit)
  );
  if (containsAce && sameSuit && cards.length >= 3) {
    return {
      isValid: false,
      points: sumDiguPoints(cards),
      error:
        'Strict Ace Rule: Aces cannot be used in standard sequences (only in Sets or 7+/10-card 1,000-Point Runs).',
    };
  }

  if (isValidDiguRun(cards)) {
    return {
      isValid: true,
      type: 'run',
      points: sumDiguPoints(cards),
    };
  }

  return {
    isValid: false,
    points: sumDiguPoints(cards),
    error: 'Cards do not form a valid Set or Run.',
  };
}

function getSubsets<T>(array: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (array.length < size) return [];
  const [head, ...tail] = array;
  const withHead = getSubsets(tail, size - 1).map((sub) => [head, ...sub]);
  const withoutHead = getSubsets(tail, size);
  return [...withHead, ...withoutHead];
}

/**
 * Extracts all valid candidate melds (Sets of 3-4, Runs of 3-7) from a card pool.
 */
export function extractCandidateMelds(cards: ServerCard[]): ServerCard[][] {
  const candidates: ServerCard[][] = [];

  // 1. Sets (3 or 4 of same rank, distinct suits)
  const rankMap = new Map<number, ServerCard[]>();
  for (const c of cards) {
    // Deduplicate same rank+suit if any
    const list = rankMap.get(c.rank) || [];
    if (!list.some((existing) => normalizeSuit(existing.suit) === normalizeSuit(c.suit))) {
      list.push(c);
      rankMap.set(c.rank, list);
    }
  }

  for (const group of rankMap.values()) {
    if (group.length >= 3) {
      candidates.push(...getSubsets(group, 3));
    }
    if (group.length === 4) {
      candidates.push([...group]);
    }
  }

  // 2. Runs (Aces excluded in standard runs; 7-card Ace runs checked via isThousandPointRun)
  const suitMap = new Map<Suit, ServerCard[]>();
  for (const c of cards) {
    if (c.rank === 1) continue;
    const s = normalizeSuit(c.suit);
    const list = suitMap.get(s) || [];
    if (!list.some((existing) => existing.rank === c.rank)) {
      list.push(c);
      suitMap.set(s, list);
    }
  }

  for (const group of suitMap.values()) {
    const sorted = [...group].sort((a, b) => a.rank - b.rank);
    for (let len = 3; len <= sorted.length && len <= 7; len++) {
      for (let i = 0; i <= sorted.length - len; i++) {
        const slice = sorted.slice(i, i + len);
        if (isValidDiguRun(slice)) {
          candidates.push(slice);
        }
      }
    }
  }

  return candidates;
}

/**
 * 20-Card Team Merge & 10-Card Individual Backtracking Solver.
 * Finds the disjoint set of melds maximizing:
 *   Net Score = sum(meld points) - sum(deadwood debt points)
 */
export function optimizeMergedHand(cards: ServerCard[]): MergeOptimizationResult {
  if (cards.length === 10 && isThousandPointRun(cards)) {
    return {
      melds: [cards],
      deadwood: [],
      meldScore: 1000,
      debtScore: 0,
      netScore: 1000,
    };
  }

  const candidates = extractCandidateMelds(cards);
  const totalCardPoints = sumDiguPoints(cards);

  const cardPointsMap = new Map<string, number>();
  const cardIndexMap = new Map<string, number>();
  cards.forEach((c, idx) => {
    cardPointsMap.set(c.id, getDiguCardPoints(c.rank));
    cardIndexMap.set(c.id, idx);
  });

  // Represent each candidate meld with a bitmask for fast O(1) disjoint checks (up to 20 cards)
  const scoredCandidates = candidates.map((meld) => {
    let mask = 0;
    let pts = 0;
    for (const c of meld) {
      const bit = cardIndexMap.get(c.id) ?? 0;
      mask |= 1 << bit;
      pts += cardPointsMap.get(c.id) ?? 0;
    }
    if (meld.length >= 7 && isThousandPointRun(meld)) {
      pts = 1000;
    }
    return { meld, mask, pts };
  });

  scoredCandidates.sort((a, b) => b.pts - a.pts);

  let bestNetScore = -totalCardPoints;
  let bestMelds: ServerCard[][] = [];

  function search(
    index: number,
    usedMask: number,
    currentMelds: ServerCard[][],
    currentMeldActualCardPoints: number,
    currentMeldBonusPoints: number
  ): void {
    const currentDebtPoints = totalCardPoints - currentMeldActualCardPoints;
    const currentNet = currentMeldBonusPoints - currentDebtPoints;

    if (currentNet > bestNetScore) {
      bestNetScore = currentNet;
      bestMelds = [...currentMelds];
    }

    for (let i = index; i < scoredCandidates.length; i++) {
      const cand = scoredCandidates[i];
      if ((usedMask & cand.mask) === 0) {
        const rawPts = cand.meld.reduce(
          (s, c) => s + (cardPointsMap.get(c.id) ?? 0),
          0
        );
        currentMelds.push(cand.meld);
        search(
          i + 1,
          usedMask | cand.mask,
          currentMelds,
          currentMeldActualCardPoints + rawPts,
          currentMeldBonusPoints + cand.pts
        );
        currentMelds.pop();
      }
    }
  }

  search(0, 0, [], 0, 0);

  const usedIds = new Set<string>();
  for (const m of bestMelds) {
    for (const c of m) {
      usedIds.add(c.id);
    }
  }

  const deadwood = cards.filter((c) => !usedIds.has(c.id));
  const meldScore = bestMelds.reduce((sum, m) => {
    if (m.length >= 7 && isThousandPointRun(m)) return sum + 1000;
    return sum + sumDiguPoints(m);
  }, 0);
  const debtScore = sumDiguPoints(deadwood);

  return {
    melds: bestMelds,
    deadwood,
    meldScore,
    debtScore,
    netScore: meldScore - debtScore,
  };
}

/**
 * Checks whether a 10-card partition forms a valid standard Gin (4 + 3 + 3 melds, 0 deadwood)
 * or a 1,000-point run.
 */
export function isValidGinPartition(melds: ServerCard[][]): boolean {
  if (melds.length === 1 && melds[0].length === 10 && isThousandPointRun(melds[0])) {
    return true;
  }
  if (melds.length === 2) {
    const lengths = melds.map((m) => m.length).sort((a, b) => a - b);
    if (lengths[0] === 3 && lengths[1] === 7) {
      return melds.every((m) => validateDiguMeld(m).isValid);
    }
  }
  if (melds.length !== 3) return false;
  const lengths = melds.map((m) => m.length).sort((a, b) => a - b);
  if (lengths[0] !== 3 || lengths[1] !== 3 || lengths[2] !== 4) return false;
  return melds.every((m) => validateDiguMeld(m).isValid);
}

/**
 * Determines if an 11-card active hand can declare Gin by slamming 1 finish card face-down.
 */
export function canDeclareGin(hand11: ServerCard[]): {
  valid: boolean;
  finishCard?: ServerCard;
  melds?: ServerCard[][];
  isThousandPointRun?: boolean;
} {
  if (hand11.length !== 11) return { valid: false };

  for (let i = 0; i < hand11.length; i++) {
    const candidateFinish = hand11[i];
    const remaining10 = hand11.filter((_, idx) => idx !== i);

    if (isThousandPointRun(remaining10)) {
      return {
        valid: true,
        finishCard: candidateFinish,
        melds: [remaining10],
        isThousandPointRun: true,
      };
    }

    const opt = optimizeMergedHand(remaining10);
    if (opt.debtScore === 0 && isValidGinPartition(opt.melds)) {
      const hasThousandRun = opt.melds.some(
        (m) => m.length >= 7 && isThousandPointRun(m)
      );
      return {
        valid: true,
        finishCard: candidateFinish,
        melds: opt.melds,
        isThousandPointRun: hasThousandRun,
      };
    }
  }

  return { valid: false };
}

/**
 * Heuristic AI for Digu: Decides whether to draw the top discard or draw from stock.
 */
export function diguBotShouldDrawDiscard(
  botHand: ServerCard[],
  topDiscard: ServerCard | null | undefined
): boolean {
  if (!topDiscard) return false;

  // Strict Ace Defense: Never draw an Ace unless holding >= 2 Aces for a Set
  if (topDiscard.rank === 1) {
    const existingAces = botHand.filter((c) => c.rank === 1).length;
    if (existingAces < 2) return false;
  }

  // Check if topDiscard completes a 7+ or 10-card 1,000-point run
  const sameSuit = botHand.filter(
    (c) => normalizeSuit(c.suit) === normalizeSuit(topDiscard.suit)
  );
  if (sameSuit.length >= 6) {
    const candidateRun = [...sameSuit, topDiscard];
    if (isThousandPointRun(candidateRun)) return true;
  }

  const currentOpt = optimizeMergedHand(botHand);
  const testHand11 = [...botHand, topDiscard];

  let bestDebtWithDiscard = 9999;
  let formsNewMeld = false;

  for (let i = 0; i < testHand11.length; i++) {
    const subset10 = testHand11.filter((_, idx) => idx !== i);
    const res = optimizeMergedHand(subset10);
    if (res.debtScore < bestDebtWithDiscard) {
      bestDebtWithDiscard = res.debtScore;
      if (res.melds.length > currentOpt.melds.length) {
        formsNewMeld = true;
      }
    }
  }

  if (bestDebtWithDiscard < currentOpt.debtScore) return true;
  if (formsNewMeld && bestDebtWithDiscard <= currentOpt.debtScore) return true;

  const matchingRank = botHand.filter((c) => c.rank === topDiscard.rank).length;
  if (matchingRank === 2) return true;

  return false;
}

/**
 * Heuristic AI for Digu: Selects the optimal discard or Gin Slam from an 11-card hand.
 */
export function diguBotChooseAction(hand11: ServerCard[]): DiguBotDecision {
  if (hand11.length === 0) {
    throw new Error('Cannot choose Digu bot action from an empty hand');
  }

  if (hand11.length === 11) {
    const ginCheck = canDeclareGin(hand11);
    if (ginCheck.valid && ginCheck.finishCard) {
      return {
        isGinSlam: true,
        cardToDiscard: ginCheck.finishCard,
        melds: ginCheck.melds,
        isThousandPointRun: ginCheck.isThousandPointRun,
        reason: ginCheck.isThousandPointRun
          ? '1,000-Point Suited Run completed!'
          : 'Standard 4+3+3 Gin with 0 Deadwood completed!',
      };
    }
  }

  let bestDiscard = hand11[0];
  let lowestDebt = 99999;
  let highestNet = -99999;

  for (let i = 0; i < hand11.length; i++) {
    const candidate = hand11[i];
    const remaining = hand11.filter((_, idx) => idx !== i);
    const opt = optimizeMergedHand(remaining);

    // Prioritize shedding unmelded Aces (-15 pts penalty)
    let adjustedDebt = opt.debtScore;
    if (candidate.rank === 1) {
      adjustedDebt -= 15;
    }

    if (
      adjustedDebt < lowestDebt ||
      (adjustedDebt === lowestDebt && opt.netScore > highestNet)
    ) {
      lowestDebt = adjustedDebt;
      highestNet = opt.netScore;
      bestDiscard = candidate;
    }
  }

  return {
    isGinSlam: false,
    cardToDiscard: bestDiscard,
  };
}

// ============================================================================
// 2. DHIHAEH (10s CAPTURE — 4-PLAYER 2v2 ANTI-CLOCKWISE 5-4-4 BATCH DEAL)
// ============================================================================

/**
 * Card strength in Dhihaeh: Ace = 14 (highest), K = 13, Q = 12, J = 11, 10 = 10 ... 2 = 2.
 */
export function getDhihaehCardStrength(card: ServerCard): number {
  return card.rank === 1 ? 14 : card.rank;
}

/**
 * Deals 52 cards across 4 players in 3 authentic Maldivian anti-clockwise passes (5 - 4 - 4).
 */
export function dealDhihaeh544(
  shuffledDeck: ServerCard[],
  dealerSeat = 3
): ServerCard[][] {
  const hands: ServerCard[][] = [[], [], [], []];
  let cardIdx = 0;
  const batches = [5, 4, 4];

  for (const batchSize of batches) {
    for (let p = 0; p < 4; p++) {
      // Anti-clockwise order starting to the right of dealer
      const seat = (dealerSeat + 1 + p) % 4;
      hands[seat].push(...shuffledDeck.slice(cardIdx, cardIdx + batchSize));
      cardIdx += batchSize;
    }
  }

  return hands;
}

/**
 * Validates suit following in Dhihaeh:
 * - Any card can lead a trick.
 * - Following players must play leadSuit if holding any card of leadSuit.
 * - If void in leadSuit, player may cut with trump or discard off-suit.
 */
export function isDhihaehCardPlayable(
  card: ServerCard,
  hand: ServerCard[],
  trick: DhihaehTrick
): boolean {
  if (!trick.leadSuit || trick.cards.length === 0) {
    return true;
  }
  const leadSuit = normalizeSuit(trick.leadSuit);
  const holdingLeadSuit = hand.some((c) => normalizeSuit(c.suit) === leadSuit);
  if (holdingLeadSuit) {
    return normalizeSuit(card.suit) === leadSuit;
  }
  return true;
}

/**
 * Resolves the winner seat of a Dhihaeh trick considering leadSuit and trumpSuit.
 */
export function resolveDhihaehTrickWinner(
  trick: DhihaehTrick,
  trumpSuit: Suit | null
): number {
  if (trick.cards.length === 0) return 0;
  const leadSuit = normalizeSuit(trick.leadSuit || trick.cards[0].card.suit);
  const normalizedTrump = trumpSuit ? normalizeSuit(trumpSuit) : null;

  let winningPlay = trick.cards[0];
  let isTrumped =
    normalizedTrump !== null &&
    normalizeSuit(winningPlay.card.suit) === normalizedTrump;

  for (let i = 1; i < trick.cards.length; i++) {
    const play = trick.cards[i];
    const suit = normalizeSuit(play.card.suit);

    if (normalizedTrump !== null && suit === normalizedTrump) {
      if (!isTrumped) {
        winningPlay = play;
        isTrumped = true;
      } else if (
        getDhihaehCardStrength(play.card) >
        getDhihaehCardStrength(winningPlay.card)
      ) {
        winningPlay = play;
      }
    } else if (!isTrumped && suit === leadSuit) {
      if (
        getDhihaehCardStrength(play.card) >
        getDhihaehCardStrength(winningPlay.card)
      ) {
        winningPlay = play;
      }
    }
  }

  return winningPlay.playedBySeat;
}

/**
 * Evaluates Dhihaeh round scoring:
 * - Haasbagga = 1000 pts (all 4 Tens captured with 13-trick sweep or Haasbagga slam)
 * - Bagga = 4 pts (all 4 Tens captured with <13 tricks)
 * - Standard 3 Tens = 1 pt
 * - 2-2 Tens tiebreaker = 0 pts (majority tricks breaks hand winner)
 */
export function evaluateDhihaehRoundScore(params: {
  team1Tens: number;
  team2Tens: number;
  team1Tricks: number;
  team2Tricks: number;
  team1PreviousScore: number;
  team2PreviousScore: number;
  haasbaggaOnAllFourTens?: boolean;
}): DhihaehRoundScoreResult {
  const {
    team1Tens,
    team2Tens,
    team1Tricks,
    team2Tricks,
    team1PreviousScore,
    team2PreviousScore,
    haasbaggaOnAllFourTens = false,
  } = params;

  let outcomeType: DhihaehOutcome = 'standard';
  let handWinnerTeam: 'TEAM_A' | 'TEAM_B' | 'DRAW' = 'DRAW';
  let team1Delta = 0;
  let team2Delta = 0;
  let baggasAwarded = 0;
  let haasbaggasAwarded = 0;

  if (team1Tens === 4) {
    handWinnerTeam = 'TEAM_A';
    if (team1Tricks === 13 || haasbaggaOnAllFourTens) {
      outcomeType = 'haasbagga';
      team1Delta = DHIHAEH_HAASBAGGA_POINTS;
      haasbaggasAwarded = 1;
    } else {
      outcomeType = 'bagga';
      team1Delta = DHIHAEH_BAGGA_POINTS;
      baggasAwarded = 1;
    }
  } else if (team2Tens === 4) {
    handWinnerTeam = 'TEAM_B';
    if (team2Tricks === 13 || haasbaggaOnAllFourTens) {
      outcomeType = 'haasbagga';
      team2Delta = DHIHAEH_HAASBAGGA_POINTS;
      haasbaggasAwarded = 1;
    } else {
      outcomeType = 'bagga';
      team2Delta = DHIHAEH_BAGGA_POINTS;
      baggasAwarded = 1;
    }
  } else if (team1Tens === 3) {
    outcomeType = 'standard';
    handWinnerTeam = 'TEAM_A';
    team1Delta = 1;
  } else if (team2Tens === 3) {
    outcomeType = 'standard';
    handWinnerTeam = 'TEAM_B';
    team2Delta = 1;
  } else {
    outcomeType = 'tieBreaker';
    if (team1Tricks > team2Tricks) {
      handWinnerTeam = 'TEAM_A';
    } else if (team2Tricks > team1Tricks) {
      handWinnerTeam = 'TEAM_B';
    } else {
      handWinnerTeam = 'DRAW';
    }
  }

  return {
    team1Score: team1PreviousScore + team1Delta,
    team2Score: team2PreviousScore + team2Delta,
    team1Delta,
    team2Delta,
    team1Tens,
    team2Tens,
    team1Tricks,
    team2Tricks,
    outcomeType,
    handWinnerTeam,
    baggasAwarded,
    haasbaggasAwarded,
  };
}

/**
 * Heuristic Bot for Dhihaeh:
 * - Leads non-trump Aces first, avoids leading unprotected Tens.
 * - Feeds Tens to partner when partner is winning the trick.
 * - Cuts or beats opponent with lowest winning card.
 */
export function dhihaehBotSelectCard(params: {
  hand: ServerCard[];
  currentTrick: DhihaehTrick;
  trumpSuit: Suit | null;
  seatIndex: number;
  partnerSeat?: number;
}): ServerCard {
  const { hand, currentTrick, trumpSuit, seatIndex } = params;
  const partnerSeat = params.partnerSeat ?? (seatIndex + 2) % 4;

  const playable = hand.filter((c) =>
    isDhihaehCardPlayable(c, hand, currentTrick)
  );
  if (playable.length === 0) return hand[0];
  if (playable.length === 1) return playable[0];

  const isLeading = !currentTrick.leadSuit || currentTrick.cards.length === 0;
  if (isLeading) {
    const nonTrumpAces = playable.filter(
      (c) =>
        c.rank === 1 &&
        (!trumpSuit || normalizeSuit(c.suit) !== normalizeSuit(trumpSuit))
    );
    if (nonTrumpAces.length > 0) return nonTrumpAces[0];

    const nonTens = playable.filter((c) => c.rank !== 10);
    const pool = nonTens.length > 0 ? nonTens : playable;
    pool.sort((a, b) => getDhihaehCardStrength(a) - getDhihaehCardStrength(b));
    return pool[0];
  }

  const currentWinner = resolveDhihaehTrickWinner(currentTrick, trumpSuit);
  if (currentWinner === partnerSeat) {
    const tens = playable.filter((c) => c.rank === 10);
    if (tens.length > 0) return tens[0];
    playable.sort(
      (a, b) => getDhihaehCardStrength(a) - getDhihaehCardStrength(b)
    );
    return playable[0];
  }

  // Try to beat opponent
  const winningCandidates = playable.filter((c) => {
    const simTrick: DhihaehTrick = {
      trickNumber: currentTrick.trickNumber,
      leadSuit: currentTrick.leadSuit,
      cards: [...currentTrick.cards, { card: c, playedBySeat: seatIndex }],
    };
    return resolveDhihaehTrickWinner(simTrick, trumpSuit) === seatIndex;
  });

  if (winningCandidates.length > 0) {
    winningCandidates.sort(
      (a, b) => getDhihaehCardStrength(a) - getDhihaehCardStrength(b)
    );
    return winningCandidates[0];
  }

  const nonTens = playable.filter((c) => c.rank !== 10);
  const dumpPool = nonTens.length > 0 ? nonTens : playable;
  dumpPool.sort((a, b) => getDhihaehCardStrength(a) - getDhihaehCardStrength(b));
  return dumpPool[0];
}

// ============================================================================
// 3. BONDI (52-CARD DEAL, MANDATORY SPADES ACE TRICK 1 LEAD, BURN / PICKUP)
// ============================================================================

export function getBondiCardStrength(card: ServerCard): number {
  return card.rank === 1 ? 14 : card.rank;
}

/**
 * Deals all 52 cards across players (13 each for 4 players).
 */
export function dealBondiCards(
  shuffledDeck: ServerCard[],
  playerCount = 4
): ServerCard[][] {
  const hands: ServerCard[][] = Array.from({ length: playerCount }, () => []);
  shuffledDeck.forEach((card, idx) => {
    hands[idx % playerCount].push(card);
  });
  return hands;
}

/**
 * Finds the seat index holding the Ace of Spades (mandatory lead on Trick 1).
 */
export function findSpadesAceHolder(hands: ServerCard[][]): number {
  for (let i = 0; i < hands.length; i++) {
    if (
      hands[i].some(
        (c) => normalizeSuit(c.suit) === 'spades' && c.rank === 1
      )
    ) {
      return i;
    }
  }
  return 0;
}

/**
 * Validates whether a card is legal to play in Bondi:
 * - On Trick 1 lead, if player holds the Ace of Spades, they MUST lead it.
 * - When following a leadSuit, player must play a card of leadSuit if they hold one.
 * - When void in leadSuit, player may cut with any off-suit card (inflicting Bondi pickup penalty).
 */
export function isBondiCardPlayable(
  card: ServerCard,
  hand: ServerCard[],
  currentTrick: BondiTrick
): boolean {
  const isLeading = !currentTrick.leadSuit || currentTrick.cards.length === 0;
  if (isLeading) {
    if (currentTrick.trickNumber === 1) {
      const hasSpadesAce = hand.some(
        (c) => normalizeSuit(c.suit) === 'spades' && c.rank === 1
      );
      if (hasSpadesAce) {
        return normalizeSuit(card.suit) === 'spades' && card.rank === 1;
      }
    }
    return true;
  }

  const leadSuit = normalizeSuit(currentTrick.leadSuit!);
  const hasLeadSuit = hand.some((c) => normalizeSuit(c.suit) === leadSuit);
  if (hasLeadSuit) {
    return normalizeSuit(card.suit) === leadSuit;
  }

  // Void in leadSuit: any off-suit cut is allowed
  return true;
}

/**
 * Resolves a Bondi trick:
 * - Highest card of leadSuit is always the at-risk seat (and next leader if clean burn).
 * - As soon as a void player plays an off-suit card, a Bondi penalty is triggered:
 *   the player who played the highest card of leadSuit must pick up all trick cards!
 * - If all players follow leadSuit, the trick is a Clean Burn (cards removed from play).
 */
export function resolveBondiTrick(trick: BondiTrick): {
  highestLeadSeat: number;
  isCleanBurn: boolean;
  bondiInflictedBySeat: number | null;
  bondiReceivedBySeat: number | null;
  penaltyCards: ServerCard[];
} {
  if (trick.cards.length === 0) {
    return {
      highestLeadSeat: 0,
      isCleanBurn: true,
      bondiInflictedBySeat: null,
      bondiReceivedBySeat: null,
      penaltyCards: [],
    };
  }

  const leadSuit = normalizeSuit(trick.leadSuit || trick.cards[0].card.suit);
  let highestLeadPlay = trick.cards[0];
  let offSuitPlay: BondiTrickCard | null = null;

  for (const play of trick.cards) {
    const suit = normalizeSuit(play.card.suit);
    if (suit === leadSuit) {
      if (
        getBondiCardStrength(play.card) >
        getBondiCardStrength(highestLeadPlay.card)
      ) {
        highestLeadPlay = play;
      }
    } else if (!offSuitPlay) {
      offSuitPlay = play;
    }
  }

  if (offSuitPlay) {
    return {
      highestLeadSeat: highestLeadPlay.playedBySeat,
      isCleanBurn: false,
      bondiInflictedBySeat: offSuitPlay.playedBySeat,
      bondiReceivedBySeat: highestLeadPlay.playedBySeat,
      penaltyCards: trick.cards.map((tc) => tc.card),
    };
  }

  return {
    highestLeadSeat: highestLeadPlay.playedBySeat,
    isCleanBurn: true,
    bondiInflictedBySeat: null,
    bondiReceivedBySeat: null,
    penaltyCards: [],
  };
}

/**
 * Heuristic Bot for Bondi:
 * - Must lead Ace of Spades on Trick 1 if held.
 * - When void in leadSuit, dumps the highest-strength off-suit card to inflict Bondi.
 * - When following leadSuit, plays lowest safe card to avoid winning the pickup penalty.
 */
export function bondiBotSelectCard(
  hand: ServerCard[],
  currentTrick: BondiTrick
): ServerCard {
  const playable = hand.filter((c) =>
    isBondiCardPlayable(c, hand, currentTrick)
  );
  if (playable.length === 0) return hand[0];
  if (playable.length === 1) return playable[0];

  const isLeading = !currentTrick.leadSuit || currentTrick.cards.length === 0;
  if (isLeading) {
    if (currentTrick.trickNumber === 1) {
      const spadesAce = playable.find(
        (c) => normalizeSuit(c.suit) === 'spades' && c.rank === 1
      );
      if (spadesAce) return spadesAce;
    }
    playable.sort((a, b) => getBondiCardStrength(a) - getBondiCardStrength(b));
    return playable[0];
  }

  const leadSuit = normalizeSuit(currentTrick.leadSuit!);
  const hasLeadSuit = hand.some((c) => normalizeSuit(c.suit) === leadSuit);
  if (!hasLeadSuit) {
    // Void: dump highest rank card as a Bondi strike
    playable.sort((a, b) => getBondiCardStrength(b) - getBondiCardStrength(a));
    return playable[0];
  }

  // Follow suit with lowest card to avoid capturing penalty
  playable.sort((a, b) => getBondiCardStrength(a) - getBondiCardStrength(b));
  return playable[0];
}

// ============================================================================
// 4. AUTHORITATIVE ROOM GAME STATE & ACTION ORCHESTRATION
// ============================================================================

export function resolveNormalizedGameMode(mode?: string): 'DIGU' | 'DHIHAEH' | 'BONDI' {
  const upper = String(mode || 'DIGU').toUpperCase();
  if (upper.includes('DHIHAEH')) return 'DHIHAEH';
  if (upper.includes('BONDI')) return 'BONDI';
  return 'DIGU';
}

/**
 * Initializes a fresh authoritative match/round state on the room object.
 */
export function initializeRoomMatchState(room: any, seed?: number): any {
  const engineMode = resolveNormalizedGameMode(room.mode || room.gameMode);
  const deck = shuffleDeck(createStandardDeck(), seed);
  const seatCount = Array.isArray(room.seats) && room.seats.length > 0 ? room.seats.length : 4;
  const dealerSeat = typeof room.dealerSeat === 'number' ? room.dealerSeat : 3;

  if (engineMode === 'DHIHAEH') {
    const hands = dealDhihaeh544(deck, dealerSeat);
    const firstLeader = (dealerSeat + 1) % 4;
    room.gameState = {
      engineMode: 'DHIHAEH',
      roundNumber: (room.gameState?.roundNumber || 0) + 1,
      phase: 'TRICK_PLAY',
      dealerSeat,
      activeSeat: firstLeader,
      trumpSuit: null as Suit | null,
      hands,
      stockDeck: [] as ServerCard[],
      discardPile: [] as ServerCard[],
      currentTrick: {
        trickNumber: 1,
        leadSuit: null,
        cards: [],
      } as DhihaehTrick,
      capturedTensBySeat: [[], [], [], []] as ServerCard[][],
      tricksWonBySeat: [0, 0, 0, 0],
      teamScores: room.gameState?.teamScores || { TEAM_A: 0, TEAM_B: 0 },
      turnStartedAt: Date.now(),
    };
  } else if (engineMode === 'BONDI') {
    const hands = dealBondiCards(deck, seatCount);
    const firstLeader = findSpadesAceHolder(hands);
    room.gameState = {
      engineMode: 'BONDI',
      roundNumber: (room.gameState?.roundNumber || 0) + 1,
      phase: 'TRICK_PLAY',
      dealerSeat,
      activeSeat: firstLeader,
      hands,
      stockDeck: [] as ServerCard[],
      discardPile: [] as ServerCard[],
      burnedCardsCount: 0,
      currentTrick: {
        trickNumber: 1,
        leadSuit: null,
        cards: [],
        isCleanBurn: false,
      } as BondiTrick,
      finishOrder: [] as number[],
      turnStartedAt: Date.now(),
    };
  } else {
    // DIGU (10-card Rummy)
    const hands: ServerCard[][] = Array.from({ length: seatCount }, () => []);
    let cardCursor = 0;
    for (let c = 0; c < 10; c++) {
      for (let s = 0; s < seatCount; s++) {
        hands[s].push(deck[cardCursor++]);
      }
    }
    const firstDiscard = deck[cardCursor++];
    const stockDeck = deck.slice(cardCursor);
    const firstLeader = (dealerSeat - 1 + seatCount) % seatCount;

    room.gameState = {
      engineMode: 'DIGU',
      roundNumber: (room.gameState?.roundNumber || 0) + 1,
      phase: 'DRAW_PHASE', // 'DRAW_PHASE' | 'DISCARD_PHASE' | 'ROUND_OVER'
      dealerSeat,
      activeSeat: firstLeader,
      hands,
      stockDeck,
      discardPile: [firstDiscard],
      consecutiveGinsBySeat: room.gameState?.consecutiveGinsBySeat || [0, 0, 0, 0],
      scoresBySeat: room.gameState?.scoresBySeat || [0, 0, 0, 0],
      teamScores: room.gameState?.teamScores || { TEAM_A: 0, TEAM_B: 0 },
      turnStartedAt: Date.now(),
    };
  }

  // Sync seat cardCounts
  if (Array.isArray(room.seats)) {
    room.seats.forEach((seat: any, idx: number) => {
      const seatHand = room.gameState.hands[idx] || [];
      seat.cardCount = seatHand.length;
    });
  }

  return room.gameState;
}

/**
 * Validates and applies an authoritative player or bot action to room.gameState.
 */
export function validateAndApplyAction(
  room: any,
  seatIndex: number,
  action: {
    type: string;
    cardId?: string;
    card?: ServerCard;
    finishCardId?: string;
    trumpSuit?: Suit;
    orderedCardIds?: string[];
    isAfkBotOverride?: boolean;
  }
): {
  valid: boolean;
  error?: string;
  stateChanged: boolean;
  roundEnded?: boolean;
  matchEnded?: boolean;
  summary?: any;
} {
  if (!room.gameState) {
    initializeRoomMatchState(room);
  }
  const gs = room.gameState;
  const seatCount = Array.isArray(room.seats) && room.seats.length > 0 ? room.seats.length : 4;

  // Hand reorder is allowed at any time by the seat owner
  if (action.type === 'REORDER_HAND') {
    const hand: ServerCard[] = gs.hands[seatIndex] || [];
    if (Array.isArray(action.orderedCardIds) && action.orderedCardIds.length === hand.length) {
      const byId = new Map(hand.map((c) => [c.id, c]));
      const reordered = action.orderedCardIds
        .map((id) => byId.get(id))
        .filter((c): c is ServerCard => !!c);
      if (reordered.length === hand.length) {
        gs.hands[seatIndex] = reordered;
        return { valid: true, stateChanged: true };
      }
    }
    return { valid: false, error: 'Invalid hand reorder payload', stateChanged: false };
  }

  if (gs.activeSeat !== seatIndex) {
    return {
      valid: false,
      error: `Out of turn: active seat is ${gs.activeSeat}, received from ${seatIndex}`,
      stateChanged: false,
    };
  }

  const hand: ServerCard[] = gs.hands[seatIndex] || [];

  // -------------------------------------------------------------------------
  // DIGU ACTIONS
  // -------------------------------------------------------------------------
  if (gs.engineMode === 'DIGU') {
    if (action.type === 'DRAW_STOCK') {
      if (gs.phase !== 'DRAW_PHASE' || hand.length !== 10) {
        return { valid: false, error: 'Cannot draw from stock right now', stateChanged: false };
      }
      if (gs.stockDeck.length === 0) {
        // Recycle discard pile except top card
        if (gs.discardPile.length > 1) {
          const top = gs.discardPile.pop()!;
          gs.stockDeck = shuffleDeck(gs.discardPile);
          gs.discardPile = [top];
        } else {
          return { valid: false, error: 'Stock deck exhausted', stateChanged: false };
        }
      }
      const drawn = gs.stockDeck.shift()!;
      hand.push(drawn);
      gs.phase = 'DISCARD_PHASE';
      gs.turnStartedAt = Date.now();
      return { valid: true, stateChanged: true, summary: { drawnCardId: drawn.id, source: 'STOCK' } };
    }

    if (action.type === 'DRAW_DISCARD') {
      if (gs.phase !== 'DRAW_PHASE' || hand.length !== 10 || gs.discardPile.length === 0) {
        return { valid: false, error: 'Cannot draw from discard right now', stateChanged: false };
      }
      const drawn = gs.discardPile.pop()!;
      hand.push(drawn);
      gs.phase = 'DISCARD_PHASE';
      gs.turnStartedAt = Date.now();
      return { valid: true, stateChanged: true, summary: { drawnCardId: drawn.id, source: 'DISCARD' } };
    }

    if (action.type === 'DISCARD') {
      if (gs.phase !== 'DISCARD_PHASE' || hand.length !== 11) {
        return { valid: false, error: 'Must hold 11 cards in DISCARD_PHASE to discard', stateChanged: false };
      }
      const targetId = action.cardId || action.card?.id || hand[hand.length - 1].id;
      const idx = hand.findIndex((c) => c.id === targetId);
      if (idx === -1) {
        return { valid: false, error: `Card ${targetId} not in hand`, stateChanged: false };
      }
      const [discarded] = hand.splice(idx, 1);
      gs.discardPile.push(discarded);
      gs.activeSeat = (gs.activeSeat - 1 + seatCount) % seatCount; // Anti-clockwise
      gs.phase = 'DRAW_PHASE';
      gs.turnStartedAt = Date.now();
      return { valid: true, stateChanged: true, summary: { discardedCard: discarded } };
    }

    if (action.type === 'DECLARE_GIN') {
      if (hand.length !== 11) {
        return { valid: false, error: 'Must hold 11 cards to declare Gin', stateChanged: false };
      }
      const ginCheck = canDeclareGin(hand);
      if (!ginCheck.valid || !ginCheck.finishCard) {
        return { valid: false, error: 'Hand does not satisfy valid Gin melds', stateChanged: false };
      }
      const finishIdx = hand.findIndex((c) => c.id === ginCheck.finishCard!.id);
      const [finishCard] = hand.splice(finishIdx, 1);
      gs.discardPile.push({ ...finishCard, isFaceDown: true });
      gs.phase = 'ROUND_OVER';

      // Track consecutive Gins for -100 upstream feeder penalty
      const prevGins: number[] = Array.isArray(gs.consecutiveGinsBySeat)
        ? gs.consecutiveGinsBySeat
        : [0, 0, 0, 0];
      const nextGins = Array.from({ length: Math.max(4, seatCount) }, () => 0);
      nextGins[seatIndex] = (prevGins[seatIndex] || 0) + 1;
      gs.consecutiveGinsBySeat = nextGins;
      const isThreeConsecutiveGins = nextGins[seatIndex] >= 3;
      const feederSeat = (seatIndex - 1 + seatCount) % seatCount;

      const rawMode = String(room.mode || room.tableFormat || '').toUpperCase();
      const isTeamMode =
        seatCount === 4 &&
        (rawMode === 'TEAM_4P' ||
          (!rawMode.includes('SOLO') && !rawMode.includes('FFA')));

      const targetScore = Number(room.targetScore || room.target_score || 1000);
      let teamADelta = 0;
      let teamBDelta = 0;
      let matchEnded = false;
      const winnerTeam = seatIndex % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
      gs.scoresBySeat = gs.scoresBySeat || Array.from({ length: seatCount }, () => 0);

      if (isTeamMode) {
        const teamAPool = [...(gs.hands[0] || []), ...(gs.hands[2] || [])];
        const teamBPool = [...(gs.hands[1] || []), ...(gs.hands[3] || [])];
        const teamAOpt = optimizeMergedHand(teamAPool);
        const teamBOpt = optimizeMergedHand(teamBPool);

        teamADelta =
          winnerTeam === 'TEAM_A'
            ? ginCheck.isThousandPointRun
              ? 1000
              : teamAOpt.netScore + 100
            : isThreeConsecutiveGins
              ? -100
              : teamAOpt.melds.length === 0
                ? -100
                : teamAOpt.netScore;

        teamBDelta =
          winnerTeam === 'TEAM_B'
            ? ginCheck.isThousandPointRun
              ? 1000
              : teamBOpt.netScore + 100
            : isThreeConsecutiveGins
              ? -100
              : teamBOpt.melds.length === 0
                ? -100
                : teamBOpt.netScore;

        gs.teamScores.TEAM_A = (gs.teamScores.TEAM_A || 0) + teamADelta;
        gs.teamScores.TEAM_B = (gs.teamScores.TEAM_B || 0) + teamBDelta;

        const shareA = Math.round(teamADelta / 2);
        const shareB = Math.round(teamBDelta / 2);
        gs.scoresBySeat[0] = (gs.scoresBySeat[0] || 0) + shareA;
        gs.scoresBySeat[2] = (gs.scoresBySeat[2] || 0) + shareA;
        gs.scoresBySeat[1] = (gs.scoresBySeat[1] || 0) + shareB;
        gs.scoresBySeat[3] = (gs.scoresBySeat[3] || 0) + shareB;

        matchEnded =
          gs.teamScores.TEAM_A >= targetScore || gs.teamScores.TEAM_B >= targetScore;
      } else {
        const seatDeltas: number[] = [];
        for (let s = 0; s < seatCount; s++) {
          const opt = optimizeMergedHand(gs.hands[s] || []);
          let delta = 0;
          if (s === seatIndex) {
            delta = ginCheck.isThousandPointRun ? 1000 : opt.meldScore + 100;
          } else if (isThreeConsecutiveGins && s === feederSeat) {
            delta = -100;
          } else if (opt.melds.length === 0) {
            delta = -100;
          } else {
            delta = opt.netScore;
          }
          seatDeltas.push(delta);
          gs.scoresBySeat[s] = (gs.scoresBySeat[s] || 0) + delta;
        }
        teamADelta = seatDeltas[0] ?? 0;
        const oppDeltas = seatDeltas.filter((_, idx) => idx !== 0);
        teamBDelta = oppDeltas.length > 0 ? Math.max(...oppDeltas) : 0;
        gs.teamScores.TEAM_A = gs.scoresBySeat[0] ?? 0;
        const oppTotals = gs.scoresBySeat
          .slice(0, seatCount)
          .filter((_: number, idx: number) => idx !== 0);
        gs.teamScores.TEAM_B = oppTotals.length > 0 ? Math.max(...oppTotals) : 0;
        matchEnded = gs.scoresBySeat
          .slice(0, seatCount)
          .some((sc: number) => sc >= targetScore);
      }

      return {
        valid: true,
        stateChanged: true,
        roundEnded: true,
        matchEnded,
        summary: {
          winnerSeat: seatIndex,
          winnerTeam,
          finishCard,
          melds: ginCheck.melds,
          isThousandPointRun: ginCheck.isThousandPointRun,
          consecutiveGinPenaltyApplied: isThreeConsecutiveGins,
          feederSeat: isThreeConsecutiveGins ? feederSeat : null,
          teamADelta,
          teamBDelta,
          scoresBySeat: gs.scoresBySeat,
          teamScores: gs.teamScores,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // DHIHAEH ACTIONS
  // -------------------------------------------------------------------------
  if (gs.engineMode === 'DHIHAEH') {
    if (action.type === 'DECLARE_TRUMP' && action.trumpSuit) {
      gs.trumpSuit = normalizeSuit(action.trumpSuit);
      return { valid: true, stateChanged: true, summary: { trumpSuit: gs.trumpSuit } };
    }

    if (action.type === 'PLAY_CARD' || action.type === 'DISCARD') {
      const targetId = action.cardId || action.card?.id;
      const card = hand.find((c) => c.id === targetId) || hand[0];
      if (!card) {
        return { valid: false, error: 'No card found in hand', stateChanged: false };
      }
      if (!isDhihaehCardPlayable(card, hand, gs.currentTrick)) {
        return {
          valid: false,
          error: `Must follow lead suit (${gs.currentTrick.leadSuit})`,
          stateChanged: false,
        };
      }

      const idx = hand.findIndex((c) => c.id === card.id);
      hand.splice(idx, 1);

      if (!gs.currentTrick.leadSuit || gs.currentTrick.cards.length === 0) {
        gs.currentTrick.leadSuit = normalizeSuit(card.suit);
      } else if (
        !gs.trumpSuit &&
        normalizeSuit(card.suit) !== normalizeSuit(gs.currentTrick.leadSuit)
      ) {
        // Dynamic cut establishes trump suit on first void cut
        gs.trumpSuit = normalizeSuit(card.suit);
      }

      gs.currentTrick.cards.push({ card, playedBySeat: seatIndex });

      if (gs.currentTrick.cards.length < 4) {
        gs.activeSeat = (seatIndex + 1) % 4;
        gs.turnStartedAt = Date.now();
        return { valid: true, stateChanged: true, summary: { playedCard: card } };
      }

      // Resolve completed 4-card trick
      const winnerSeat = resolveDhihaehTrickWinner(gs.currentTrick, gs.trumpSuit);
      gs.tricksWonBySeat[winnerSeat] = (gs.tricksWonBySeat[winnerSeat] || 0) + 1;

      const tensInTrick = gs.currentTrick.cards
        .map((tc: DhihaehTrickCard) => tc.card)
        .filter((c: ServerCard) => c.rank === 10);
      if (tensInTrick.length > 0) {
        gs.capturedTensBySeat[winnerSeat].push(...tensInTrick);
      }

      const completedTrickNumber = gs.currentTrick.trickNumber;
      const allHandsEmpty = gs.hands.every((h: ServerCard[]) => h.length === 0);

      if (completedTrickNumber >= 13 || allHandsEmpty) {
        gs.phase = 'ROUND_OVER';
        const team1Tens =
          gs.capturedTensBySeat[0].length + gs.capturedTensBySeat[2].length;
        const team2Tens =
          gs.capturedTensBySeat[1].length + gs.capturedTensBySeat[3].length;
        const team1Tricks = gs.tricksWonBySeat[0] + gs.tricksWonBySeat[2];
        const team2Tricks = gs.tricksWonBySeat[1] + gs.tricksWonBySeat[3];

        const scoreRes = evaluateDhihaehRoundScore({
          team1Tens,
          team2Tens,
          team1Tricks,
          team2Tricks,
          team1PreviousScore: gs.teamScores.TEAM_A || 0,
          team2PreviousScore: gs.teamScores.TEAM_B || 0,
        });

        gs.teamScores.TEAM_A = scoreRes.team1Score;
        gs.teamScores.TEAM_B = scoreRes.team2Score;

        const targetScore = Number(room.targetScore || room.target_score || 12);
        const matchEnded =
          gs.teamScores.TEAM_A >= targetScore ||
          gs.teamScores.TEAM_B >= targetScore ||
          scoreRes.outcomeType === 'haasbagga';

        return {
          valid: true,
          stateChanged: true,
          roundEnded: true,
          matchEnded,
          summary: {
            trickWinner: winnerSeat,
            scoreResult: scoreRes,
          },
        };
      }

      // Advance to next trick led by winnerSeat
      gs.currentTrick = {
        trickNumber: completedTrickNumber + 1,
        leadSuit: null,
        cards: [],
      };
      gs.activeSeat = winnerSeat;
      gs.turnStartedAt = Date.now();
      return {
        valid: true,
        stateChanged: true,
        summary: { playedCard: card, trickWinner: winnerSeat },
      };
    }
  }

  // -------------------------------------------------------------------------
  // BONDI ACTIONS
  // -------------------------------------------------------------------------
  if (gs.engineMode === 'BONDI') {
    if (action.type === 'PLAY_CARD' || action.type === 'DISCARD') {
      const targetId = action.cardId || action.card?.id;
      const card = hand.find((c) => c.id === targetId) || hand[0];
      if (!card) {
        return { valid: false, error: 'No card in hand', stateChanged: false };
      }
      if (!isBondiCardPlayable(card, hand, gs.currentTrick)) {
        return {
          valid: false,
          error:
            gs.currentTrick.trickNumber === 1 && gs.currentTrick.cards.length === 0
              ? 'Trick 1 must be led with the Ace of Spades (S-01)'
              : `Must follow lead suit (${gs.currentTrick.leadSuit})`,
          stateChanged: false,
        };
      }

      const idx = hand.findIndex((c) => c.id === card.id);
      hand.splice(idx, 1);
      if (hand.length === 0 && !gs.finishOrder.includes(seatIndex)) {
        gs.finishOrder.push(seatIndex);
      }

      if (!gs.currentTrick.leadSuit || gs.currentTrick.cards.length === 0) {
        gs.currentTrick.leadSuit = normalizeSuit(card.suit);
      }

      gs.currentTrick.cards.push({ card, playedBySeat: seatIndex });

      const isOffSuitCut =
        normalizeSuit(card.suit) !== normalizeSuit(gs.currentTrick.leadSuit);
      const activeSeatsWithCards = gs.hands
        .map((h: ServerCard[], sIdx: number) => (h.length > 0 ? sIdx : -1))
        .filter((sIdx: number) => sIdx !== -1);

      // Trick concludes immediately on an off-suit Bondi cut OR when all active players have played
      if (isOffSuitCut || gs.currentTrick.cards.length >= Math.max(2, activeSeatsWithCards.length)) {
        const resolution = resolveBondiTrick(gs.currentTrick);
        if (!resolution.isCleanBurn && resolution.bondiReceivedBySeat !== null) {
          // Victim picks up all cards in trick
          gs.hands[resolution.bondiReceivedBySeat].push(...resolution.penaltyCards);
          gs.activeSeat = resolution.bondiReceivedBySeat;
        } else {
          gs.burnedCardsCount =
            (gs.burnedCardsCount || 0) + gs.currentTrick.cards.length;
          gs.activeSeat = resolution.highestLeadSeat;
        }

        const remainingPlayers = gs.hands.filter((h: ServerCard[]) => h.length > 0).length;
        const roundEnded = remainingPlayers <= 1;
        if (roundEnded) {
          gs.phase = 'ROUND_OVER';
        } else {
          // Ensure activeSeat still holds cards
          for (let step = 0; step < seatCount; step++) {
            const candidateSeat = (gs.activeSeat + step) % seatCount;
            if (gs.hands[candidateSeat].length > 0) {
              gs.activeSeat = candidateSeat;
              break;
            }
          }
          gs.currentTrick = {
            trickNumber: gs.currentTrick.trickNumber + 1,
            leadSuit: null,
            cards: [],
            isCleanBurn: false,
          };
        }

        gs.turnStartedAt = Date.now();
        return {
          valid: true,
          stateChanged: true,
          roundEnded,
          matchEnded: roundEnded,
          summary: {
            playedCard: card,
            resolution,
          },
        };
      }

      // Move to next seat that still holds cards
      for (let step = 1; step <= seatCount; step++) {
        const nextSeat = (seatIndex + step) % seatCount;
        if (gs.hands[nextSeat].length > 0) {
          gs.activeSeat = nextSeat;
          break;
        }
      }
      gs.turnStartedAt = Date.now();
      return { valid: true, stateChanged: true, summary: { playedCard: card } };
    }
  }

  return { valid: false, error: `Unsupported action type: ${action.type}`, stateChanged: false };
}

/**
 * Executes a deterministic heuristic bot turn for the active seat.
 * Supports AFK turn timeout override (`isAfkBotOverride = true`).
 */
export function computeBotActionForActiveSeat(
  room: any,
  isAfkBotOverride = false
): {
  seatIndex: number;
  isAfkBotOverride: boolean;
  actionsExecuted: any[];
  roundEnded: boolean;
  matchEnded: boolean;
} {
  if (!room.gameState) {
    initializeRoomMatchState(room);
  }
  const gs = room.gameState;
  const seatIndex = gs.activeSeat;
  const hand: ServerCard[] = gs.hands[seatIndex] || [];
  const actionsExecuted: any[] = [];
  let roundEnded = false;
  let matchEnded = false;

  if (gs.engineMode === 'DIGU') {
    if (gs.phase === 'DRAW_PHASE' && hand.length === 10) {
      const topDiscard =
        gs.discardPile.length > 0
          ? gs.discardPile[gs.discardPile.length - 1]
          : null;
      const drawType = diguBotShouldDrawDiscard(hand, topDiscard)
        ? 'DRAW_DISCARD'
        : 'DRAW_STOCK';
      const drawRes = validateAndApplyAction(room, seatIndex, {
        type: drawType,
        isAfkBotOverride,
      });
      actionsExecuted.push({ type: drawType, result: drawRes });
    }

    if (gs.phase === 'DISCARD_PHASE' && gs.hands[seatIndex].length === 11) {
      const decision = diguBotChooseAction(gs.hands[seatIndex]);
      const actType = decision.isGinSlam ? 'DECLARE_GIN' : 'DISCARD';
      const discRes = validateAndApplyAction(room, seatIndex, {
        type: actType,
        cardId: decision.cardToDiscard.id,
        isAfkBotOverride,
      });
      actionsExecuted.push({
        type: actType,
        cardId: decision.cardToDiscard.id,
        result: discRes,
      });
      roundEnded = !!discRes.roundEnded;
      matchEnded = !!discRes.matchEnded;
    }
  } else if (gs.engineMode === 'DHIHAEH') {
    const selected = dhihaehBotSelectCard({
      hand,
      currentTrick: gs.currentTrick,
      trumpSuit: gs.trumpSuit,
      seatIndex,
    });
    const res = validateAndApplyAction(room, seatIndex, {
      type: 'PLAY_CARD',
      cardId: selected.id,
      isAfkBotOverride,
    });
    actionsExecuted.push({ type: 'PLAY_CARD', cardId: selected.id, result: res });
    roundEnded = !!res.roundEnded;
    matchEnded = !!res.matchEnded;
  } else if (gs.engineMode === 'BONDI') {
    const selected = bondiBotSelectCard(hand, gs.currentTrick);
    const res = validateAndApplyAction(room, seatIndex, {
      type: 'PLAY_CARD',
      cardId: selected.id,
      isAfkBotOverride,
    });
    actionsExecuted.push({ type: 'PLAY_CARD', cardId: selected.id, result: res });
    roundEnded = !!res.roundEnded;
    matchEnded = !!res.matchEnded;
  }

  return {
    seatIndex,
    isAfkBotOverride,
    actionsExecuted,
    roundEnded,
    matchEnded,
  };
}

// ============================================================================
// 5. ANTI-CHEAT STATE SANITIZER (STRIPS OPPONENT HANDS & STOCK DECK)
// ============================================================================

/**
 * Strips opponent hand arrays and replaces them with `cardCount: number` for anti-cheat security.
 * Also hides the unrevealed stockDeck array (exposing only `stockCount: number`).
 */
export function sanitizeStateForSeat(
  room: any,
  viewerSeatIndex: number | null | undefined
): any {
  if (!room) return null;

  const sanitizedSeats = Array.isArray(room.seats)
    ? room.seats.map((seat: any, idx: number) => {
        const sIndex = seat.seatIndex ?? seat.seat_index ?? idx;
        const rawHand: ServerCard[] | undefined =
          seat.hand ?? room.gameState?.hands?.[sIndex];
        const cardCount = Array.isArray(rawHand)
          ? rawHand.length
          : typeof seat.cardCount === 'number'
          ? seat.cardCount
          : 0;

        const copy = { ...seat, cardCount };
        if (viewerSeatIndex !== null && viewerSeatIndex !== undefined && sIndex === viewerSeatIndex) {
          copy.hand = Array.isArray(rawHand) ? [...rawHand] : [];
        } else {
          delete copy.hand;
        }
        return copy;
      })
    : [];

  let sanitizedGameState: any = undefined;
  if (room.gameState) {
    const gs = room.gameState;
    const seatHandsSummary = Array.isArray(gs.hands)
      ? gs.hands.map((handArr: ServerCard[], idx: number) => {
          if (viewerSeatIndex !== null && viewerSeatIndex !== undefined && idx === viewerSeatIndex) {
            return {
              seatIndex: idx,
              cardCount: handArr.length,
              hand: [...handArr],
            };
          }
          return {
            seatIndex: idx,
            cardCount: Array.isArray(handArr) ? handArr.length : 0,
          };
        })
      : [];

    sanitizedGameState = {
      ...gs,
      myHand:
        viewerSeatIndex !== null &&
        viewerSeatIndex !== undefined &&
        Array.isArray(gs.hands?.[viewerSeatIndex])
          ? [...gs.hands[viewerSeatIndex]]
          : undefined,
      seatHands: seatHandsSummary,
      stockCount: Array.isArray(gs.stockDeck) ? gs.stockDeck.length : 0,
    };
    delete sanitizedGameState.hands;
    delete sanitizedGameState.stockDeck;
  }

  return {
    ...room,
    seats: sanitizedSeats,
    gameState: sanitizedGameState,
  };
}
