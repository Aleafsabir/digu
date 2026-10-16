import { describe, it, expect } from 'vitest';
import { RoundResolver } from '../../src/core/engine/resolver';
import { Card, GameState, TableRules } from '../../src/core/models/types';
import { DeckService } from '../../src/core/deck/deck';

describe('RoundResolver', () => {
  const defaultRules: TableRules = {
    mode: 'SOLO_2P',
    dealOption: 'DEAL_11_CARDS',
    targetScore: 500,
    turnTimeoutSeconds: 30,
  };

  it('awards +100 Gin Bonus to winner and deducts deadwood debt from loser in Solo mode', () => {
    const players = DeckService.createInitialPlayers('SOLO_2P');

    // Player 1 completes Gin:
    // Meld 1: 4 Kings (40 pts)
    // Meld 2: 7-8-9 Diamonds (24 pts)
    // Meld 3: 4-5-6 Spades (15 pts)
    // Total Meld Score = 79
    // Plus 100 Gin Bonus = 179 Net Score
    const p1Melds: Card[][] = [
      [
        { id: 'S-13', suit: 'SPADES', rank: 13 },
        { id: 'H-13', suit: 'HEARTS', rank: 13 },
        { id: 'D-13', suit: 'DIAMONDS', rank: 13 },
        { id: 'C-13', suit: 'CLUBS', rank: 13 },
      ],
      [
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'D-08', suit: 'DIAMONDS', rank: 8 },
        { id: 'D-09', suit: 'DIAMONDS', rank: 9 },
      ],
      [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
      ],
    ];

    // Player 2 has 1 meld (3 Sevens = 21 pts) and 7 deadwood cards:
    // Ace(15) + 2C(2) + 4D(4) + 6H(6) + 8C(8) + 11D(10) + 13S(10) = 55 debt
    // Net score for Player 2 = 21 - 55 = -34
    const p2Hand: Card[] = [
      { id: 'S-07', suit: 'SPADES', rank: 7 },
      { id: 'H-07', suit: 'HEARTS', rank: 7 },
      { id: 'C-07', suit: 'CLUBS', rank: 7 },
      { id: 'H-01', suit: 'HEARTS', rank: 1 }, // Ace = 15 debt
      { id: 'C-02', suit: 'CLUBS', rank: 2 },
      { id: 'D-04', suit: 'DIAMONDS', rank: 4 },
      { id: 'H-06', suit: 'HEARTS', rank: 6 },
      { id: 'C-08', suit: 'CLUBS', rank: 8 },
      { id: 'D-11', suit: 'DIAMONDS', rank: 11 },
      { id: 'S-13', suit: 'SPADES', rank: 13 },
    ];

    players[0].hand = p1Melds.flat();
    players[1].hand = p2Hand;

    const gameState: GameState = {
      roomId: 'room-1',
      rules: defaultRules,
      phase: 'AWAIT_ACTION',
      players,
      dealerIndex: 1,
      activePlayerIndex: 0,
      stockPile: [],
      discardPile: [],
      finishSlotCard: { id: 'C-02', suit: 'CLUBS', rank: 2, isFaceDown: true },
      lastRoundWinnerId: null,
    };

    const resolution = RoundResolver.resolveRound(
      gameState,
      'player-1',
      p1Melds,
      gameState.finishSlotCard
    );

    expect(resolution.winnerPlayerId).toBe('player-1');
    const p1Score = resolution.playerScores.find(p => p.playerId === 'player-1')!;
    const p2Score = resolution.playerScores.find(p => p.playerId === 'player-2')!;

    expect(p1Score.isWinner).toBe(true);
    expect(p1Score.hasGin).toBe(true);
    expect(p1Score.ginBonus).toBe(100);
    expect(p1Score.meldScore).toBe(79);
    expect(p1Score.netRoundScore).toBe(179);

    expect(p2Score.isWinner).toBe(false);
    expect(p2Score.meldScore).toBe(21);
    expect(p2Score.deadwoodDebt).toBe(-55);
    expect(p2Score.netRoundScore).toBe(-34);
  });

  it('awards 1,000 flat points for a 1,000-Point Run', () => {
    const players = DeckService.createInitialPlayers('SOLO_2P');

    // 10-card suited sequence A-10 in Spades
    const thousandRun: Card[] = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ].map(r => ({ id: `S-${r.toString().padStart(2, '0')}`, suit: 'SPADES', rank: r as any }));

    players[0].hand = thousandRun;
    players[1].hand = [
      { id: 'H-02', suit: 'HEARTS', rank: 2 },
      { id: 'H-03', suit: 'HEARTS', rank: 3 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'D-04', suit: 'DIAMONDS', rank: 4 },
      { id: 'C-02', suit: 'CLUBS', rank: 2 },
      { id: 'C-03', suit: 'CLUBS', rank: 3 },
      { id: 'C-04', suit: 'CLUBS', rank: 4 },
      { id: 'S-11', suit: 'SPADES', rank: 11 },
    ];

    const gameState: GameState = {
      roomId: 'room-1',
      rules: defaultRules,
      phase: 'AWAIT_ACTION',
      players,
      dealerIndex: 1,
      activePlayerIndex: 0,
      stockPile: [],
      discardPile: [],
      finishSlotCard: { id: 'S-12', suit: 'SPADES', rank: 12 },
      lastRoundWinnerId: null,
    };

    const resolution = RoundResolver.resolveRound(
      gameState,
      'player-1',
      [thousandRun],
      gameState.finishSlotCard
    );

    expect(resolution.isThousandPointRun).toBe(true);
    const p1Score = resolution.playerScores.find(p => p.playerId === 'player-1')!;
    expect(p1Score.specialBonus).toBe(1000);
    expect(p1Score.netRoundScore).toBe(1000);
  });

  it('applies Zero-Meld Penalty (-100 Points) if loser forms 0 valid melds', () => {
    const players = DeckService.createInitialPlayers('SOLO_2P');

    const p1Melds: Card[][] = [
      [
        { id: 'S-13', suit: 'SPADES', rank: 13 },
        { id: 'H-13', suit: 'HEARTS', rank: 13 },
        { id: 'D-13', suit: 'DIAMONDS', rank: 13 },
        { id: 'C-13', suit: 'CLUBS', rank: 13 },
      ],
      [
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'D-08', suit: 'DIAMONDS', rank: 8 },
        { id: 'D-09', suit: 'DIAMONDS', rank: 9 },
      ],
      [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
      ],
    ];

    // Player 2 has 0 melds
    const p2HandNoMelds: Card[] = [
      { id: 'S-02', suit: 'SPADES', rank: 2 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'D-06', suit: 'DIAMONDS', rank: 6 },
      { id: 'C-08', suit: 'CLUBS', rank: 8 },
      { id: 'S-10', suit: 'SPADES', rank: 10 },
      { id: 'H-12', suit: 'HEARTS', rank: 12 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'C-05', suit: 'CLUBS', rank: 5 },
      { id: 'S-07', suit: 'SPADES', rank: 7 },
      { id: 'H-09', suit: 'HEARTS', rank: 9 },
    ];

    players[0].hand = p1Melds.flat();
    players[1].hand = p2HandNoMelds;

    const gameState: GameState = {
      roomId: 'room-1',
      rules: defaultRules,
      phase: 'AWAIT_ACTION',
      players,
      dealerIndex: 1,
      activePlayerIndex: 0,
      stockPile: [],
      discardPile: [],
      finishSlotCard: { id: 'C-02', suit: 'CLUBS', rank: 2 },
      lastRoundWinnerId: null,
    };

    const resolution = RoundResolver.resolveRound(
      gameState,
      'player-1',
      p1Melds,
      gameState.finishSlotCard
    );

    const p2Score = resolution.playerScores.find(p => p.playerId === 'player-2')!;
    expect(p2Score.hasZeroMelds).toBe(true);
    expect(p2Score.zeroMeldPenalty).toBe(-100);
    expect(p2Score.netRoundScore).toBe(-100);
  });

  it('applies 3-Consecutive-Gin Penalty (-100 Points) to upstream feeder seat', () => {
    // 4-Player Cutthroat mode
    const rules: TableRules = {
      mode: 'SOLO_4P',
      dealOption: 'DEAL_11_CARDS',
      targetScore: 500,
      turnTimeoutSeconds: 30,
    };
    const players = DeckService.createInitialPlayers('SOLO_4P');

    // Player 1 (seat 0) has won 2 consecutive Gins already
    players[0].consecutiveGins = 2;

    const p1Melds: Card[][] = [
      [
        { id: 'S-13', suit: 'SPADES', rank: 13 },
        { id: 'H-13', suit: 'HEARTS', rank: 13 },
        { id: 'D-13', suit: 'DIAMONDS', rank: 13 },
        { id: 'C-13', suit: 'CLUBS', rank: 13 },
      ],
      [
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'D-08', suit: 'DIAMONDS', rank: 8 },
        { id: 'D-09', suit: 'DIAMONDS', rank: 9 },
      ],
      [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
      ],
    ];

    // Give players 2, 3, 4 standard valid hands
    players[0].hand = p1Melds.flat();
    players[1].hand = [
      { id: 'S-02', suit: 'SPADES', rank: 2 },
      { id: 'S-03', suit: 'SPADES', rank: 3 },
      { id: 'S-04b', suit: 'SPADES', rank: 4 },
      { id: 'H-02', suit: 'HEARTS', rank: 2 },
      { id: 'H-03', suit: 'HEARTS', rank: 3 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'D-04', suit: 'DIAMONDS', rank: 4 },
      { id: 'C-02', suit: 'CLUBS', rank: 2 },
    ];
    players[2].hand = [...players[1].hand];
    players[3].hand = [...players[1].hand]; // Seat 3 is the feeder for Seat 0: (0 - 1 + 4) % 4 = 3

    const gameState: GameState = {
      roomId: 'room-1',
      rules,
      phase: 'AWAIT_ACTION',
      players,
      dealerIndex: 1,
      activePlayerIndex: 0,
      stockPile: [],
      discardPile: [],
      finishSlotCard: { id: 'C-03', suit: 'CLUBS', rank: 3 },
      lastRoundWinnerId: 'player-1',
    };

    const resolution = RoundResolver.resolveRound(
      gameState,
      'player-1',
      p1Melds,
      gameState.finishSlotCard
    );

    // Feeder seat is Player 4 (seatIndex 3)
    const feederScore = resolution.playerScores.find(p => p.seatIndex === 3)!;
    expect(feederScore.consecutiveGinPenalty).toBe(-100);
    expect(feederScore.netRoundScore).toBe(-100);
  });

  it('resolves 4-Player Team Mode (2v2) with 20-card hand merge and +100 Gin bonus', () => {
    const rules: TableRules = {
      mode: 'TEAM_4P',
      dealOption: 'DEAL_11_CARDS',
      targetScore: 1000,
      turnTimeoutSeconds: 30,
    };
    const players = DeckService.createInitialPlayers('TEAM_4P');

    // Winning Team A (Player 1 and Player 3):
    // Player 1 has a full 4+3+3 Gin (7-7-7-7, 8-9-10H, 4-5-6S = 82 pts)
    const p1Melds: Card[][] = [
      [
        { id: 'S-07', suit: 'SPADES', rank: 7 },
        { id: 'H-07', suit: 'HEARTS', rank: 7 },
        { id: 'D-07', suit: 'DIAMONDS', rank: 7 },
        { id: 'C-07', suit: 'CLUBS', rank: 7 },
      ],
      [
        { id: 'H-08', suit: 'HEARTS', rank: 8 },
        { id: 'H-09', suit: 'HEARTS', rank: 9 },
        { id: 'H-10', suit: 'HEARTS', rank: 10 },
      ],
      [
        { id: 'S-04', suit: 'SPADES', rank: 4 },
        { id: 'S-05', suit: 'SPADES', rank: 5 },
        { id: 'S-06', suit: 'SPADES', rank: 6 },
      ],
    ];

    // Player 3 (teammate in Team A) has 3 Aces (45 pts) and 7 deadwood cards (debt = 25)
    const p3Hand: Card[] = [
      { id: 'S-01', suit: 'SPADES', rank: 1 },
      { id: 'H-01', suit: 'HEARTS', rank: 1 },
      { id: 'D-01', suit: 'DIAMONDS', rank: 1 },
      { id: 'C-02', suit: 'CLUBS', rank: 2 },
      { id: 'D-03', suit: 'DIAMONDS', rank: 3 },
      { id: 'H-04', suit: 'HEARTS', rank: 4 },
      { id: 'S-02', suit: 'SPADES', rank: 2 },
      { id: 'S-03', suit: 'SPADES', rank: 3 },
      { id: 'D-05', suit: 'DIAMONDS', rank: 5 },
      { id: 'C-06', suit: 'CLUBS', rank: 6 },
    ];

    players[0].hand = p1Melds.flat();
    players[2].hand = p3Hand;

    // Losing Team B (Players 2 & 4) have minimal melds
    const p2Cards: Card[] = [
      { id: 'S-09', suit: 'SPADES', rank: 9 },
      { id: 'H-12', suit: 'HEARTS', rank: 12 },
      { id: 'D-02', suit: 'DIAMONDS', rank: 2 },
      { id: 'C-08', suit: 'CLUBS', rank: 8 },
      { id: 'C-09', suit: 'CLUBS', rank: 9 },
      { id: 'C-10', suit: 'CLUBS', rank: 10 }, // 8-9-10 Clubs = 27 pts
      { id: 'S-11', suit: 'SPADES', rank: 11 },
      { id: 'D-12', suit: 'DIAMONDS', rank: 12 },
      { id: 'H-02', suit: 'HEARTS', rank: 2 },
      { id: 'D-08', suit: 'DIAMONDS', rank: 8 },
    ];
    players[1].hand = [...p2Cards];
    players[3].hand = [...p2Cards.map(c => ({ ...c, id: `${c.id}-b` }))];

    const gameState: GameState = {
      roomId: 'room-1',
      rules,
      phase: 'AWAIT_ACTION',
      players,
      dealerIndex: 1,
      activePlayerIndex: 0,
      stockPile: [],
      discardPile: [],
      finishSlotCard: { id: 'C-03', suit: 'CLUBS', rank: 3 },
      lastRoundWinnerId: null,
    };

    const resolution = RoundResolver.resolveRound(
      gameState,
      'player-1',
      p1Melds,
      gameState.finishSlotCard
    );

    expect(resolution.winningTeamId).toBe('TEAM_A');
    expect(resolution.teamScores).toBeDefined();
    expect(resolution.teamScores!.length).toBe(2);

    const teamAScore = resolution.teamScores!.find(t => t.teamId === 'TEAM_A')!;
    const teamBScore = resolution.teamScores!.find(t => t.teamId === 'TEAM_B')!;

    expect(teamAScore.isWinner).toBe(true);
    expect(teamAScore.ginBonus).toBe(100);
    expect(teamAScore.netRoundScore).toBeGreaterThan(100);

    expect(teamBScore.isWinner).toBe(false);
  });
});
