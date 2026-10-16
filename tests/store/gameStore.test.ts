import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../src/store/useGameStore';
import { Card } from '../../src/core/models/types';

describe('useGameStore (Gin Rummy Plus Hand & State Mechanics)', () => {
  beforeEach(() => {
    useGameStore.getState().initGame({ mode: 'SOLO_2P', dealOption: 'DEAL_11_CARDS' });
    // Seat 1 dealer designates Seat 0 (human) as the first lead player
    useGameStore.setState(prev => ({
      gameState: { ...prev.gameState, dealerIndex: 1 },
    }));
  });

  it('initializes with Thaasbai branding and Digu game mode in SCATTER_CUT phase', () => {
    const state = useGameStore.getState();
    expect(state.appName).toBe('Thaasbai');
    expect(state.activeGame).toBe('DIGU');
    expect(state.gameState.phase).toBe('SCATTER_CUT');
    expect(state.gameState.players.length).toBe(2);
  });

  it('performs scatter cut and designates dealer', () => {
    const { startScatterCut } = useGameStore.getState();
    startScatterCut();

    const state = useGameStore.getState();
    expect(state.gameState.phase).toBe('ROUND_DEALING');
    expect(state.gameState.players[0].scatterCard).not.toBeNull();
    expect(state.gameState.players[1].scatterCard).not.toBeNull();
  });

  it('deals round with NO unassigned cards: all 11 cards are directly in active player hand', () => {
    const { dealRound } = useGameStore.getState();
    dealRound();

    const state = useGameStore.getState();
    expect(state.gameState.phase).toBe('AWAIT_ACTION');

    // Lead player has 11 cards right in handCards
    expect(state.handCards.length).toBe(11);
    expect(state.gameState.players[state.gameState.activePlayerIndex].hand.length).toBe(11);
  });

  it('handles discard action: reduces hand to 10 resting cards, updates discard pile, advances turn', () => {
    const { dealRound } = useGameStore.getState();
    dealRound();

    const initialState = useGameStore.getState();
    const activePlayerIndex = initialState.gameState.activePlayerIndex;
    const cardToDiscard = initialState.handCards[0].id;

    useGameStore.getState().discardCard(cardToDiscard);

    const afterState = useGameStore.getState();
    // Hand size must now be exactly 10 (Resting Hand Invariant)
    expect(afterState.gameState.players[activePlayerIndex].hand.length).toBe(10);
    expect(afterState.gameState.discardPile.length).toBe(1);
    expect(afterState.gameState.discardPile[0].id).toBe(cardToDiscard);

    // Turn advances to next player (Seat 1 - Bot)
    expect(afterState.gameState.activePlayerIndex).toBe((activePlayerIndex + 1) % 2);
    expect(afterState.gameState.phase).toBe('AWAIT_DRAW');
  });

  it('draws card from stock: expands hand to 11 cards and enters AWAIT_ACTION', () => {
    useGameStore.getState().initGame({ mode: 'SOLO_2P', dealOption: 'DRAW_FIRST_CARD' });
    useGameStore.setState(prev => ({
      gameState: { ...prev.gameState, dealerIndex: 1 },
    }));
    useGameStore.getState().dealRound();

    const stateBefore = useGameStore.getState();
    expect(stateBefore.gameState.phase).toBe('AWAIT_DRAW');
    expect(stateBefore.handCards.length).toBe(10);
    const initialStockCount = stateBefore.gameState.stockPile.length;

    useGameStore.getState().drawFromStock();

    const stateAfter = useGameStore.getState();
    expect(stateAfter.gameState.phase).toBe('AWAIT_ACTION');
    expect(stateAfter.handCards.length).toBe(11);
    expect(stateAfter.gameState.stockPile.length).toBe(initialStockCount - 1);
  });

  it('sorts hand by rank, suit, and auto-melds', () => {
    useGameStore.getState().dealRound();

    const { sortHand } = useGameStore.getState();

    // Sort by rank
    sortHand('RANK');
    const rankSorted = useGameStore.getState().handCards;
    for (let i = 0; i < rankSorted.length - 1; i++) {
      expect(rankSorted[i].rank).toBeLessThanOrEqual(rankSorted[i + 1].rank);
    }

    // Sort by suit
    sortHand('SUIT');
    const suitSorted = useGameStore.getState().handCards;
    expect(suitSorted.length).toBe(rankSorted.length);

    // Sort by melds
    sortHand('MELDS');
    const meldSorted = useGameStore.getState().handCards;
    expect(meldSorted.length).toBe(rankSorted.length);
  });

  it('reorders hand array with reorderHand action and syncs players[0].hand', () => {
    useGameStore.getState().dealRound();
    const original = useGameStore.getState().handCards;
    const reversed = [...original].reverse();

    useGameStore.getState().reorderHand(reversed);
    expect(useGameStore.getState().handCards[0].id).toBe(reversed[0].id);
    expect(useGameStore.getState().gameState.players[0].hand[0].id).toBe(reversed[0].id);
  });

  it('reorders cards inside hand using moveCardInHand and syncs players[0].hand', () => {
    useGameStore.getState().dealRound();
    const original = useGameStore.getState().handCards;
    const cardToMove = original[0];

    // Move first card to last position
    useGameStore.getState().moveCardInHand(0, original.length - 1);

    const updated = useGameStore.getState().handCards;
    expect(updated[updated.length - 1].id).toBe(cardToMove.id);
    expect(useGameStore.getState().gameState.players[0].hand[updated.length - 1].id).toBe(cardToMove.id);
  });

  it('declares Gin with face-down slam, placing 11th card into finishSlotCard and resolving round', () => {
    useGameStore.getState().dealRound();

    // Setup an optimal Gin hand (10 cards in 4+3+3 melds + 1 extra discard card)
    const meld4: Card[] = [
      { id: 'S-07', suit: 'SPADES', rank: 7 },
      { id: 'H-07', suit: 'HEARTS', rank: 7 },
      { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
      { id: 'C-07', suit: 'CLUBS', rank: 7 },
    ];
    const meld3a: Card[] = [
      { id: 'H-09', suit: 'HEARTS', rank: 9 },
      { id: 'D-09', suit: 'DIAMONDS', rank: 9 },
      { id: 'C-09', suit: 'CLUBS', rank: 9 },
    ];
    const meld3b: Card[] = [
      { id: 'S-04', suit: 'SPADES', rank: 4 },
      { id: 'S-05', suit: 'SPADES', rank: 5 },
      { id: 'S-06', suit: 'SPADES', rank: 6 },
    ];
    const finishCard: Card = { id: 'C-02', suit: 'CLUBS', rank: 2 };

    const fullHand = [...meld4, ...meld3a, ...meld3b, finishCard];

    // Set Seat 0 (human) active hand
    useGameStore.setState(prev => ({
      gameState: {
        ...prev.gameState,
        activePlayerIndex: 0,
        phase: 'AWAIT_ACTION',
        players: prev.gameState.players.map((p, idx) =>
          idx === 0 ? { ...p, hand: fullHand, handCount: 11 } : p
        ),
      },
      handCards: fullHand,
    }));

    const declared = useGameStore.getState().declareGinWithSlam('C-02');
    expect(declared).toBe(true);

    const stateAfter = useGameStore.getState();
    expect(stateAfter.gameState.phase).toBe('ROUND_RESOLVING');
    expect(stateAfter.isSlammingFinish).toBe(true);
    expect(stateAfter.gameState.finishSlotCard).not.toBeNull();
    expect(stateAfter.gameState.finishSlotCard?.isFaceDown).toBe(true);
    expect(stateAfter.roundResolution).not.toBeNull();
  });

  it('manages 6-stage screen lifecycle with play type confirmation: LAUNCH -> MODE_SELECT -> PLAY_TYPE_SELECT -> RULES_CONFIRM -> TABLE -> LOBBY', () => {
    // 1. Initial screen state is set
    useGameStore.getState().setScreen('LAUNCH');
    expect(useGameStore.getState().currentScreen).toBe('LAUNCH');

    // 2. Select mode -> navigates to play type selection confirmation
    useGameStore.getState().selectModeAndReview('TEAM_4P');
    expect(useGameStore.getState().currentScreen).toBe('PLAY_TYPE_SELECT');
    expect(useGameStore.getState().pendingRules.mode).toBe('TEAM_4P');
    expect(useGameStore.getState().pendingRules.targetScore).toBe(1000);

    // 2.5 Select VS AI -> navigates to rules confirmation
    useGameStore.getState().selectPlayType('VS_AI');
    expect(useGameStore.getState().currentScreen).toBe('RULES_CONFIRM');
    expect(useGameStore.getState().pendingRules.playType).toBe('VS_AI');

    // 3. Update pending rules
    useGameStore.getState().updatePendingRules({ targetScore: 1500 });
    expect(useGameStore.getState().pendingRules.targetScore).toBe(1500);

    // 4. Confirm and start match -> enters TABLE
    useGameStore.getState().confirmAndStartMatch();
    const tableState = useGameStore.getState();
    expect(tableState.currentScreen).toBe('TABLE');
    expect(tableState.gameState.rules.mode).toBe('TEAM_4P');
    expect(tableState.gameState.rules.targetScore).toBe(1500);
    expect(tableState.gameState.players.length).toBe(4);

    // 5. Exit to lobby -> returns to MODE_SELECT
    useGameStore.getState().exitToLobby();
    expect(useGameStore.getState().currentScreen).toBe('MODE_SELECT');
  });

  it('executes autonomous bot turns: bot draws, evaluates, discards, and advances turn', () => {
    // Human is Seat 0, Bot is Seat 1
    useGameStore.getState().dealRound();
    // Human discards card to end Seat 0 turn
    const humanCard = useGameStore.getState().handCards[0].id;
    useGameStore.getState().discardCard(humanCard);

    // Turn is now on Bot (Seat 1) in AWAIT_DRAW
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(1);
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_DRAW');
    expect(useGameStore.getState().gameState.players[1].isAI).toBe(true);

    // Execute Bot Draw
    useGameStore.getState().executeBotDraw(1);
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_ACTION');
    expect(useGameStore.getState().gameState.players[1].hand.length).toBe(11);
    expect(useGameStore.getState().aiThoughtMessage).not.toBeNull();

    // Execute Bot Action (Discard)
    useGameStore.getState().executeBotAction(1);
    // Turn advances back to Seat 0 (Human)
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(0);
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_DRAW');
    expect(useGameStore.getState().gameState.players[1].hand.length).toBe(10);
    // Human handCards never switched to bot hand!
    expect(useGameStore.getState().handCards.length).toBe(10);
  });

  it('reshuffles discard pile into stock pile when stock is empty via initiateReshuffleFromDiscards', () => {
    useGameStore.getState().dealRound();
    const testDiscards: Card[] = [
      { id: 'H-02', suit: 'HEARTS', rank: 2, isFaceDown: false },
      { id: 'S-03', suit: 'SPADES', rank: 3, isFaceDown: false },
      { id: 'D-04', suit: 'DIAMONDS', rank: 4, isFaceDown: false },
    ];

    // Ensure player 0 has standard resting hand of 10 cards in AWAIT_DRAW
    const currentHand = useGameStore.getState().handCards.slice(0, 10);

    // Set stock to 0 and discardPile to testDiscards, in AWAIT_DRAW phase for Human
    useGameStore.setState(prev => ({
      gameState: {
        ...prev.gameState,
        phase: 'AWAIT_DRAW',
        activePlayerIndex: 0,
        stockPile: [],
        discardPile: testDiscards,
        players: prev.gameState.players.map((p, idx) =>
          idx === 0 ? { ...p, hand: currentHand, handCount: 10 } : p
        ),
      },
      handCards: currentHand,
    }));

    // Calling reshuffle during AWAIT_DRAW with 0 stock and >0 discards succeeds
    const success = useGameStore.getState().initiateReshuffleFromDiscards();
    expect(success).toBe(true);

    const stateAfter = useGameStore.getState();
    expect(stateAfter.gameState.stockPile.length).toBe(3);
    expect(stateAfter.gameState.discardPile.length).toBe(0);
    // All cards in stock are face-down
    expect(stateAfter.gameState.stockPile.every(c => c.isFaceDown)).toBe(true);
    // Phase is still AWAIT_DRAW so player can now draw
    expect(stateAfter.gameState.phase).toBe('AWAIT_DRAW');

    // Calling again returns false because stock is now non-empty
    const secondCall = useGameStore.getState().initiateReshuffleFromDiscards();
    expect(secondCall).toBe(false);

    // Now player can draw from the replenished stock
    useGameStore.getState().drawFromStock();
    const postDraw = useGameStore.getState();
    expect(postDraw.gameState.phase).toBe('AWAIT_ACTION');
    expect(postDraw.gameState.stockPile.length).toBe(2);
    expect(postDraw.handCards.length).toBe(11);
  });

  it('bot automatically reshuffles discard pile when stock is empty and discard is rejected during executeBotDraw', () => {
    useGameStore.getState().dealRound();
    // Top discard is an Ace (rank 1), which bot strictly rejects without existing Aces
    const testDiscards: Card[] = [
      { id: 'H-02', suit: 'HEARTS', rank: 2, isFaceDown: false },
      { id: 'S-01', suit: 'SPADES', rank: 1, isFaceDown: false },
    ];

    // Ensure bot hand has no aces and exact 10 cards
    const nonAceBotHand: Card[] = [
      { id: 'C-05', suit: 'CLUBS', rank: 5 },
      { id: 'C-06', suit: 'CLUBS', rank: 6 },
      { id: 'C-07', suit: 'CLUBS', rank: 7 },
      { id: 'D-08', suit: 'DIAMONDS', rank: 8 },
      { id: 'D-09', suit: 'DIAMONDS', rank: 9 },
      { id: 'D-10', suit: 'DIAMONDS', rank: 10 },
      { id: 'H-07', suit: 'HEARTS', rank: 7 },
      { id: 'H-08', suit: 'HEARTS', rank: 8 },
      { id: 'H-09', suit: 'HEARTS', rank: 9 },
      { id: 'S-10', suit: 'SPADES', rank: 10 },
    ];

    // Seat 1 (Bot) in AWAIT_DRAW with empty stock
    useGameStore.setState(prev => ({
      gameState: {
        ...prev.gameState,
        phase: 'AWAIT_DRAW',
        activePlayerIndex: 1,
        stockPile: [],
        discardPile: testDiscards,
        players: prev.gameState.players.map((p, idx) =>
          idx === 1 ? { ...p, hand: nonAceBotHand, handCount: 10 } : p
        ),
      },
    }));

    // Execute bot draw - should auto-reshuffle and draw from stock
    useGameStore.getState().executeBotDraw(1);

    const state = useGameStore.getState();
    expect(state.gameState.phase).toBe('AWAIT_ACTION');
    expect(state.gameState.players[1].hand.length).toBe(11);
    expect(state.gameState.stockPile.length).toBe(1); // 2 discards -> reshuffled to 2 stock -> bot drew 1 -> 1 left
  });
});

