---
name: digu-rules-engine
description: >
  Pure, deterministic rules engine and scoring validation functions for Digu (Maldivian Rummy).
  Covers Ace-restricted melds, 1,000-point runs, deadwood accounting, and 20-card backtracking team merge optimization.
---

# Digu Rules Engine & Scoring Logic

This skill defines the pure, side-effect-free mathematical specifications and validation algorithms that drive **Digu (Maldivian Rummy)**.

---

## 1. Core Card & Hand Model

- Standard 52-card deck (Suits: `SPADES`, `HEARTS`, `DIAMONDS`, `CLUBS`; Ranks: `1` to `13`).
- **No Jokers**.
- Resting hand size: exactly 10 cards. Active turn hand size: exactly 11 cards.

### Card Point Values:
- **Ace (`Rank 1`)**: $15\text{ points}$
- **Court / Face Cards (`Rank 10, 11, 12, 13`)**: $10\text{ points}$
- **Pip Cards (`Rank 2` to `9`)**: Face value ($2\text{ to }9\text{ points}$)

---

## 2. Meld Validation Rules & The Strict Ace Invariant

### 2.1 Sets (Books)
- **Definition**: 3 or 4 cards sharing identical rank across distinct suits.
- **Example**: `[7♠, 7♦, 7♥]` or `[A♠, A♦, A♥, A♣]`.
- **Validation**:
  1. Size is 3 or 4 cards.
  2. All cards share `card[0].rank`.
  3. All suits are pairwise unique (`Set(suits).size === cards.length`).

### 2.2 Standard Runs (Sequences)
- **Definition**: 3 or more strictly contiguous cards of the same suit.
- **CRITICAL ACE RULE**:
  $$\text{Ace (Rank 1) is STRICTLY PROHIBITED in standard sequences.}$$
  - $A\text{-}2\text{-}3$ is **INVALID**.
  - $Q\text{-}K\text{-}A$ is **INVALID**.
  - Any sequence containing a card with `rank === 1` is invalid in standard meld play.
- **Validation**:
  1. Size $\ge 3$.
  2. All cards share the same `suit`.
  3. Sort by rank ascending: for every $j \in [0, \text{length}-2]$, `cards[j+1].rank === cards[j].rank + 1`.
  4. Ensure `!cards.some(c => c.rank === 1)`.

### 2.3 Special 1,000-Point Contiguous Run
A legendary Maldivian Rummy hand formed by an individual player holding exactly 10 cards in a single suit:
- **Option 1 (Low Run)**: $A\text{-}2\text{-}3\text{-}4\text{-}5\text{-}6\text{-}7\text{-}8\text{-}9\text{-}10$ of the same suit.
- **Option 2 (High Run)**: $5\text{-}6\text{-}7\text{-}8\text{-}9\text{-}10\text{-}J\text{-}Q\text{-}K\text{-}A$ of the same suit.
- **Constraints**:
  - Must be achieved in an individual player's 10-card hand.
  - Teammates cannot combine cards across seats to form a 1,000-point run.
  - Grants instant round win and $+1,000$ points to the player/team.

---

## 3. Gin Declaration & Smashed Face-Down Finish

### 3.1 Gin Winning Condition
A player can only trigger a **Gin Declaration** when holding 11 cards (during their active action phase) where:
1. Exactly 10 cards can be partitioned into valid melds:
   $$\text{Meld Configuration} = \text{One 4-Card Meld} + \text{Two 3-Card Melds (Total: 10 Cards)}$$
   OR the 10 cards satisfy the Special 1,000-Point Run.
2. The remaining 11th card is the **Finish Slam Card** (`finishSlotCard`).
3. Deadwood points of the 10 cards must equal **0**.

### 3.2 Pure Gin Partition Solver
Given an 11-card hand, find if there exists a discard card $c_{\text{finish}} \in \text{hand}$ such that $\text{hand} \setminus \{c_{\text{finish}}\}$ can be partitioned into:
- $\{M_1, M_2, M_3\}$ with $|M_1| = 4, |M_2| = 3, |M_3| = 3$ and all $M_i$ are valid sets or runs.

```typescript
export function canDeclareGin(hand11: Card[]): { valid: boolean; finishCard?: Card; melds?: Card[][] } {
  if (hand11.length !== 11) return { valid: false };

  for (let i = 0; i < hand11.length; i++) {
    const candidateFinish = hand11[i];
    const remaining10 = hand11.filter((_, idx) => idx !== i);

    if (is1000PointRun(remaining10)) {
      return { valid: true, finishCard: candidateFinish, melds: [remaining10] };
    }

    const partition = solve10CardMelds(remaining10);
    if (partition) {
      return { valid: true, finishCard: candidateFinish, melds: partition };
    }
  }
  return { valid: false };
}
```

---

## 4. Deadwood Calculation & Penalty Accounting

### 4.1 Deadwood Debt
- Any card left unmelded at the end of the round is counted as negative liability:
  $$\text{Card Debt} = \begin{cases} -15 & \text{if Rank } = 1\text{ (Ace)} \\ -10 & \text{if Rank } \ge 10 \\ -\text{rank} & \text{otherwise} \end{cases}$$
- **Ace Debt Warning**: Unmelded Aces produce severe point destruction ($-15\text{ pts}$ each).

### 4.2 Special Table Penalties
1. **Zero-Meld Penalty ($-100$ Points)**:
   - If a player (or team) fails to produce even a single valid meld at round resolution, they incur a flat $-100\text{ point penalty}$ and deadwood debt calculation is bypassed.
2. **3-Consecutive-Gin Penalty ($-100$ Points to Upstream Feeder)**:
   - If Player $X$ achieves 3 consecutive Gins, the player sitting directly upstream (who discards immediately prior to $X$) is penalized $-100\text{ points}$ for repeatedly feeding winning discards.
3. **Team Gin Bonus ($+100$ Points)**:
   - The team that achieves Gin receives $+100$ bonus points added to their round tally.

---

## 5. Team 20-Card Backtracking Solver

In 2v2 Team Mode, when a round ends, teammates pool their remaining cards ($10 + 10 = 20\text{ cards}$):
- **Objective**: Find a disjoint set of melds $M = \{m_1, m_2, \dots, m_k\}$ from the 20 cards that maximizes:
  $$\text{Objective Score} = \sum_{m \in M} \text{Points}(m) - \sum_{c \in (\text{Pool} \setminus \bigcup M)} \text{Debt}(c)$$
- **Algorithm**:
  1. Generate all candidate valid 3-card and 4-card melds from the 20-card pool.
  2. Represent candidate melds as bitmasks (integers $0 \dots 2^{20}-1$).
  3. Execute depth-first branch-and-bound search selecting disjoint bitmasks.
  4. Prune branches whose theoretical upper bound cannot exceed current best score.
  5. Return optimal melds and remaining deadwood.
