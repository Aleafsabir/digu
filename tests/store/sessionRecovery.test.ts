import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  safeSaveSession,
  safeLoadSession,
  safeClearSession,
  SavedMatchSession,
} from '../../src/store/useGameStore';

// Mock localStorage for Node.js test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};
globalThis.localStorage = localStorageMock as any;

describe('Mobile Session Recovery, Wake Lock & Away-Turn Forfeit System', () => {
  beforeEach(() => {
    storageMap.clear();
    useGameStore.getState().initGame({ mode: 'SOLO_2P' });
    useGameStore.setState(prev => ({
      currentScreen: 'TABLE',
      gameState: { ...prev.gameState, dealerIndex: 1, activePlayerIndex: 0 },
      consecutiveMissedTurns: 0,
      turnStartedAt: null,
      isForfeitedDueToInactivity: false,
      awayToastMessage: null,
    }));
  });

  it('safely saves, loads, and clears active match sessions in storage', () => {
    useGameStore.getState().dealRound();
    const state = useGameStore.getState();

    const session: SavedMatchSession = {
      gameState: state.gameState,
      handCards: state.handCards,
      pendingRules: state.pendingRules,
      roundHistory: state.roundHistory,
      tablePot: 4000,
      tableBuyIn: 1000,
      consecutiveMissedTurns: 0,
      turnStartedAt: Date.now(),
      savedAt: Date.now(),
    };

    safeSaveSession(session);
    const loaded = safeLoadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.handCards.length).toBe(state.handCards.length);
    expect(loaded?.gameState.phase).toBe(state.gameState.phase);

    safeClearSession();
    expect(safeLoadSession()).toBeNull();
  });

  it('restores active match session and jumps directly to TABLE screen', () => {
    useGameStore.getState().dealRound();
    const originalHand = useGameStore.getState().handCards;

    // Simulate page reload: store resets to initial state with LAUNCH screen
    useGameStore.setState({
      currentScreen: 'LAUNCH',
      handCards: [],
    });
    expect(useGameStore.getState().currentScreen).toBe('LAUNCH');
    expect(useGameStore.getState().handCards.length).toBe(0);

    // Call restoreActiveMatchSession
    const restored = useGameStore.getState().restoreActiveMatchSession();
    expect(restored).toBe(true);

    const afterState = useGameStore.getState();
    expect(afterState.currentScreen).toBe('TABLE');
    expect(afterState.handCards.length).toBe(originalHand.length);
    expect(afterState.isForfeitedDueToInactivity).toBe(false);
  });

  it('auto-plays away turn 1: draws and discards highest deadwood card, sets toast (1/2), advances turn', () => {
    useGameStore.getState().dealRound();
    useGameStore.getState().drawFromStock();
    // Human is Seat 0 with 11 cards in AWAIT_ACTION
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(0);
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_ACTION');
    expect(useGameStore.getState().handCards.length).toBe(11);

    // Human misses turn 1
    useGameStore.getState().autoPlayAwayTurn();

    const state = useGameStore.getState();
    // Hand reduced to 10 resting cards
    expect(state.handCards.length).toBe(10);
    // Turn advanced to next player (Bot Seat 1) in AWAIT_DRAW
    expect(state.gameState.activePlayerIndex).toBe(1);
    expect(state.gameState.phase).toBe('AWAIT_DRAW');
    // Missed turns incremented to 1
    expect(state.consecutiveMissedTurns).toBe(1);
    expect(state.awayToastMessage).toBe('Auto-played away turn (1/2)');
    expect(state.isForfeitedDueToInactivity).toBe(false);
  });

  it('auto-plays away turn 2: sets warning toast (2/2), advances turn', () => {
    useGameStore.getState().dealRound();
    useGameStore.getState().drawFromStock();

    // Turn 1 missed
    useGameStore.getState().autoPlayAwayTurn();
    expect(useGameStore.getState().consecutiveMissedTurns).toBe(1);

    // Simulate turn coming back to Seat 0
    useGameStore.setState(prev => ({
      gameState: {
        ...prev.gameState,
        activePlayerIndex: 0,
        phase: 'AWAIT_DRAW',
      },
    }));

    // Turn 2 missed
    useGameStore.getState().autoPlayAwayTurn();

    const state = useGameStore.getState();
    expect(state.consecutiveMissedTurns).toBe(2);
    expect(state.awayToastMessage).toBe('Auto-played away turn (2/2) — Next missed turn will forfeit match');
    expect(state.isForfeitedDueToInactivity).toBe(false);
  });

  it('auto-forfeits match on 3rd missed turn (exceeding 2 allowed away turns)', () => {
    useGameStore.getState().dealRound();

    // Set consecutiveMissedTurns to 2 already
    useGameStore.setState({
      consecutiveMissedTurns: 2,
      gameState: {
        ...useGameStore.getState().gameState,
        activePlayerIndex: 0,
        phase: 'AWAIT_ACTION',
      },
    });

    // 3rd missed turn occurs
    useGameStore.getState().autoPlayAwayTurn();

    const state = useGameStore.getState();
    expect(state.isForfeitedDueToInactivity).toBe(true);
    expect(state.consecutiveMissedTurns).toBe(3);
    // Persisted session cleared on forfeit
    expect(safeLoadSession()).toBeNull();
  });

  it('resets consecutiveMissedTurns to 0 upon manual human player actions', () => {
    useGameStore.getState().dealRound();
    useGameStore.setState({ consecutiveMissedTurns: 2 });
    expect(useGameStore.getState().consecutiveMissedTurns).toBe(2);

    // Player selects a card manually
    const cardId = useGameStore.getState().handCards[0].id;
    useGameStore.getState().selectCard(cardId);
    expect(useGameStore.getState().consecutiveMissedTurns).toBe(0);

    // Set to 1 and test sortHand resets it
    useGameStore.setState({ consecutiveMissedTurns: 1 });
    useGameStore.getState().sortHand('RANK');
    expect(useGameStore.getState().consecutiveMissedTurns).toBe(0);
  });

  it('clears active match session and resets inactivity when player exits to lobby', () => {
    useGameStore.getState().dealRound();
    useGameStore.setState({
      consecutiveMissedTurns: 2,
      awayToastMessage: 'Warning',
    });

    useGameStore.getState().exitToLobby();

    const state = useGameStore.getState();
    expect(state.currentScreen).toBe('MODE_SELECT');
    expect(state.consecutiveMissedTurns).toBe(0);
    expect(state.awayToastMessage).toBeNull();
    expect(state.isForfeitedDueToInactivity).toBe(false);
    expect(safeLoadSession()).toBeNull();
  });
});
