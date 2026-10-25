import { create } from 'zustand';
import { Card, Suit } from '../core/models/types';
import {
  BondiGameState,
  BondiPlayer,
  BondiVariant,
  BondiValidator,
  BondiResolver,
  BondiAI,
} from '@game/core';
import {
  playCardFlickSound,
  playCardDiscardThud,
  playGinSlamImpactSound,
} from '../utils/audioEffects';

interface BondiStoreState {
  gameState: BondiGameState | null;
  selectedCardIds: string[];
  isResolvingTrick: boolean;
  statusMessage: string | null;

  startMatch: (variant?: BondiVariant, playerCount?: number) => void;
  selectCard: (cardId: string) => void;
  playSelectedCards: () => void;
  dumpSuit: (suit: Suit) => void;
  executeTurnPlay: (seatIndex: number, playedCards: Card[], isDump?: boolean) => void;
  runAITurnIfNeeded: () => void;
}

const BONDI_BOT_NAMES = ['Afeef', 'Ibrahim', 'Naeem', 'Moosa', 'Ziyad'];

function createInitialBondiState(
  variant: BondiVariant = 'STANDARD',
  playerCount: number = 4
): BondiGameState {
  const dealtHands = BondiResolver.dealCards(playerCount);
  const players: BondiPlayer[] = [];

  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `bondi-p-${i}`,
      name: i === 0 ? 'You' : BONDI_BOT_NAMES[i - 1],
      seatIndex: i,
      isAI: i !== 0,
      hand: dealtHands[i],
      hasExited: false,
    });
  }

  // Sort each player's hand by suit and rank for clean display
  players.forEach(p => {
    p.hand.sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return BondiValidator.getCardStrength(b) - BondiValidator.getCardStrength(a);
    });
  });

  // Hand 1 Opening Lead: player holding Ace of Spades
  const starterSeat = BondiResolver.findAceOfSpadesHolder(players);

  return {
    variant,
    playerCount,
    phase: 'TRICK_PLAY',
    players,
    activeSeat: starterSeat,
    currentTrick: {
      trickNumber: 1,
      leadSuit: null,
      cards: [],
      atRiskSeat: null,
      atRiskCard: null,
    },
    burnedCardsCount: 0,
    loserSeat: null,
    humanWon: null,
  };
}

export const useBondiStore = create<BondiStoreState>((set, get) => ({
  gameState: null,
  selectedCardIds: [],
  isResolvingTrick: false,
  statusMessage: null,

  startMatch: (variant = 'STANDARD', playerCount = 4) => {
    const initialState = createInitialBondiState(variant, playerCount);
    const starterName = initialState.players[initialState.activeSeat].name;
    set({
      gameState: initialState,
      selectedCardIds: [],
      isResolvingTrick: false,
      statusMessage: `${starterName} holds A♠ and leads Round 1.`,
    });

    if (initialState.players[initialState.activeSeat].isAI) {
      setTimeout(() => get().runAITurnIfNeeded(), 700);
    }
  },

  selectCard: (cardId: string) => {
    const { gameState, selectedCardIds } = get();
    if (!gameState || gameState.phase !== 'TRICK_PLAY' || gameState.activeSeat !== 0) return;

    if (selectedCardIds.includes(cardId)) {
      // Second click on the only selected card plays it immediately
      if (selectedCardIds.length === 1) {
        get().playSelectedCards();
      } else {
        set({ selectedCardIds: selectedCardIds.filter(id => id !== cardId) });
      }
    } else {
      set({ selectedCardIds: [cardId] });
    }
  },

  playSelectedCards: () => {
    const { gameState, selectedCardIds, isResolvingTrick } = get();
    if (!gameState || isResolvingTrick || gameState.phase !== 'TRICK_PLAY') return;
    if (gameState.activeSeat !== 0) return;

    const human = gameState.players[0];
    const cardsToPlay = human.hand.filter(c => selectedCardIds.includes(c.id));
    if (cardsToPlay.length === 0) return;

    // Validate play
    const leadSuit = gameState.currentTrick.leadSuit;
    const hasLed = leadSuit ? BondiValidator.hasSuit(human.hand, leadSuit) : false;

    if (leadSuit && hasLed) {
      // Must follow suit
      const invalid = cardsToPlay.find(c => c.suit !== leadSuit);
      if (invalid) {
        set({ statusMessage: `Must follow suit (${leadSuit})!` });
        setTimeout(() => set({ statusMessage: null }), 2000);
        return;
      }
    }

    playCardFlickSound();

    // Execute play
    get().executeTurnPlay(0, cardsToPlay, false);
  },

  dumpSuit: (suit: Suit) => {
    const { gameState, isResolvingTrick } = get();
    if (!gameState || isResolvingTrick || gameState.phase !== 'TRICK_PLAY') return;
    if (gameState.activeSeat !== 0) return;

    const human = gameState.players[0];
    const dumpCards = human.hand.filter(c => c.suit === suit);
    if (dumpCards.length === 0) return;

    playGinSlamImpactSound();
    get().executeTurnPlay(0, dumpCards, true);
  },

  executeTurnPlay: (seatIndex: number, playedCards: Card[], _isDump?: boolean) => {
    const { gameState } = get();
    if (!gameState) return;

    const player = gameState.players[seatIndex];
    const playedIds = new Set(playedCards.map(c => c.id));
    player.hand = player.hand.filter(c => !playedIds.has(c.id));

    const trick = { ...gameState.currentTrick };
    const leadSuit = trick.leadSuit || playedCards[0].suit;
    trick.leadSuit = leadSuit;

    // Add cards to trick
    playedCards.forEach(c => {
      trick.cards.push({ card: c, playedBySeat: seatIndex });
    });

    const isVoidOffSuit = playedCards[0].suit !== leadSuit;

    if (isVoidOffSuit) {
      // --- BONDI INFLICTED! ---
      const atRiskSeat = trick.atRiskSeat ?? seatIndex;
      const atRiskPlayer = gameState.players[atRiskSeat];
      trick.bondiInflictedBySeat = seatIndex;
      trick.bondiReceivedBySeat = atRiskSeat;

      playGinSlamImpactSound();

      set({
        selectedCardIds: [],
        isResolvingTrick: true,
        statusMessage: `BONDI! ${player.name} dumped on ${atRiskPlayer.name}! (+${trick.cards.length} cards)`,
        gameState: { ...gameState, currentTrick: trick },
      });

      setTimeout(() => {
        // At-risk player absorbs the entire trick pile into their hand
        const trickCardsList = trick.cards.map(tc => tc.card);
        atRiskPlayer.hand.push(...trickCardsList);
        atRiskPlayer.hand.sort((a, b) => {
          if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
          return BondiValidator.getCardStrength(b) - BondiValidator.getCardStrength(a);
        });

        // Check if the player who gave Bondi emptied their hand and cleared
        BondiResolver.checkPlayerExits(gameState.players);

        // Check match over
        if (BondiResolver.isMatchOver(gameState.players)) {
          const loser = BondiResolver.getLoserSeat(gameState.players);
          const humanWon = gameState.players[0].hasExited;
          set({
            isResolvingTrick: false,
            statusMessage: humanWon ? 'YOU WIN!' : 'You Lose!',
            gameState: {
              ...gameState,
              phase: 'MATCH_OVER',
              loserSeat: loser,
              humanWon,
            },
          });
          return;
        }

        // Next Lead rule (per user clarification #6):
        // "the one who leads is either the one who plays the highest card or the one who receives bondi"
        // Since Bondi occurred, atRiskPlayer (the one who received bondi) leads!
        // If atRiskPlayer somehow exited, get next active
        const nextLead = atRiskPlayer.hasExited
          ? BondiResolver.getNextActiveSeat(atRiskSeat, gameState.players)
          : atRiskSeat;

        set({
          isResolvingTrick: false,
          statusMessage: `New Round • ${gameState.players[nextLead].name} leads.`,
          gameState: {
            ...gameState,
            activeSeat: nextLead,
            currentTrick: {
              trickNumber: trick.trickNumber + 1,
              leadSuit: null,
              cards: [],
              atRiskSeat: null,
              atRiskCard: null,
            },
          },
        });

        if (gameState.players[nextLead].isAI) {
          setTimeout(() => get().runAITurnIfNeeded(), 750);
        }
      }, 1500);
      return;
    }

    // Following suit: update at-risk player
    BondiResolver.updateAtRisk(trick, playedCards[0], seatIndex);

    // Check if clean round completed
    // All active (non-exited) players have played in this trick
    const activePlayerCount = BondiResolver.getActivePlayerCount(gameState.players);
    const uniqueSeatsInTrick = new Set(trick.cards.map(tc => tc.playedBySeat));

    if (uniqueSeatsInTrick.size >= activePlayerCount) {
      // --- CLEAN ROUND COMPLETED ---
      trick.isCleanBurn = true;
      const winnerSeat = trick.atRiskSeat ?? seatIndex;
      const winnerPlayer = gameState.players[winnerSeat];

      set({
        selectedCardIds: [],
        isResolvingTrick: true,
        statusMessage: `Clean Round! ${winnerPlayer.name} burns the pile.`,
        gameState: { ...gameState, currentTrick: trick },
      });

      setTimeout(() => {
        playCardDiscardThud();

        // Check exits for all players who shed their last card
        BondiResolver.checkPlayerExits(gameState.players);

        // Check match over
        if (BondiResolver.isMatchOver(gameState.players)) {
          const loser = BondiResolver.getLoserSeat(gameState.players);
          const humanWon = gameState.players[0].hasExited;
          set({
            isResolvingTrick: false,
            statusMessage: humanWon ? 'YOU WIN!' : 'You Lose!',
            gameState: {
              ...gameState,
              phase: 'MATCH_OVER',
              loserSeat: loser,
              humanWon,
            },
          });
          return;
        }

        // Next Lead rule: player who played highest card of led suit leads!
        // If winnerPlayer has exited, next active seat leads
        const nextLead = winnerPlayer.hasExited
          ? BondiResolver.getNextActiveSeat(winnerSeat, gameState.players)
          : winnerSeat;

        set({
          isResolvingTrick: false,
          statusMessage: `Round ${trick.trickNumber + 1} • ${gameState.players[nextLead].name} leads.`,
          gameState: {
            ...gameState,
            activeSeat: nextLead,
            burnedCardsCount: gameState.burnedCardsCount + trick.cards.length,
            currentTrick: {
              trickNumber: trick.trickNumber + 1,
              leadSuit: null,
              cards: [],
              atRiskSeat: null,
              atRiskCard: null,
            },
          },
        });

        if (gameState.players[nextLead].isAI) {
          setTimeout(() => get().runAITurnIfNeeded(), 750);
        }
      }, 1300);
      return;
    }

    // Trick continues: advance to next active player
    const nextSeat = BondiResolver.getNextActiveSeat(seatIndex, gameState.players);
    set({
      selectedCardIds: [],
      gameState: {
        ...gameState,
        activeSeat: nextSeat,
        currentTrick: trick,
      },
    });

    if (gameState.players[nextSeat].isAI) {
      setTimeout(() => get().runAITurnIfNeeded(), 650);
    }
  },

  runAITurnIfNeeded: () => {
    const { gameState, isResolvingTrick } = get();
    if (!gameState || isResolvingTrick || gameState.phase !== 'TRICK_PLAY') return;
    const activePlayer = gameState.players[gameState.activeSeat];
    if (!activePlayer.isAI || activePlayer.hasExited) return;

    const playDecision = BondiAI.choosePlay(activePlayer, gameState);
    get().executeTurnPlay(activePlayer.seatIndex, playDecision.cards, playDecision.isSuitDump);
  },
}));
