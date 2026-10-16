import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RoundScoreModal } from '../../src/components/shared/RoundScoreModal';
import { useGameStore } from '../../src/store/useGameStore';
import { Card } from '../../src/core/models/types';

describe('RoundScoreModal render test', () => {
  it('renders without throwing when Human declares Gin in TEAM_4P', () => {
    const store = useGameStore.getState();
    store.initGame({ mode: 'TEAM_4P' });

    const humanGinHand10: Card[] = [
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
    ];
    const finishCard: Card = { id: 'C-02', suit: 'CLUBS', rank: 2 };
    const humanHand11 = [...humanGinHand10, finishCard];

    useGameStore.setState(state => ({
      handCards: humanHand11,
      gameState: {
        ...state.gameState,
        phase: 'AWAIT_ACTION',
        activePlayerIndex: 0,
        players: state.gameState.players.map((p, idx) => {
          if (idx === 0) return { ...p, hand: humanHand11, handCount: 11 };
          return p;
        }),
      },
    }));

    const declared = useGameStore.getState().declareGinWithSlam('C-02');
    expect(declared).toBe(true);

    const resolution = useGameStore.getState().roundResolution;
    expect(resolution).not.toBeNull();

    const html = renderToString(
      React.createElement(RoundScoreModal, {
        resolution: resolution!,
        onNextRound: () => {},
        onResetMatch: () => {},
      })
    );

    expect(html).toBeDefined();
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('Next Round');
    expect(html).toContain('Replay Tally');
  });

  it('renders correctly in SOLO_2P mode', () => {
    const store = useGameStore.getState();
    store.initGame({ mode: 'SOLO_2P' });

    const humanGinHand10: Card[] = [
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
    ];
    const finishCard: Card = { id: 'C-02', suit: 'CLUBS', rank: 2 };
    const humanHand11 = [...humanGinHand10, finishCard];

    useGameStore.setState(state => ({
      handCards: humanHand11,
      gameState: {
        ...state.gameState,
        phase: 'AWAIT_ACTION',
        activePlayerIndex: 0,
        players: state.gameState.players.map((p, idx) => {
          if (idx === 0) return { ...p, hand: humanHand11, handCount: 11 };
          return p;
        }),
      },
    }));

    const declared = useGameStore.getState().declareGinWithSlam('C-02');
    expect(declared).toBe(true);

    const resolution = useGameStore.getState().roundResolution;
    expect(resolution).not.toBeNull();

    const html = renderToString(
      React.createElement(RoundScoreModal, {
        resolution: resolution!,
        onNextRound: () => {},
        onResetMatch: () => {},
      })
    );

    expect(html).toBeDefined();
    expect(html).toContain('STANDINGS &amp; NET ROUND SCORE');
    expect(html).toContain('Next Round');
  });
});
