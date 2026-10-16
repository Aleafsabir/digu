import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../src/store/useGameStore';

describe('AI Turn Automation and Seat 0 Human Lock', () => {
  beforeEach(() => {
    useGameStore.getState().initGame({ mode: 'TEAM_4P', dealOption: 'DRAW_FIRST_CARD', playType: 'VS_AI' });
  });

  it('correctly configures Seat 0 as human and all other seats as AI bots in 4P mode', () => {
    const { gameState } = useGameStore.getState();
    expect(gameState.players.length).toBe(4);
    expect(gameState.players[0].isAI).toBe(false); // Human
    expect(gameState.players[1].isAI).toBe(true);  // Bot Ali
    expect(gameState.players[2].isAI).toBe(true);  // Bot Partner
    expect(gameState.players[3].isAI).toBe(true);  // Bot Ahmed
  });

  it('cycles turns from bot to bot and back to human while keeping handCards strictly on Seat 0', () => {
    // Force dealer to Seat 1 so lead player is Seat 0 (human)
    useGameStore.setState(prev => ({
      gameState: { ...prev.gameState, dealerIndex: 1 },
    }));

    useGameStore.getState().dealRound();

    // Human (Seat 0) starts with 10 cards in AWAIT_DRAW
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(0);
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_DRAW');
    expect(useGameStore.getState().handCards.length).toBe(10);

    // Human draws 11th card from stock to enter AWAIT_ACTION
    useGameStore.getState().drawFromStock();
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_ACTION');
    expect(useGameStore.getState().handCards.length).toBe(11);

    const humanDiscardId = useGameStore.getState().handCards[0].id;
    useGameStore.getState().discardCard(humanDiscardId);

    // Human handCards is now 10
    expect(useGameStore.getState().handCards.length).toBe(10);
    expect(useGameStore.getState().gameState.players[0].hand.length).toBe(10);

    // Turn is now on Seat 1 (Bot Ali)
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(1);
    expect(useGameStore.getState().gameState.players[1].isAI).toBe(true);

    // Bot 1 draws
    useGameStore.getState().executeBotDraw(1);
    expect(useGameStore.getState().gameState.players[1].hand.length).toBe(11);
    // Crucial: Human handCards must still be Seat 0's 10 cards!
    expect(useGameStore.getState().handCards.length).toBe(10);

    // Bot 1 discards
    useGameStore.getState().executeBotAction(1);
    expect(useGameStore.getState().gameState.players[1].hand.length).toBe(10);

    // Turn is now on Seat 2 (Bot Partner)
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(2);
    expect(useGameStore.getState().gameState.players[2].isAI).toBe(true);

    // Bot 2 draws & discards
    useGameStore.getState().executeBotDraw(2);
    useGameStore.getState().executeBotAction(2);

    // Turn is now on Seat 3 (Bot Ahmed)
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(3);
    expect(useGameStore.getState().gameState.players[3].isAI).toBe(true);

    // Bot 3 draws & discards
    useGameStore.getState().executeBotDraw(3);
    useGameStore.getState().executeBotAction(3);

    // Turn is now back to Seat 0 (Human)!
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(0);
    expect(useGameStore.getState().gameState.phase).toBe('AWAIT_DRAW');
    // Human handCards is still Seat 0's 10 cards ready for their turn!
    expect(useGameStore.getState().handCards.length).toBe(10);
  });

  it('prevents human player from drawing or discarding out of turn when activePlayerIndex !== 0', () => {
    useGameStore.setState(prev => ({
      gameState: { ...prev.gameState, dealerIndex: 0 }, // Lead is Seat 3 (Bot)
    }));
    useGameStore.getState().dealRound();

    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(3);

    // Human tries to draw out of turn
    useGameStore.getState().drawFromStock();
    expect(useGameStore.getState().actionError).toBe('Please wait for your turn.');

    // Human tries to discard out of turn
    const firstCard = useGameStore.getState().handCards[0]?.id;
    if (firstCard) {
      useGameStore.getState().discardCard(firstCard);
      expect(useGameStore.getState().actionError).toBe('Please wait for your turn.');
    }
  });

  it('records live thought messages for bots during draw and discard actions', () => {
    useGameStore.setState(prev => ({
      gameState: { ...prev.gameState, dealerIndex: 0 }, // Lead is Seat 3
    }));
    useGameStore.getState().dealRound();

    // Bot 3 is in AWAIT_DRAW, draws 11th card then discards
    expect(useGameStore.getState().gameState.activePlayerIndex).toBe(3);
    useGameStore.getState().executeBotDraw(3);
    useGameStore.getState().executeBotAction(3);

    // Discard message recorded
    const thought = useGameStore.getState().aiThoughtMessage;
    expect(thought).not.toBeNull();
    expect(thought?.seatIndex).toBe(3);
    expect(thought?.message).toContain('Discarded');
  });
});
