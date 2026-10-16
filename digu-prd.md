# Digu (Maldivian Rummy) - System Architecture & Build Specification (PRD)

Save this file as `digu-prd.md` in your project root directory.

---

## Section 1: Initiating Prompt for AI Coding Agent / CLI

```text
Read digu-prd.md. Act as a Senior Systems Architect and Full-Stack Game Developer. We are building a digital adaptation of a local Maldivian card game called 'Digu'. 

First, initialize a React + Vite + TypeScript project configured with Tailwind CSS, Zustand for atomic state management, and Framer Motion for card animations. 

Then, strictly implement the rules and architectures detailed in this document:
1. Build the isolated, pure-functional game engine (@game/core) with all card types, Fisher-Yates deck generation, Ace-restricted meld validation, 1,000-point individual run checks, and the 20-card backtracking solver for team hand merging.
2. Implement the state store using Zustand to cleanly separate game logic from React rendering cycles.
3. Build the interactive table UI featuring the 4+3+3 meld dropzones, staging tray, face-down slam finish slot, and end-of-round score calculation sheet.

Execute this step-by-step. Begin by scaffolding the workspace and writing the domain models in src/core/models/types.ts.
```

---

## Section 2: Game Domain & Strict Rule Matrix

### 2.1 Table & Deck Configuration
- **Game Name**: Digu (Maldivian Rummy).
- **Deck**: Exactly 1 standard 52-card deck. **NO JOKERS**.
- **Player Formats**:
  - **2-Player Solo**: 1v1 head-to-head.
  - **4-Player Cutthroat**: 4 individual seats.
  - **4-Player Team Mode (2v2)**: Team A (Seats 0 & 2) vs Team B (Seats 1 & 3). Teammates sit opposite each other.
- **Hand Invariant**:
  - **Resting Hand Size**: Exactly 10 cards per player.
  - **Active Turn Hand Size**: Exactly 11 cards (draw 1 card before taking an action).

### 2.2 Melds & The Strict Ace Rule
- **Set (Book)**: 3 or 4 cards of identical rank across distinct suits (e.g., $7\spadesuit, 7\diamondsuit, 7\heartsuit$).
- **Sequence (Run)**: 3 or more continuous ranks of the same suit (e.g., $4\clubsuit, 5\clubsuit, 6\clubsuit$).
- **THE STRICT ACE RULE (CRITICAL)**:
  - Aces (Rank 1) **CANNOT** be used in standard sequences under any circumstance (neither $A\text{-}2\text{-}3$ nor $Q\text{-}K\text{-}A$ is permitted).
  - Aces can **ONLY** be melded as a Set (3 or 4 Aces) **OR** as part of the Special 1,000-Point Run.
  - Any unmelded Ace is counted strictly as $-15$ points of deadwood debt.

### 2.3 Winning Condition ("Gin") & The Finish Slam
- **Standard Gin**: Hand must contain exactly 10 melded cards partitioned into:
  $$\mathbf{\text{One 4-Card Meld}} + \mathbf{\text{Two 3-Card Melds}} = 10\text{ Cards (0 Deadwood)}$$
- **The Smashed Face-Down Slam**: The 11th card that completes the Gin is not discarded face-up; it is slammed face-down into a dedicated Finish Slot (`finishSlotCard`). The card remains concealed until the winning melds are verified.

### 2.4 Pre-Game First Turn & Deal Options
- **High-Card Cut (Table Scatter)**: All 52 cards are scattered face-down. Each player picks one card. Highest rank designates the Dealer.
- **First Turn Lead**: The seat directly upstream of the dealer `(dealerIndex - 1 + numPlayers) % numPlayers` plays first.
- **Deal Mode Setting**:
  - `DEAL_11_CARDS`: The lead player receives 11 cards; all other players receive 10. Discard pile starts empty. Lead player skips the draw phase and immediately acts (discards 1 or Gins).
  - `DRAW_FIRST_CARD`: All players receive 10 cards. Top card of the stock pile flips face-up into the discard pile. Lead player starts with a normal draw.

### 2.5 Valuation, Debt, and Penalties
- **Card Values**:
  - Ace: $15\text{ points}$
  - Face Cards ($K, Q, J, 10$): $10\text{ points}$ each
  - Pip Cards ($2\text{–}9$): Face value ($2\text{ to }9\text{ points}$)
- **Deadwood Debt Mechanic**: Every card not in a valid meld is an active liability. Its point value is deducted directly from the round score.
- **Special 1,000-Point Run**: Exactly 10 cards in one suit forming a single contiguous sequence:
  - Option 1 (Low): $A\text{-}2\text{-}3\text{-}4\text{-}5\text{-}6\text{-}7\text{-}8\text{-}9\text{-}10$
  - Option 2 (High): $5\text{-}6\text{-}7\text{-}8\text{-}9\text{-}10\text{-}J\text{-}Q\text{-}K\text{-}A$
  - *Constraint*: Must be held completely within an individual player's 10-card hand. Merging team cards cannot form this hand.
- **Team Mode (+100 Gin Bonus & Hand Merge)**:
  - When a team Gins, they are awarded a flat $+100\text{ Gin Bonus}$.
  - Teammates combine their cards ($10 + 10 = \mathbf{20\text{ cards}}$). A combinatorial backtracking solver extracts valid non-overlapping melds (3 or 4 cards) to maximize:
    $$\text{Net Score} = \sum \text{Meld Points} - \sum \text{Debt Points}$$
- **Zero-Meld Penalty ($-100$ Points)**: If an individual or team forms 0 valid melds, they receive a flat $-100\text{ point penalty}$ (deadwood debt is ignored).
- **3-Consecutive-Gin Penalty ($-100$ Points)**: If a player or team Gins 3 consecutive rounds, the upstream feeder seat (the player who sits before them and feeds discards) receives a flat $-100\text{ point penalty}$, forfeiting their round points.
- **Round Succession**: The winner of round $N$ leads the first turn of round $N+1$.

---

## Section 3: Technical Architecture & Directory Blueprint

```plaintext
src/
├── core/                         # Pure TypeScript Engine (Zero DOM Dependencies)
│   ├── models/
│   │   └── types.ts              # Core contracts & domain interfaces
│   ├── deck/
│   │   └── deck.ts               # Fisher-Yates deck shuffle and dealing logic
│   └── engine/
│       ├── validator.ts          # Pure meld validation (Sets, Runs, Gin, 1000-pt run)
│       ├── solver.ts             # 20-card backtracking team merge optimizer
│       └── resolver.ts           # Round scoring, bonuses, and penalties calculation
├── store/
│   └── useGameStore.ts           # Zustand state store bridging engine with UI
├── components/
│   ├── table/
│   │   ├── TableSurface.tsx      # Main felt/wood table layout
│   │   ├── StockDiscardArea.tsx  # Stock deck, discard pile, and finish slot
│   │   └── OpponentHand.tsx      # Masked opponent card backs and status
│   ├── player/
│   │   ├── MeldDropzone.tsx      # Interactive 4-card and 3-card drop slots
│   │   └── PlayerHandTray.tsx    # Dock for unassigned cards and 11th draw card
│   └── shared/
│       ├── PlayingCard.tsx       # Animated card component (Framer Motion)
│       └── RoundScoreModal.tsx   # Detailed scoring and merge breakdown overlay
├── index.css                     # Tailwind CSS v4 styling rules
├── App.tsx                       # App entry point
└── main.tsx
```

---

## Section 4: Domain Contracts (`src/core/models/types.ts`)

```typescript
export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string; // e.g., "S-01" (Ace of Spades), "D-13" (King of Diamonds)
  suit: Suit;
  rank: Rank;
  isFaceDown?: boolean;
}

export type GamePhase =
  | 'SCATTER_CUT'
  | 'ROUND_DEALING'
  | 'AWAIT_DRAW'
  | 'AWAIT_ACTION'
  | 'ROUND_RESOLVING'
  | 'MATCH_OVER';

export interface TableRules {
  mode: 'SOLO_2P' | 'SOLO_4P' | 'TEAM_4P';
  dealOption: 'DEAL_11_CARDS' | 'DRAW_FIRST_CARD';
  targetScore: number;         // e.g. 500, 1000, 1500
  turnTimeoutSeconds: number;  // Default: 30s
}

export interface PlayerState {
  id: string;
  name: string;
  seatIndex: number;
  teamId: 'TEAM_A' | 'TEAM_B' | null;
  hand: Card[];
  handCount: number;
  cumulativeScore: number;
  consecutiveGins: number;
  scatterCard: Card | null;
  isConnected: boolean;
}

export interface GameState {
  roomId: string;
  rules: TableRules;
  phase: GamePhase;
  players: PlayerState[];
  dealerIndex: number;
  activePlayerIndex: number;
  stockPile: Card[];
  discardPile: Card[];
  finishSlotCard: Card | null; // Smashed face-down 11th card
  lastRoundWinnerId: string | null;
}
```

---

## Section 5: Core Algorithmic Logic

### 5.1 Meld Validator (`src/core/engine/validator.ts`)
```typescript
import { Card, Rank, Suit } from '../models/types';

export class RummyValidator {
  static getCardPoints(rank: Rank): number {
    if (rank === 1) return 15;
    if (rank >= 10) return 10;
    return rank;
  }

  // Check 10-card suited sequence (A-10 or 5-A) - Individual hand only
  static checkThousandPointRun(hand: Card[]): boolean {
    if (hand.length !== 10) return false;
    const suit = hand[0].suit;
    if (!hand.every(c => c.suit === suit)) return false;

    const ranks = hand.map(c => c.rank).sort((a, b) => a - b);
    const isLowRun = ranks.every((r, idx) => r === idx + 1);
    const highTarget = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const isHighRun = ranks.every((r, idx) => r === highTarget[idx]);

    return isLowRun || isHighRun;
  }

  // Sets: 3 or 4 cards of identical rank across distinct suits (Aces allowed)
  static isValidSet(cards: Card[]): boolean {
    if (cards.length !== 3 && cards.length !== 4) return false;
    const targetRank = cards[0].rank;
    const seenSuits = new Set<Suit>();

    for (const c of cards) {
      if (c.rank !== targetRank || seenSuits.has(c.suit)) return false;
      seenSuits.add(c.suit);
    }
    return true;
  }

  // Standard Runs: Minimum length 3, same suit, sequential ranks.
  // CRITICAL RULE: Aces (rank 1) are strictly rejected from standard runs.
  static isValidRun(cards: Card[]): boolean {
    if (cards.length < 3) return false;
    if (cards.some(c => c.rank === 1)) return false; // Aces forbidden

    const suit = cards[0].suit;
    if (!cards.every(c => c.suit === suit)) return false;

    const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i + 1] !== ranks[i] + 1) return false;
    }
    return true;
  }

  // Validates standard 10-card Gin (One 4-card meld + Two 3-card melds)
  static validateGin(melds: Card[][]): boolean {
    if (melds.length !== 3) return false;
    const sizes = melds.map(m => m.length).sort((a, b) => a - b);
    if (sizes[0] !== 3 || sizes[1] !== 3 || sizes[2] !== 4) return false;

    return melds.every(group => this.isValidSet(group) || this.isValidRun(group));
  }
}
```

### 5.2 20-Card Team Merger Optimizer (`src/core/engine/solver.ts`)
```typescript
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
      if (group.length >= 3) candidates.push(...this.getSubsets(group, 3));
      if (group.length === 4) candidates.push(group);
    });

    // 2. Runs (Aces excluded)
    const suitMap = new Map<Suit, Card[]>();
    cards
      .filter(c => c.rank !== 1)
      .forEach(c => {
        const list = suitMap.get(c.suit) || [];
        list.push(c);
        suitMap.set(c.suit, list);
      });

    suitMap.forEach(group => {
      const sorted = [...group].sort((a, b) => a.rank - b.rank);
      for (let len = 3; len <= 5; len++) {
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

  static optimizeMergedHand(cards: Card[]): MergeOptimizationResult {
    const candidates = this.extractCandidateMelds(cards);
    let bestNetScore = -Infinity;
    let bestMelds: Card[][] = [];

    function search(index: number, usedIds: Set<string>, currentMelds: Card[][], currentMeldPoints: number) {
      const unmelded = cards.filter(c => !usedIds.has(c.id));
      const currentDebtPoints = unmelded.reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);
      const currentNet = currentMeldPoints - currentDebtPoints;

      if (currentNet > bestNetScore) {
        bestNetScore = currentNet;
        bestMelds = [...currentMelds];
      }

      for (let i = index; i < candidates.length; i++) {
        const meld = candidates[i];
        if (!meld.some(c => usedIds.has(c.id))) {
          meld.forEach(c => usedIds.add(c.id));
          currentMelds.push(meld);
          const points = meld.reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);

          search(i + 1, usedIds, currentMelds, currentMeldPoints + points);

          meld.forEach(c => usedIds.delete(c.id));
          currentMelds.pop();
        }
      }
    }

    search(0, new Set(), [], 0);

    const usedCardIds = new Set(bestMelds.flat().map(c => c.id));
    const deadwood = cards.filter(c => !usedCardIds.has(c.id));
    const meldScore = bestMelds.flat().reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);
    const debtScore = deadwood.reduce((sum, c) => sum + RummyValidator.getCardPoints(c.rank), 0);

    return {
      melds: bestMelds,
      deadwood,
      meldScore,
      debtScore,
      netScore: meldScore - debtScore,
    };
  }
}
```

---

## Section 6: Visual & Interaction Design Spec

- **Color Palette**:
  - Weathered Teak Rim: `#2C1B10`
  - Rich Lagoon / Felt Mat: `#0F3838`
  - Warm Brass / Gold Accents: `#D4AF37`
  - Card Background: Ivory / Eggshell (`#FAF7F2`) with crisp black and crimson pips.
- **Meld Slots UI**:
  - 3 designated dropzones pinned to the bottom of the table:
    - Slot 1 (4-Card Meld)
    - Slot 2 (3-Card Meld)
    - Slot 3 (3-Card Meld)
  - Real-time outline validation: subtle gold/green glow for valid melds, subtle crimson glow with tooltip if an Ace is illegally placed in a sequence.
- **The Finish Move**:
  - When declaring Gin, dragging the 11th card to the dedicated Finish Slot triggers a rotation flip, screen shake, and a wooden slam effect.