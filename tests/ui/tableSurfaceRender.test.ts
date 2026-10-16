import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TableSurface } from '../../src/components/table/TableSurface';
import { useGameStore } from '../../src/store/useGameStore';
import { Card } from '../../src/core/models/types';

describe('TableSurface full render test', () => {
  it('renders TableSurface on Gin in TEAM_4P', () => {
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

    // Render before Gin
    const htmlBefore = renderToString(React.createElement(TableSurface));
    expect(htmlBefore).toBeDefined();

    // Declare Gin
    const ok = useGameStore.getState().declareGinWithSlam('C-02');
    expect(ok).toBe(true);

    // Render after Gin
    const htmlAfter = renderToString(React.createElement(TableSurface));
    expect(htmlAfter).toBeDefined();
    console.log('TableSurface rendered successfully on Gin! HTML length:', htmlAfter.length);
  });
});
