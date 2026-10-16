import { describe, it, expect } from 'vitest';
import { DeckService } from '../../src/core/deck/deck';
import { TableRules } from '../../src/core/models/types';

describe('DeckService', () => {
  it('creates exactly 52 unique standard cards without jokers', () => {
    const deck = DeckService.createStandardDeck();
    expect(deck.length).toBe(52);

    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(52);

    // 13 of each suit
    const spades = deck.filter(c => c.suit === 'SPADES');
    const hearts = deck.filter(c => c.suit === 'HEARTS');
    const diamonds = deck.filter(c => c.suit === 'DIAMONDS');
    const clubs = deck.filter(c => c.suit === 'CLUBS');

    expect(spades.length).toBe(13);
    expect(hearts.length).toBe(13);
    expect(diamonds.length).toBe(13);
    expect(clubs.length).toBe(13);
  });

  it('shuffles the deck using Fisher-Yates and preserves 52 cards', () => {
    const deck = DeckService.createStandardDeck();
    const shuffled = DeckService.shuffle(deck);

    expect(shuffled.length).toBe(52);
    expect(new Set(shuffled.map(c => c.id)).size).toBe(52);
  });

  it('calculates the first turn lead seat directly upstream of dealer: (dealerIndex - 1 + numPlayers) % numPlayers', () => {
    // In 4-player game:
    // Dealer is 0 -> Lead is (0 - 1 + 4) % 4 = 3
    expect(DeckService.getLeadPlayerIndex(0, 4)).toBe(3);
    // Dealer is 1 -> Lead is 0
    expect(DeckService.getLeadPlayerIndex(1, 4)).toBe(0);
    // Dealer is 2 -> Lead is 1
    expect(DeckService.getLeadPlayerIndex(2, 4)).toBe(1);
    // Dealer is 3 -> Lead is 2
    expect(DeckService.getLeadPlayerIndex(3, 4)).toBe(2);

    // In 2-player game:
    // Dealer is 0 -> Lead is 1
    expect(DeckService.getLeadPlayerIndex(0, 2)).toBe(1);
    // Dealer is 1 -> Lead is 0
    expect(DeckService.getLeadPlayerIndex(1, 2)).toBe(0);
  });

  it('deals round in DEAL_11_CARDS mode: lead receives 11 cards, others 10, discard empty', () => {
    const rules: TableRules = {
      mode: 'SOLO_4P',
      dealOption: 'DEAL_11_CARDS',
      targetScore: 500,
      turnTimeoutSeconds: 30,
    };
    const players = DeckService.createInitialPlayers('SOLO_4P');
    const dealerIndex = 1; // Lead should be seat 0

    const result = DeckService.dealRound(players, dealerIndex, rules);

    expect(result.activePlayerIndex).toBe(0);
    // Lead player has 11 cards
    expect(result.updatedPlayers[0].hand.length).toBe(11);
    // Other players have 10 cards
    expect(result.updatedPlayers[1].hand.length).toBe(10);
    expect(result.updatedPlayers[2].hand.length).toBe(10);
    expect(result.updatedPlayers[3].hand.length).toBe(10);

    // Discard pile starts empty
    expect(result.discardPile.length).toBe(0);
    // Stock pile: 52 - 11 - 30 = 11 cards
    expect(result.stockPile.length).toBe(11);
  });

  it('deals round in DRAW_FIRST_CARD mode: all receive 10 cards, top card flipped to discard', () => {
    const rules: TableRules = {
      mode: 'SOLO_4P',
      dealOption: 'DRAW_FIRST_CARD',
      targetScore: 500,
      turnTimeoutSeconds: 30,
    };
    const players = DeckService.createInitialPlayers('SOLO_4P');
    const dealerIndex = 2; // Lead should be seat 1

    const result = DeckService.dealRound(players, dealerIndex, rules);

    expect(result.activePlayerIndex).toBe(1);
    // All players have 10 cards
    result.updatedPlayers.forEach(p => {
      expect(p.hand.length).toBe(10);
    });

    // Discard pile has 1 card
    expect(result.discardPile.length).toBe(1);
    expect(result.discardPile[0].isFaceDown).toBe(false);
    // Stock pile: 52 - 40 - 1 = 11 cards
    expect(result.stockPile.length).toBe(11);
  });

  it('creates team players with correct Team A / Team B assignment in 4P Team mode', () => {
    const players = DeckService.createInitialPlayers('TEAM_4P');
    expect(players.length).toBe(4);
    // Seats 0 & 2 are Team A, Seats 1 & 3 are Team B
    expect(players[0].teamId).toBe('TEAM_A');
    expect(players[1].teamId).toBe('TEAM_B');
    expect(players[2].teamId).toBe('TEAM_A');
    expect(players[3].teamId).toBe('TEAM_B');
  });
});
