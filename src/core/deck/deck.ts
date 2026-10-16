import { Card, Rank, Suit, TableRules, PlayerState } from '../models/types';

export const ALL_SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const ALL_RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const SUIT_PREFIX: Record<Suit, string> = {
  SPADES: 'S',
  HEARTS: 'H',
  DIAMONDS: 'D',
  CLUBS: 'C',
};

export class DeckService {
  /**
   * Generates a pristine 52-card standard deck with canonical IDs (e.g., "S-01", "D-13").
   * No jokers.
   */
  static createStandardDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        const rankStr = rank.toString().padStart(2, '0');
        deck.push({
          id: `${SUIT_PREFIX[suit]}-${rankStr}`,
          suit,
          rank,
          isFaceDown: true,
        });
      }
    }
    return deck;
  }

  /**
   * Pure Fisher-Yates shuffle algorithm.
   * Does not mutate original deck; returns a new shuffled array.
   */
  static shuffle<T>(array: T[], randomFn: () => number = Math.random): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * First Turn Lead Calculation:
   * The seat directly upstream of the dealer:
   * (dealerIndex - 1 + numPlayers) % numPlayers
   */
  static getLeadPlayerIndex(dealerIndex: number, numPlayers: number): number {
    return (dealerIndex - 1 + numPlayers) % numPlayers;
  }

  /**
   * Scatter Cut (High-Card Cut):
   * Each player draws a card from the scattered deck.
   * Highest rank designates the dealer. (Aces are rank 1 in cut, Kings are rank 13).
   * In case of tie, higher suit rank or tie-breaker can resolve.
   */
  static determineDealerFromScatter(scatterPicks: { playerId: string; card: Card }[]): {
    dealerPlayerId: string;
    winningCard: Card;
  } {
    if (scatterPicks.length === 0) throw new Error('No cards picked for scatter cut');

    // Rank 13 (King) is highest, 1 (Ace) is lowest for dealer cut
    let highest = scatterPicks[0];
    for (let i = 1; i < scatterPicks.length; i++) {
      const current = scatterPicks[i];
      if (current.card.rank > highest.card.rank) {
        highest = current;
      } else if (current.card.rank === highest.card.rank) {
        // Suit tie-breaker: Spades > Hearts > Diamonds > Clubs
        const suitOrder: Record<Suit, number> = { SPADES: 4, HEARTS: 3, DIAMONDS: 2, CLUBS: 1 };
        if (suitOrder[current.card.suit] > suitOrder[highest.card.suit]) {
          highest = current;
        }
      }
    }

    return {
      dealerPlayerId: highest.playerId,
      winningCard: highest.card,
    };
  }

  /**
   * Deals cards for a new round according to TableRules and Deal Mode.
   */
  static dealRound(
    players: PlayerState[],
    dealerIndex: number,
    rules: TableRules,
    shuffledDeck?: Card[]
  ): {
    updatedPlayers: PlayerState[];
    stockPile: Card[];
    discardPile: Card[];
    activePlayerIndex: number;
  } {
    const deck = shuffledDeck ? [...shuffledDeck] : this.shuffle(this.createStandardDeck());
    const numPlayers = players.length;
    const leadIndex = this.getLeadPlayerIndex(dealerIndex, numPlayers);

    // Initialize clean hands
    const hands: Card[][] = players.map(() => []);

    if (rules.dealOption === 'DEAL_11_CARDS') {
      // Lead player receives 11 cards, others receive 10 cards.
      // Discard pile starts empty.
      for (let c = 0; c < 10; c++) {
        for (let p = 0; p < numPlayers; p++) {
          const card = deck.pop();
          if (!card) throw new Error('Not enough cards in deck during deal');
          hands[p].push({ ...card, isFaceDown: false });
        }
      }
      // 11th card for lead
      const eleventhCard = deck.pop();
      if (!eleventhCard) throw new Error('Not enough cards for lead 11th card');
      hands[leadIndex].push({ ...eleventhCard, isFaceDown: false });

      const updatedPlayers = players.map((p, idx) => ({
        ...p,
        hand: hands[idx],
        handCount: hands[idx].length,
      }));

      return {
        updatedPlayers,
        stockPile: deck,
        discardPile: [],
        activePlayerIndex: leadIndex,
      };
    } else {
      // DRAW_FIRST_CARD:
      // All players receive 10 cards. Top card of stock flips face-up into discard pile.
      for (let c = 0; c < 10; c++) {
        for (let p = 0; p < numPlayers; p++) {
          const card = deck.pop();
          if (!card) throw new Error('Not enough cards in deck during deal');
          hands[p].push({ ...card, isFaceDown: false });
        }
      }

      // Flip top card of stock into discard pile
      const flipped = deck.pop();
      if (!flipped) throw new Error('Deck empty when flipping first discard card');

      const updatedPlayers = players.map((p, idx) => ({
        ...p,
        hand: hands[idx],
        handCount: hands[idx].length,
      }));

      return {
        updatedPlayers,
        stockPile: deck,
        discardPile: [{ ...flipped, isFaceDown: false }],
        activePlayerIndex: leadIndex,
      };
    }
  }

  /**
   * Initializes player templates based on game mode and play type (VS_AI vs ONLINE).
   */
  static createInitialPlayers(
    mode: TableRules['mode'],
    customNames?: string[],
    playType: TableRules['playType'] = 'VS_AI'
  ): PlayerState[] {
    const numPlayers = mode === 'SOLO_2P' ? 2 : 4;
    const defaultNames = mode === 'SOLO_2P'
      ? ['You (Player 1)', 'Digu Bot']
      : ['You (South)', 'Bot Ali (West)', 'Bot Partner (North)', 'Bot Ahmed (East)'];

    return Array.from({ length: numPlayers }, (_, idx) => {
      let teamId: 'TEAM_A' | 'TEAM_B' | null = null;
      if (mode === 'TEAM_4P') {
        // Team A (Seats 0 & 2: You & Partner) vs Team B (Seats 1 & 3: Opponents)
        teamId = idx % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
      }

      // In VS_AI mode: Seat 0 is the Human, all other seats are Bots
      const isAI = playType === 'VS_AI' ? idx !== 0 : false;

      return {
        id: `player-${idx + 1}`,
        name: customNames?.[idx] || defaultNames[idx],
        seatIndex: idx,
        teamId,
        hand: [],
        handCount: 0,
        cumulativeScore: 0,
        consecutiveGins: 0,
        scatterCard: null,
        isConnected: true,
        isAI,
      };
    });
  }
}
