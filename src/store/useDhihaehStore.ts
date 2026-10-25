import { create } from 'zustand';
import {
  DhihaehGameState,
  DhihaehPlayer,
  DhihaehTrick,
  DhihaehVariant,
  DhihaehValidator,
  DhihaehResolver,
  DhihaehAI,
  DeckService,
} from '@game/core';
import { playCardFlickSound, playCardDiscardThud, playGinReadyChime } from '../utils/audioEffects';

interface DhihaehStoreState {
  gameState: DhihaehGameState | null;
  selectedCardId: string | null;
  isResolvingTrick: boolean;
  statusMessage: string | null;

  startMatch: (variant?: DhihaehVariant, targetScore?: number) => void;
  selectCard: (cardId: string) => void;
  playCard: (cardId: string) => void;
  nextHand: () => void;
  runAITurnIfNeeded: () => void;
}

const PLAYER_NAMES = ['You', 'Hussain (East)', 'Ali (Partner)', 'Ahmed (West)'];

function createInitialDhihaehState(
  variant: DhihaehVariant = 'DYNAMIC_CUT',
  targetScore: number = 7,
  dealerSeat: number = 3
): DhihaehGameState {
  const deck = DeckService.shuffle(DeckService.createStandardDeck());
  const players: DhihaehPlayer[] = [];

  // 4 players: Seats 0 (South), 1 (East), 2 (North), 3 (West)
  // Team 1: 0 & 2. Team 2: 1 & 3
  for (let i = 0; i < 4; i++) {
    players.push({
      id: `p-${i}`,
      name: PLAYER_NAMES[i],
      seatIndex: i,
      teamId: i % 2 === 0 ? 'TEAM_1' : 'TEAM_2',
      isAI: i !== 0,
      hand: [],
      capturedTens: [],
      tricksWon: 0,
      blindReserveCard: null,
    });
  }

  // Pass 1: 5 cards to each (anti-clockwise starting with player to dealer's right)
  let cardIndex = 0;
  for (let p = 0; p < 4; p++) {
    const seat = (dealerSeat + 1 + p) % 4;
    const cards = deck.slice(cardIndex, cardIndex + 5).map(c => ({ ...c, isFaceDown: false }));
    cardIndex += 5;

    if (variant === 'BLIND_RESERVE' && seat === (dealerSeat + 1) % 4) {
      // First player isolates 1 card into blind reserve
      players[seat].blindReserveCard = { ...cards[0], isFaceDown: true };
      players[seat].hand = cards.slice(1);
    } else {
      players[seat].hand = cards;
    }
  }

  // Pass 2: 4 cards each
  for (let p = 0; p < 4; p++) {
    const seat = (dealerSeat + 1 + p) % 4;
    const cards = deck.slice(cardIndex, cardIndex + 4).map(c => ({ ...c, isFaceDown: false }));
    cardIndex += 4;
    players[seat].hand.push(...cards);
  }

  // Pass 3: 4 cards each (all 13 distributed)
  for (let p = 0; p < 4; p++) {
    const seat = (dealerSeat + 1 + p) % 4;
    const cards = deck.slice(cardIndex, cardIndex + 4).map(c => ({ ...c, isFaceDown: false }));
    cardIndex += 4;
    players[seat].hand.push(...cards);
  }

  // Sort each player's hand by suit and rank for clean display
  players.forEach(p => {
    p.hand.sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return DhihaehValidator.getCardStrength(b) - DhihaehValidator.getCardStrength(a);
    });
  });

  const openingSeat = (dealerSeat + 1) % 4;

  return {
    variant,
    phase: 'TRICK_PLAY',
    players,
    dealerSeat,
    activeSeat: openingSeat,
    trumpSuit: null,
    trumpDeclaredBySeat: null,
    trumpCard: null,
    currentTrick: {
      trickNumber: 1,
      leadSuit: null,
      cards: [],
      winnerSeat: null,
    },
    trickHistory: [],
    score: {
      team1Score: 0,
      team2Score: 0,
      team1Tens: 0,
      team2Tens: 0,
      team1Tricks: 0,
      team2Tricks: 0,
      outcomeType: null,
      handWinnerTeam: null,
    },
    targetScore,
  };
}

export const useDhihaehStore = create<DhihaehStoreState>((set, get) => ({
  gameState: null,
  selectedCardId: null,
  isResolvingTrick: false,
  statusMessage: null,

  startMatch: (variant = 'DYNAMIC_CUT', targetScore = 7) => {
    const initialState = createInitialDhihaehState(variant, targetScore, 3);
    set({
      gameState: initialState,
      selectedCardId: null,
      isResolvingTrick: false,
      statusMessage: `Hand 1 • Trick 1. ${initialState.players[initialState.activeSeat].name} leads.`,
    });

    // If opening player is AI, trigger turn
    if (initialState.players[initialState.activeSeat].isAI) {
      setTimeout(() => get().runAITurnIfNeeded(), 700);
    }
  },

  selectCard: (cardId: string) => {
    const { gameState, selectedCardId } = get();
    if (!gameState || gameState.phase !== 'TRICK_PLAY') return;
    if (gameState.activeSeat !== 0) return; // Human is seat 0

    if (selectedCardId === cardId) {
      // Double tap / second click plays card
      get().playCard(cardId);
    } else {
      set({ selectedCardId: cardId });
    }
  },

  playCard: (cardId: string) => {
    const { gameState, isResolvingTrick } = get();
    if (!gameState || isResolvingTrick || gameState.phase !== 'TRICK_PLAY') return;

    const currentSeat = gameState.activeSeat;
    const player = gameState.players[currentSeat];
    const card = player.hand.find(c => c.id === cardId);
    if (!card) return;

    // Validate play
    if (!DhihaehValidator.isCardPlayable(card, player.hand, gameState.currentTrick)) {
      set({ statusMessage: `Must follow suit (${gameState.currentTrick.leadSuit})!` });
      setTimeout(() => set({ statusMessage: null }), 2000);
      return;
    }

    playCardFlickSound();

    // Check Trump Cut Trigger (Variant A Dynamic Cut or Variant B Hidden Card)
    let newTrumpSuit = gameState.trumpSuit;
    let newTrumpCard = gameState.trumpCard;
    let newTrumpSeat = gameState.trumpDeclaredBySeat;
    const isVoid =
      gameState.currentTrick.leadSuit &&
      !DhihaehValidator.hasSuit(player.hand, gameState.currentTrick.leadSuit);

    if (isVoid && !newTrumpSuit) {
      if (gameState.variant === 'DYNAMIC_CUT') {
        newTrumpSuit = card.suit;
        newTrumpCard = card;
        newTrumpSeat = currentSeat;
        playGinReadyChime();
        set({ statusMessage: `TRUMP CUT! ${card.suit} is now TRUMP!` });
      } else if (gameState.variant === 'BLIND_RESERVE') {
        // Find owner of blind reserve
        const owner = gameState.players.find(p => p.blindReserveCard);
        if (owner && owner.blindReserveCard) {
          newTrumpSuit = owner.blindReserveCard.suit;
          newTrumpCard = owner.blindReserveCard;
          newTrumpSeat = owner.seatIndex;
          playGinReadyChime();
          set({ statusMessage: `TRUMP REVEALED! Hidden card is ${owner.blindReserveCard.suit}!` });

          if (currentSeat === owner.seatIndex) {
            // Forcefully play revealed card
            owner.hand = owner.hand.filter(c => c.id !== cardId);
            owner.hand.push(card); // restore clicked card
            // Replace with blind card
            card.id = owner.blindReserveCard.id;
            card.suit = owner.blindReserveCard.suit;
            card.rank = owner.blindReserveCard.rank;
            owner.blindReserveCard = null;
          } else {
            // Restore revealed card to owner hand
            owner.hand.push({ ...owner.blindReserveCard, isFaceDown: false });
            owner.blindReserveCard = null;
          }
        }
      }
    }

    // Remove played card from hand
    player.hand = player.hand.filter(c => c.id !== cardId);

    const updatedTrick: DhihaehTrick = {
      ...gameState.currentTrick,
      leadSuit: gameState.currentTrick.leadSuit || card.suit,
      cards: [...gameState.currentTrick.cards, { card, playedBySeat: currentSeat }],
    };

    const nextSeat = (currentSeat + 1) % 4;

    // Check if trick completed (4 cards played)
    if (updatedTrick.cards.length === 4) {
      const winnerSeat = DhihaehResolver.evaluateTrickWinner(updatedTrick, newTrumpSuit);
      updatedTrick.winnerSeat = winnerSeat;
      const winnerPlayer = gameState.players[winnerSeat];
      winnerPlayer.tricksWon += 1;

      // Check captured 10s
      const tensInTrick = updatedTrick.cards
        .filter(tc => tc.card.rank === 10)
        .map(tc => tc.card);
      if (tensInTrick.length > 0) {
        winnerPlayer.capturedTens.push(...tensInTrick);
      }

      set({
        selectedCardId: null,
        isResolvingTrick: true,
        statusMessage: `${winnerPlayer.name} wins Trick ${updatedTrick.trickNumber}!`,
        gameState: {
          ...gameState,
          trumpSuit: newTrumpSuit,
          trumpCard: newTrumpCard,
          trumpDeclaredBySeat: newTrumpSeat,
          currentTrick: updatedTrick,
        },
      });

      // Pause briefly for dramatic trick sweep
      setTimeout(() => {
        playCardDiscardThud();
        const nextTrickNumber = updatedTrick.trickNumber + 1;
        const isHandComplete = nextTrickNumber > 13;

        if (isHandComplete) {
          // Hand finished! Compute hand scores
          const handEval = DhihaehResolver.evaluateHandScores(gameState.players);
          const newTeam1Score = gameState.score.team1Score + handEval.team1PointsEarned;
          const newTeam2Score = gameState.score.team2Score + handEval.team2PointsEarned;
          const isMatchOver =
            newTeam1Score >= gameState.targetScore ||
            newTeam2Score >= gameState.targetScore ||
            handEval.outcomeType === 'HAASBAGGA';

          set({
            isResolvingTrick: false,
            statusMessage: `Hand Over! ${handEval.outcomeType} • ${handEval.handWinnerTeam} wins hand!`,
            gameState: {
              ...gameState,
              phase: isMatchOver ? 'MATCH_OVER' : 'ROUND_OVER',
              trickHistory: [...gameState.trickHistory, updatedTrick],
              score: {
                team1Score: newTeam1Score,
                team2Score: newTeam2Score,
                team1Tens: handEval.team1Tens,
                team2Tens: handEval.team2Tens,
                team1Tricks: handEval.team1Tricks,
                team2Tricks: handEval.team2Tricks,
                outcomeType: handEval.outcomeType,
                handWinnerTeam: handEval.handWinnerTeam,
              },
            },
          });
        } else {
          // Next trick begins with trick winner leading
          set({
            isResolvingTrick: false,
            statusMessage: `Trick ${nextTrickNumber} • ${winnerPlayer.name} leads.`,
            gameState: {
              ...gameState,
              activeSeat: winnerSeat,
              trickHistory: [...gameState.trickHistory, updatedTrick],
              currentTrick: {
                trickNumber: nextTrickNumber,
                leadSuit: null,
                cards: [],
                winnerSeat: null,
              },
            },
          });

          // Trigger AI if winner is AI
          if (winnerPlayer.isAI) {
            setTimeout(() => get().runAITurnIfNeeded(), 750);
          }
        }
      }, 1200);
    } else {
      // Trick continues with next player
      set({
        selectedCardId: null,
        gameState: {
          ...gameState,
          activeSeat: nextSeat,
          trumpSuit: newTrumpSuit,
          trumpCard: newTrumpCard,
          trumpDeclaredBySeat: newTrumpSeat,
          currentTrick: updatedTrick,
        },
      });

      if (gameState.players[nextSeat].isAI) {
        setTimeout(() => get().runAITurnIfNeeded(), 650);
      }
    }
  },

  nextHand: () => {
    const { gameState } = get();
    if (!gameState) return;
    const nextDealer = (gameState.dealerSeat + 1) % 4;
    const newState = createInitialDhihaehState(gameState.variant, gameState.targetScore, nextDealer);
    newState.score.team1Score = gameState.score.team1Score;
    newState.score.team2Score = gameState.score.team2Score;

    set({
      gameState: newState,
      selectedCardId: null,
      isResolvingTrick: false,
      statusMessage: `Hand started. ${newState.players[newState.activeSeat].name} leads.`,
    });

    if (newState.players[newState.activeSeat].isAI) {
      setTimeout(() => get().runAITurnIfNeeded(), 700);
    }
  },

  runAITurnIfNeeded: () => {
    const { gameState, isResolvingTrick } = get();
    if (!gameState || isResolvingTrick || gameState.phase !== 'TRICK_PLAY') return;
    const activePlayer = gameState.players[gameState.activeSeat];
    if (!activePlayer.isAI) return;

    const chosenCard = DhihaehAI.chooseCardToPlay(activePlayer, gameState);
    if (chosenCard) {
      get().playCard(chosenCard.id);
    }
  },
}));
