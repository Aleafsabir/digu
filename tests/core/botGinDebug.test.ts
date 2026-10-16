import { describe, it, expect } from 'vitest';
import { useGameStore } from '../../src/store/useGameStore';
import { DiguAI } from '../../src/core/ai/diguAI';
import { Card } from '../../src/core/models/types';
import { TeamHandOptimizer } from '../../src/core/engine/solver';
import { DeckService } from '../../src/core/deck/deck';

describe('Bot Gin & Round End Debug Investigation', () => {
  it('diagnoses what happens when Bot Partner gins in 4P Team Mode', () => {
    const store = useGameStore.getState();
    store.initGame({ mode: 'TEAM_4P' });

    // Setup Bot Partner (Seat 2, Team A) with a Gin hand of 11 cards
    const ginHand11: Card[] = [
      { id: 'S-07', suit: 'SPADES', rank: 7 },
      { id: 'H-07', suit: 'HEARTS', rank: 7 },
      { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
      { id: 'C-07', suit: 'CLUBS', rank: 7 },
      { id: 'H-08', suit: 'HEARTS', rank: 8 },
      { id: 'H-09', suit: 'HEARTS', rank: 9 },
      { id: 'H-10', suit: 'HEARTS', rank: 10 },
      { id: 'S-04', suit: 'SPADES', rank: 4 },
      { id: 'S-05', suit: 'SPADES', rank: 5 },
      { id: 'S-06', suit: 'SPADES', rank: 6 },
      { id: 'C-02', suit: 'CLUBS', rank: 2 }, // 11th finish card to slam
    ];

    // Give partner 10 cards
    const partnerHand: Card[] = [
      { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'D-04', suit: 'DIAMONDS', rank: 4 },
      { id: 'C-08', suit: 'CLUBS', rank: 8 },
      { id: 'C-09', suit: 'CLUBS', rank: 9 },
      { id: 'C-10', suit: 'CLUBS', rank: 10 },
      { id: 'H-02', suit: 'HEARTS', rank: 2 },
      { id: 'H-03', suit: 'HEARTS', rank: 3 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'S-11', suit: 'SPADES', rank: 11 },
    ];

    useGameStore.setState(state => ({
      gameState: {
        ...state.gameState,
        phase: 'AWAIT_ACTION',
        activePlayerIndex: 2, // Bot Partner (North)
        players: state.gameState.players.map((p, idx) => {
          if (idx === 2) return { ...p, hand: ginHand11, handCount: 11 };
          if (idx === 0) return { ...p, hand: partnerHand, handCount: 10 };
          return { ...p, hand: partnerHand, handCount: 10 };
        }),
      },
    }));

    console.log('Testing DiguAI decision on 11-card gin hand...');
    const decision = DiguAI.chooseBestAction(ginHand11);
    console.log('Bot Decision:', decision);
    expect(decision.action).toBe('GIN_SLAM');
    expect(decision.cardId).toBe('C-02');

    console.log('Executing executeBotAction(2)...');
    try {
      useGameStore.getState().executeBotAction(2);
      const postState = useGameStore.getState();
      console.log('Post Bot Action Phase:', postState.gameState.phase);
      console.log('Round Resolution:', postState.roundResolution ? 'EXISTS' : 'NULL');
      console.log('Action Error:', postState.actionError);
    } catch (err: any) {
      console.error('executeBotAction threw:', err);
    }
  });

  it('tests shouldDrawDiscard with random hands and Q spades', () => {
    const deck = DeckService.shuffle(DeckService.createStandardDeck());
    const topDiscard: Card = { id: 'S-12', suit: 'SPADES', rank: 12 };

    for (let test = 0; test < 50; test++) {
      const shuffled = DeckService.shuffle(deck);
      const hand = shuffled.slice(0, 10);
      const result = DiguAI.shouldDrawDiscard(hand, topDiscard);
      expect(typeof result).toBe('boolean');
    }
  });

  it('benchmarks optimizeMergedHand with 20 and 21 cards', () => {
    const deck = DeckService.shuffle(DeckService.createStandardDeck());
    const cards20 = deck.slice(0, 20);
    const cards21 = deck.slice(0, 21);

    const start20 = performance.now();
    const opt20 = TeamHandOptimizer.optimizeMergedHand(cards20);
    const time20 = performance.now() - start20;
    console.log(`20 cards optimization time: ${time20.toFixed(1)}ms, melds: ${opt20.melds.length}`);

    const start21 = performance.now();
    const opt21 = TeamHandOptimizer.optimizeMergedHand(cards21);
    const time21 = performance.now() - start21;
    console.log(`21 cards optimization time: ${time21.toFixed(1)}ms, melds: ${opt21.melds.length}`);
  });

  it('simulates a complete round from deal through multiple bot turns', () => {
    const store = useGameStore.getState();
    store.initGame({ mode: 'TEAM_4P' });

    // Step 1: deal round
    store.dealRound();
    const stateAfterDeal = useGameStore.getState().gameState;
    console.log('After deal:', {
      phase: stateAfterDeal.phase,
      activePlayerIndex: stateAfterDeal.activePlayerIndex,
      dealerIndex: stateAfterDeal.dealerIndex,
      discardCount: stateAfterDeal.discardPile.length,
      stockCount: stateAfterDeal.stockPile.length,
    });

    // Check hand counts of all players
    stateAfterDeal.players.forEach((p, idx) => {
      console.log(`Player ${idx} (${p.name}): handCount=${p.hand.length}`);
    });

    // Run 15 bot steps
    for (let step = 0; step < 15; step++) {
      const s = useGameStore.getState();
      const activeIdx = s.gameState.activePlayerIndex;
      const activeP = s.gameState.players[activeIdx];
      const ph = s.gameState.phase;

      if (!activeP.isAI || ph === 'MATCH_OVER' || ph === 'ROUND_RESOLVING') {
        console.log(`Stopping at step ${step}: activePlayerIndex=${activeIdx}, phase=${ph}`);
        break;
      }

      if (ph === 'AWAIT_DRAW') {
        console.log(`Step ${step}: Bot ${activeIdx} drawing...`);
        s.executeBotDraw(activeIdx);
        const postDraw = useGameStore.getState().gameState;
        console.log(`  -> New phase: ${postDraw.phase}, handCount: ${postDraw.players[activeIdx].hand.length}`);
      } else if (ph === 'AWAIT_ACTION') {
        console.log(`Step ${step}: Bot ${activeIdx} acting...`);
        s.executeBotAction(activeIdx);
        const postAction = useGameStore.getState().gameState;
        console.log(`  -> New phase: ${postAction.phase}, nextPlayer: ${postAction.activePlayerIndex}`);
      }
    }
  });
});
