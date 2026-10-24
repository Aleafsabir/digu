import { create } from 'zustand';
import {
  Card,
  TableRules,
  GameState,
  RoundResolution,
  DeckService,
  RummyValidator,
  TeamHandOptimizer,
  FastMeldParser,
  RoundResolver,
  Suit,
  AppScreen,
  PlayType,
  DiguAI,
} from '@game/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { VisualTheme } from '../theme/themeConfig';
import { DeckDesignId } from '../config/deckConfig';
import { AppUpdateInfo } from '../config/versionConfig';
import { useAuthStore } from './useAuthStore';

export interface HandMeldGroup {
  id: string;
  type: 'SET' | 'RUN';
  cards: Card[];
  points: number;
}

export interface HandAnalysis {
  melds: HandMeldGroup[];
  deadwood: Card[];
  deadwoodPoints: number;
  isGinReady: boolean; // Has exactly one 4-card meld and two 3-card melds
  isThousandRunReady: boolean; // Has 10-card suited sequence
  validGinFinishCardIds: string[]; // IDs of cards that, if discarded, leave a 100% legal Gin
}

export interface GameStoreState {
  appName: string;
  activeGame: 'DIGU' | 'DHIHAEH' | 'BONDI';
  setActiveGame: (game: 'DIGU' | 'DHIHAEH' | 'BONDI') => void;

  // Core Engine State
  gameState: GameState;

  // Hand state & interaction (Gin Rummy Plus style)
  handCards: Card[]; // The human player's (Seat 0) hand of cards
  selectedCardId: string | null;
  sortMode: 'CUSTOM' | 'RANK' | 'SUIT' | 'MELDS' | 'RUNS' | 'SETS';
  handAnalysis: HandAnalysis;

  // Resolution & Animation
  roundResolution: RoundResolution | null;
  roundHistory: RoundResolution[];
  isSlammingFinish: boolean;
  isDealingOpeningAnimation: boolean;
  setIsDealingOpeningAnimation: (isDealing: boolean) => void;
  actionError: string | null;

  // Live AI Feedback
  aiThoughtMessage: { seatIndex: number; message: string } | null;

  // Inactivity & Turn Clock State
  consecutiveMissedTurns: number;
  turnStartedAt: number | null;
  awayToastMessage: string | null;
  isForfeitedDueToInactivity: boolean;

  // App Lifecycle & Navigation Screens
  currentScreen: AppScreen;
  pendingRules: TableRules;
  tablePot: number;
  tableBuyIn: number;

  // Visual Theme & Deck Direction
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  activeDeck: DeckDesignId;
  setActiveDeck: (deck: DeckDesignId) => void;

  // System Audio & Haptic Preferences
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;

  // Player Chat & Emoji Reactions
  playerReactions: Record<number, { text?: string; emoji?: string; id: number }>;
  triggerReaction: (playerIndex: number, text?: string, emoji?: string) => void;

  // In-App APK Updates
  updateInfo: AppUpdateInfo | null;
  showUpdateModal: boolean;
  setUpdateInfo: (info: AppUpdateInfo | null) => void;
  setShowUpdateModal: (show: boolean) => void;

  // Actions
  setScreen: (screen: AppScreen) => void;
  selectModeAndReview: (mode: TableRules['mode']) => void;
  selectPlayType: (playType: PlayType) => void;
  updatePendingRules: (rules: Partial<TableRules>) => void;
  confirmAndStartMatch: () => void;
  exitToLobby: () => void;

  initGame: (rules?: Partial<TableRules>, customPlayerNames?: string[]) => void;
  startScatterCut: () => void;
  dealRound: () => void;
  drawFromStock: (targetIndex?: number) => void;
  drawFromDiscard: (targetIndex?: number) => void;
  initiateReshuffleFromDiscards: () => boolean;
  selectCard: (cardId: string, forceSelect?: boolean) => void;
  discardCard: (cardId: string) => void;
  sortHand: (mode: 'RANK' | 'SUIT' | 'MELDS' | 'RUNS' | 'SETS') => void;
  reorderHand: (newCards: Card[]) => void;
  moveCardInHand: (fromIndex: number, toIndex: number) => void;
  declareGinWithSlam: (finishCardId: string) => boolean;
  nextRound: () => void;
  resetMatch: () => void;
  clearError: () => void;

  // Inactivity & Session Recovery Actions
  autoPlayAwayTurn: () => void;
  resetAwayTurnCounter: () => void;
  forfeitMatchDueToInactivity: () => void;
  clearAwayToast: () => void;
  restoreActiveMatchSession: () => boolean;
  clearActiveMatchSession: () => void;

  // Bot Turn Automation Actions
  executeBotDraw: (botIndex: number) => void;
  executeBotAction: (botIndex: number) => void;
  setAiThoughtMessage: (thought: { seatIndex: number; message: string } | null) => void;
}

const DEFAULT_RULES: TableRules = {
  mode: 'TEAM_4P',
  dealOption: 'DRAW_FIRST_CARD',
  targetScore: 1000,
  turnTimeoutSeconds: 30,
  playType: 'VS_AI',
  buyIn: 1000,
};

function analyzeHand(cards: Card[]): HandAnalysis {
  const result = FastMeldParser.analyzeHandFast(cards);

  const melds: HandMeldGroup[] = result.melds.map((meld, idx) => ({
    id: `meld-${idx}`,
    type: meld.type,
    cards: meld.cards,
    points: meld.points,
  }));

  return {
    melds,
    deadwood: result.unmeldedCards,
    deadwoodPoints: result.deadwoodPoints,
    isGinReady: result.isGinReady,
    isThousandRunReady: result.isThousandRunReady,
    validGinFinishCardIds: result.validGinFinishCardIds,
  };
}

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

function formatCard(card: Card): string {
  const rank = RANK_LABELS[card.rank] || card.rank.toString();
  const suit = SUIT_SYMBOLS[card.suit] || '';
  return `${rank}${suit}`;
}

const SUIT_ORDER: Record<Suit, number> = {
  SPADES: 4,
  HEARTS: 3,
  CLUBS: 2,
  DIAMONDS: 1,
};

export const ACTIVE_MATCH_STORAGE_KEY = 'thaasbai_active_match';

export interface SavedMatchSession {
  gameState: GameState;
  handCards: Card[];
  pendingRules: TableRules;
  roundHistory: RoundResolution[];
  tablePot: number;
  tableBuyIn: number;
  consecutiveMissedTurns: number;
  turnStartedAt: number | null;
  savedAt: number;
}

export function safeSaveSession(session: SavedMatchSession) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(session));
    }
  } catch (err) {
    console.warn('Failed to save session to localStorage:', err);
  }
}

export function safeLoadSession(): SavedMatchSession | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn('Failed to load session from localStorage:', err);
  }
  return null;
}

export function safeClearSession() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const initialPlayers = DeckService.createInitialPlayers(DEFAULT_RULES.mode);

  const initialGameState: GameState = {
    roomId: 'thaasbai-room-1',
    rules: DEFAULT_RULES,
    phase: 'SCATTER_CUT',
    players: initialPlayers,
    dealerIndex: 0,
    activePlayerIndex: 0,
    stockPile: [],
    discardPile: [],
    finishSlotCard: null,
    lastRoundWinnerId: null,
  };

  return {
    appName: 'Holhuashi (ހޮޅުއަށި)',
    activeGame: 'DIGU',
    setActiveGame: (game) => set({ activeGame: game }),
    gameState: initialGameState,
    handCards: [],
    selectedCardId: null,
    sortMode: 'CUSTOM',
    handAnalysis: {
      melds: [],
      deadwood: [],
      deadwoodPoints: 0,
      isGinReady: false,
      isThousandRunReady: false,
      validGinFinishCardIds: [],
    },
    roundResolution: null,
    roundHistory: [],
    isSlammingFinish: false,
    isDealingOpeningAnimation: false,
    setIsDealingOpeningAnimation: (isDealing: boolean) => set({ isDealingOpeningAnimation: isDealing }),
    actionError: null,
    aiThoughtMessage: null,

    // Inactivity & Turn Clock State
    consecutiveMissedTurns: 0,
    turnStartedAt: null,
    awayToastMessage: null,
    isForfeitedDueToInactivity: false,

    // App Lifecycle State
    currentScreen: 'LAUNCH',
    pendingRules: { ...DEFAULT_RULES },
    tablePot: 4000,
    tableBuyIn: 1000,
    visualTheme: (() => {
      if (typeof localStorage === 'undefined') return 'royal_lacquer';
      const saved = localStorage.getItem('thaasbai_visual_theme');
      if (!saved) {
        localStorage.setItem('thaasbai_visual_theme', 'royal_lacquer');
        return 'royal_lacquer';
      }
      return (saved as VisualTheme) || 'royal_lacquer';
    })(),

    setVisualTheme: (theme: VisualTheme) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('thaasbai_visual_theme', theme);
      }
      set({ visualTheme: theme });
    },

    activeDeck: (() => {
      if (typeof localStorage === 'undefined') return 'digu_emerald';
      const saved = localStorage.getItem('thaasbai_active_deck');
      if (!saved || saved === 'burgundy_gold') {
        localStorage.setItem('thaasbai_active_deck', 'digu_emerald');
        return 'digu_emerald';
      }
      return (saved as DeckDesignId) || 'digu_emerald';
    })(),

    setActiveDeck: (deck: DeckDesignId) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('thaasbai_active_deck', deck);
      }
      set({ activeDeck: deck });
    },

    soundEnabled:
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('thaasbai_sound_enabled') !== 'false'
        : true,

    setSoundEnabled: (enabled: boolean) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('thaasbai_sound_enabled', String(enabled));
      }
      set({ soundEnabled: enabled });
    },

    hapticsEnabled:
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('thaasbai_haptics_enabled') !== 'false'
        : true,

    setHapticsEnabled: (enabled: boolean) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('thaasbai_haptics_enabled', String(enabled));
      }
      set({ hapticsEnabled: enabled });
    },

    playerReactions: {},

    triggerReaction: (playerIndex: number, text?: string, emoji?: string) => {
      const reactionId = Date.now();
      set(state => ({
        playerReactions: {
          ...state.playerReactions,
          [playerIndex]: { text, emoji, id: reactionId },
        },
      }));

      // Auto dismiss reaction after 2.6 seconds
      setTimeout(() => {
        set(state => {
          const current = state.playerReactions[playerIndex];
          if (current && current.id === reactionId) {
            const updated = { ...state.playerReactions };
            delete updated[playerIndex];
            return { playerReactions: updated };
          }
          return state;
        });
      }, 2600);
    },

    updateInfo: null,
    showUpdateModal: false,
    setUpdateInfo: (info: AppUpdateInfo | null) => set({ updateInfo: info }),
    setShowUpdateModal: (show: boolean) => set({ showUpdateModal: show }),

    setScreen: (screen: AppScreen) => set({ currentScreen: screen }),

    selectModeAndReview: (mode: TableRules['mode']) => {
      set(prev => ({
        pendingRules: {
          ...prev.pendingRules,
          mode,
          targetScore: mode === 'SOLO_2P' ? 500 : 1000,
        },
        currentScreen: 'PLAY_TYPE_SELECT',
      }));
    },

    selectPlayType: (playType: PlayType) => {
      set(prev => ({
        pendingRules: {
          ...prev.pendingRules,
          playType,
        },
        currentScreen: playType === 'VS_AI' ? 'RULES_CONFIRM' : 'ONLINE_LOBBY',
      }));
    },

    setAiThoughtMessage: (thought: { seatIndex: number; message: string } | null) => {
      set({ aiThoughtMessage: thought });
    },

    updatePendingRules: (rulesUpdate: Partial<TableRules>) => {
      set(prev => ({
        pendingRules: {
          ...prev.pendingRules,
          ...rulesUpdate,
        },
      }));
    },

    confirmAndStartMatch: () => {
      const { pendingRules, initGame } = get();
      const buyIn = pendingRules.buyIn ?? (pendingRules.mode === 'SOLO_2P' ? 500 : 1000);
      const playerCount = pendingRules.mode === 'SOLO_2P' ? 2 : 4;
      const pot = buyIn * playerCount;

      // Deduct human player buy-in if coins available
      const roomCode = pendingRules.roomCode || `THAAS-${Math.floor(1000 + Math.random() * 9000)}`;
      useAuthStore.getState().executeBuyIn(
        buyIn,
        `Table Buy-In for ${pendingRules.mode} (#${roomCode})`,
        roomCode
      );

      initGame({ ...pendingRules, buyIn, roomCode });
      set({ currentScreen: 'TABLE', tablePot: pot, tableBuyIn: buyIn });
    },

    exitToLobby: () => {
      safeClearSession();
      set({
        currentScreen: 'MODE_SELECT',
        isForfeitedDueToInactivity: false,
        consecutiveMissedTurns: 0,
        turnStartedAt: null,
        awayToastMessage: null,
      });
    },

    clearError: () => set({ actionError: null }),

    initGame: (rulesUpdate, customPlayerNames) => {
      const rules: TableRules = { ...DEFAULT_RULES, ...rulesUpdate };
      const players = DeckService.createInitialPlayers(
        rules.mode,
        customPlayerNames,
        rules.playType || 'VS_AI'
      );

      // Random starting dealer
      const initialDealerIndex = Math.floor(Math.random() * players.length);
      const deal = DeckService.dealRound(players, initialDealerIndex, rules);

      const gameState: GameState = {
        roomId: `thaasbai-${Date.now()}`,
        rules,
        phase: 'AWAIT_DRAW',
        players: deal.updatedPlayers,
        dealerIndex: initialDealerIndex,
        activePlayerIndex: deal.activePlayerIndex,
        stockPile: deal.stockPile,
        discardPile: deal.discardPile,
        finishSlotCard: null,
        lastRoundWinnerId: null,
      };

      const humanHand = [...deal.updatedPlayers[0].hand];

      set({
        gameState,
        handCards: humanHand,
        selectedCardId: null,
        sortMode: 'CUSTOM',
        handAnalysis: analyzeHand(humanHand),
        roundResolution: null,
        roundHistory: [],
        isSlammingFinish: false,
        isDealingOpeningAnimation: true,
        actionError: null,
        aiThoughtMessage: null,
        consecutiveMissedTurns: 0,
        turnStartedAt: deal.activePlayerIndex === 0 ? Date.now() : null,
        awayToastMessage: null,
        isForfeitedDueToInactivity: false,
      });
    },

    startScatterCut: () => {
      const { gameState } = get();
      const deck = DeckService.shuffle(DeckService.createStandardDeck());

      const scatterPicks = gameState.players.map((p, idx) => ({
        playerId: p.id,
        card: { ...deck[idx], isFaceDown: false },
      }));

      const cutResult = DeckService.determineDealerFromScatter(scatterPicks);
      const dealerIndex = gameState.players.findIndex(p => p.id === cutResult.dealerPlayerId);

      const updatedPlayers = gameState.players.map((p, idx) => ({
        ...p,
        scatterCard: scatterPicks[idx].card,
      }));

      set({
        gameState: {
          ...gameState,
          players: updatedPlayers,
          dealerIndex: dealerIndex >= 0 ? dealerIndex : 0,
          phase: 'ROUND_DEALING',
        },
        actionError: null,
      });
    },

    dealRound: () => {
      const { gameState } = get();
      const deal = DeckService.dealRound(
        gameState.players,
        gameState.dealerIndex,
        gameState.rules
      );

      const updatedGameState: GameState = {
        ...gameState,
        phase: 'AWAIT_DRAW',
        players: deal.updatedPlayers,
        activePlayerIndex: deal.activePlayerIndex,
        stockPile: deal.stockPile,
        discardPile: deal.discardPile,
        finishSlotCard: null,
      };

      // In VS AI mode, Seat 0 is always the Human player
      const humanHand = [...deal.updatedPlayers[0].hand];

      set({
        gameState: updatedGameState,
        handCards: humanHand,
        selectedCardId: null,
        sortMode: 'CUSTOM',
        handAnalysis: analyzeHand(humanHand),
        roundResolution: null,
        isSlammingFinish: false,
        isDealingOpeningAnimation: false,
        actionError: null,
        aiThoughtMessage: null,
        turnStartedAt: deal.activePlayerIndex === 0 ? Date.now() : null,
        consecutiveMissedTurns: 0,
      });
    },

    drawFromStock: (targetIndex?: number) => {
      const { gameState, handCards } = get();

      if (handCards.length >= 11) {
        return;
      }

      if (gameState.activePlayerIndex !== 0) {
        set({ actionError: 'Please wait for your turn.' });
        return;
      }

      if (gameState.phase !== 'AWAIT_DRAW') {
        set({ actionError: 'Cannot draw: not in draw phase.' });
        return;
      }

      let newStock = [...gameState.stockPile];
      const newDiscard = [...gameState.discardPile];

      if (newStock.length === 0) {
        set({ actionError: 'Draw pile is empty. Tap the draw pile to reshuffle played cards.' });
        return;
      }

      const drawnCard = { ...newStock.pop()!, isFaceDown: false };
      const updatedHand = [...handCards];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= handCards.length) {
        updatedHand.splice(targetIndex, 0, drawnCard);
      } else {
        updatedHand.push(drawnCard);
      }

      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === 0
          ? { ...p, hand: updatedHand, handCount: updatedHand.length }
          : p
      );

      set({
        gameState: {
          ...gameState,
          phase: 'AWAIT_ACTION',
          stockPile: newStock,
          discardPile: newDiscard,
          players: updatedPlayers,
        },
        handCards: updatedHand,
        selectedCardId: null, // Zero persistent selection: drawn card joins hand cleanly without being pre-selected
        handAnalysis: analyzeHand(updatedHand),
        actionError: null,
        consecutiveMissedTurns: 0,
      });
    },

    drawFromDiscard: (targetIndex?: number) => {
      const { gameState, handCards } = get();

      if (handCards.length >= 11) {
        return;
      }

      if (gameState.activePlayerIndex !== 0) {
        set({ actionError: 'Please wait for your turn.' });
        return;
      }

      if (gameState.phase !== 'AWAIT_DRAW') {
        set({ actionError: 'Cannot draw: not in draw phase.' });
        return;
      }

      if (gameState.discardPile.length === 0) {
        set({ actionError: 'Discard pile is empty.' });
        return;
      }

      const newDiscard = [...gameState.discardPile];
      const drawnCard = newDiscard.pop()!;

      const updatedHand = [...handCards];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= handCards.length) {
        updatedHand.splice(targetIndex, 0, drawnCard);
      } else {
        updatedHand.push(drawnCard);
      }

      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === 0
          ? { ...p, hand: updatedHand, handCount: updatedHand.length }
          : p
      );

      set({
        gameState: {
          ...gameState,
          phase: 'AWAIT_ACTION',
          discardPile: newDiscard,
          players: updatedPlayers,
        },
        handCards: updatedHand,
        selectedCardId: null, // Zero persistent selection
        handAnalysis: analyzeHand(updatedHand),
        actionError: null,
        consecutiveMissedTurns: 0,
      });
    },

    initiateReshuffleFromDiscards: () => {
      const { gameState } = get();

      if (gameState.phase !== 'AWAIT_DRAW') {
        set({ actionError: 'Can only reshuffle during draw phase.' });
        return false;
      }

      if (gameState.stockPile.length > 0) {
        set({ actionError: 'Draw pile is not empty.' });
        return false;
      }

      if (gameState.discardPile.length === 0) {
        set({ actionError: 'No cards available to reshuffle.' });
        return false;
      }

      // Reshuffle all cards from the discard pile face-down into the new draw pile
      const reshuffledStock = DeckService.shuffle(
        gameState.discardPile.map(c => ({ ...c, isFaceDown: true }))
      );

      set({
        gameState: {
          ...gameState,
          stockPile: reshuffledStock,
          discardPile: [],
        },
        actionError: null,
      });

      return true;
    },

    selectCard: (cardId: string, forceSelect = false) => {
      set(prev => ({
        selectedCardId: forceSelect ? cardId : (prev.selectedCardId === cardId ? null : cardId),
        consecutiveMissedTurns: 0,
      }));
    },

    discardCard: (cardId: string) => {
      const { gameState, handCards } = get();

      if (gameState.activePlayerIndex !== 0) {
        set({ actionError: 'Please wait for your turn.' });
        return;
      }

      if (gameState.phase !== 'AWAIT_ACTION') {
        set({ actionError: 'Cannot discard: not your action turn.' });
        return;
      }

      const cardToDiscard = handCards.find(c => c.id === cardId);
      if (!cardToDiscard) {
        set({ actionError: `Card ${cardId} not found in hand.` });
        return;
      }

      const remainingHand = handCards.filter(c => c.id !== cardId);

      // Invariant: Resting hand must have exactly 10 cards
      if (remainingHand.length !== 10) {
        set({
          actionError: `Invalid discard: hand must have 10 cards after discard (has ${remainingHand.length}).`,
        });
        return;
      }

      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === 0
          ? { ...p, hand: remainingHand, handCount: 10 }
          : p
      );

      const updatedDiscard = [...gameState.discardPile, { ...cardToDiscard, isFaceDown: false }];
      const nextPlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;

      // Crucial: Human (Seat 0) hand cards remain locked to Seat 0!
      set({
        gameState: {
          ...gameState,
          phase: 'AWAIT_DRAW',
          players: updatedPlayers,
          activePlayerIndex: nextPlayerIndex,
          discardPile: updatedDiscard,
        },
        handCards: remainingHand,
        selectedCardId: null,
        sortMode: 'CUSTOM',
        handAnalysis: analyzeHand(remainingHand),
        actionError: null,
        consecutiveMissedTurns: 0,
        turnStartedAt: null,
      });
    },

    sortHand: (mode: 'RANK' | 'SUIT' | 'MELDS' | 'RUNS' | 'SETS') => {
      const { handCards } = get();
      let sorted = [...handCards];

      if (mode === 'RANK') {
        sorted.sort((a, b) => a.rank - b.rank);
      } else if (mode === 'SUIT' || mode === 'RUNS') {
        // Group by suit first, then ascending rank within suit (Runs view)
        sorted.sort((a, b) => {
          if (a.suit === b.suit) return a.rank - b.rank;
          return SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit];
        });
      } else if (mode === 'SETS') {
        // Group by rank first (so matching sets sit adjacent), then suit
        sorted.sort((a, b) => {
          if (a.rank === b.rank) return SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit];
          return a.rank - b.rank;
        });
      } else if (mode === 'MELDS') {
        // Group by melds from optimizer with deadwood at the end
        const analysis = analyzeHand(handCards);
        const meldCards = analysis.melds.flatMap(m => m.cards);
        const deadwoodCards = analysis.deadwood;
        sorted = [...meldCards, ...deadwoodCards];
      }

      set({
        handCards: sorted,
        sortMode: mode,
        handAnalysis: analyzeHand(sorted),
        consecutiveMissedTurns: 0,
      });
    },

    reorderHand: (newCards: Card[]) => {
      const { gameState } = get();
      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === 0
          ? { ...p, hand: newCards, handCount: newCards.length }
          : p
      );

      set({
        gameState: {
          ...gameState,
          players: updatedPlayers,
        },
        handCards: newCards,
        sortMode: 'CUSTOM',
        handAnalysis: analyzeHand(newCards),
        consecutiveMissedTurns: 0,
      });
    },

    moveCardInHand: (fromIndex: number, toIndex: number) => {
      const { gameState, handCards } = get();
      if (
        fromIndex < 0 ||
        fromIndex >= handCards.length ||
        toIndex < 0 ||
        toIndex >= handCards.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const updated = [...handCards];
      const [movedCard] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedCard);

      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === 0
          ? { ...p, hand: updated, handCount: updated.length }
          : p
      );

      set({
        gameState: {
          ...gameState,
          players: updatedPlayers,
        },
        handCards: updated,
        sortMode: 'CUSTOM',
        handAnalysis: analyzeHand(updated),
        consecutiveMissedTurns: 0,
      });
    },

    declareGinWithSlam: (finishCardId: string) => {
      const { gameState, handCards } = get();

      if (gameState.activePlayerIndex !== 0) {
        set({ actionError: 'Can only declare Gin during your active action turn.' });
        return false;
      }

      if (gameState.phase !== 'AWAIT_ACTION') {
        set({ actionError: 'Can only declare Gin during your active action turn.' });
        return false;
      }

      // Smart resolution: if finishCardId is provided and valid, use it; otherwise resolve the legal finish card
      const resolvedFinishCardId =
        TeamHandOptimizer.resolveGinFinishCardId(handCards, finishCardId) || finishCardId;

      const finishCard = handCards.find(c => c.id === resolvedFinishCardId);
      if (!finishCard) {
        set({ actionError: `Finish card ${finishCardId} not found in hand.` });
        return false;
      }

      const handWithoutFinish = handCards.filter(c => c.id !== resolvedFinishCardId);

      // Check 1,000-point special run
      const isThousandPointRun =
        handWithoutFinish.length === 10 &&
        RummyValidator.checkThousandPointRun(handWithoutFinish);

      // Check standard 4+3+3 Gin via optimizer
      const optimization = TeamHandOptimizer.optimizeMergedHand(handWithoutFinish);
      const isStandardGin = RummyValidator.validateGin(optimization.melds);

      if (!isThousandPointRun && !isStandardGin) {
        set({
          actionError:
            'Cannot declare Gin: Hand does not form valid 4+3+3 melds (0 Deadwood) or a 1,000-point run.',
        });
        return false;
      }

      const slammedCard: Card = { ...finishCard, isFaceDown: true };

      // Native mobile haptic vibration
      try {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      } catch {
        // Fallback for web
      }

      try {
        const meldsToResolve = isThousandPointRun ? [handWithoutFinish] : optimization.melds;

        // Strip 11th finish card from player 0 hand so round resolver receives exact 10 resting cards (20 team cards)
        const playersForResolution = gameState.players.map((p, idx) =>
          idx === 0 ? { ...p, hand: handWithoutFinish, handCount: 10 } : p
        );
        const stateForResolution: GameState = {
          ...gameState,
          players: playersForResolution,
        };

        const resolution = RoundResolver.resolveRound(
          stateForResolution,
          gameState.players[0].id,
          meldsToResolve,
          slammedCard
        );

        const updatedPlayers = playersForResolution.map(p => {
          const scoreDetail = resolution.playerScores.find(s => s.playerId === p.id);
          const isWinner = p.id === gameState.players[0].id;

          return {
            ...p,
            cumulativeScore: scoreDetail ? scoreDetail.newCumulativeScore : p.cumulativeScore,
            consecutiveGins: isWinner ? p.consecutiveGins + 1 : 0,
          };
        });

        const updatedGameState: GameState = {
          ...gameState,
          phase: resolution.matchOver ? 'MATCH_OVER' : 'ROUND_RESOLVING',
          players: updatedPlayers,
          finishSlotCard: slammedCard,
          lastRoundWinnerId: gameState.players[0].id,
        };

        const wasAlreadySlamming = get().isSlammingFinish;
        set(state => ({
          gameState: updatedGameState,
          handCards: handWithoutFinish,
          selectedCardId: null,
          handAnalysis: analyzeHand(handWithoutFinish),
          roundResolution: resolution,
          roundHistory: [...state.roundHistory, resolution],
          isSlammingFinish: wasAlreadySlamming ? false : true,
          actionError: null,
          aiThoughtMessage: { seatIndex: 0, message: '⚡ GIN SLAM!' },
        }));

        if (!wasAlreadySlamming) {
          setTimeout(() => {
            set({ isSlammingFinish: false });
          }, 1200);
        }

        return true;
      } catch (err: any) {
        set({ actionError: `Error resolving round: ${err.message}` });
        return false;
      }
    },

    // Autonomous Bot Turn Actions
    executeBotDraw: (botIndex: number) => {
      const { gameState } = get();
      if (gameState.phase !== 'AWAIT_DRAW' || gameState.activePlayerIndex !== botIndex) {
        return;
      }

      const botPlayer = gameState.players[botIndex];
      if (!botPlayer || !botPlayer.isAI) return;

      const topDiscard =
        gameState.discardPile.length > 0
          ? gameState.discardPile[gameState.discardPile.length - 1]
          : null;

      const shouldDrawDiscard = DiguAI.shouldDrawDiscard(
        botPlayer.hand,
        topDiscard,
        gameState.rules
      );

      let drawnCard: Card;
      let newStock = [...gameState.stockPile];
      let newDiscard = [...gameState.discardPile];
      let thought = '';

      // Auto-reshuffle entire discard pile into stock if stock is empty and bot wants to draw stock
      if (!shouldDrawDiscard && newStock.length === 0 && newDiscard.length > 0) {
        newStock = DeckService.shuffle(newDiscard.map(c => ({ ...c, isFaceDown: true })));
        newDiscard = [];
      }

      if (shouldDrawDiscard && newDiscard.length > 0) {
        drawnCard = newDiscard.pop()!;
        thought = `Drew ${formatCard(drawnCard)} from Discard`;
      } else if (newStock.length > 0) {
        drawnCard = { ...newStock.pop()!, isFaceDown: false };
        thought = 'Drew from Stock Pile';
      } else if (newDiscard.length > 0) {
        // Stock empty and no shuffle possible, forced to draw discard
        drawnCard = newDiscard.pop()!;
        thought = `Drew ${formatCard(drawnCard)} from Discard`;
      } else {
        return;
      }

      const updatedBotHand = [...botPlayer.hand, drawnCard];
      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === botIndex
          ? { ...p, hand: updatedBotHand, handCount: updatedBotHand.length }
          : p
      );

      set({
        gameState: {
          ...gameState,
          phase: 'AWAIT_ACTION',
          stockPile: newStock,
          discardPile: newDiscard,
          players: updatedPlayers,
        },
        aiThoughtMessage: { seatIndex: botIndex, message: thought },
      });
    },

    executeBotAction: (botIndex: number) => {
      const { gameState } = get();
      if (gameState.phase !== 'AWAIT_ACTION' || gameState.activePlayerIndex !== botIndex) {
        return;
      }

      const botPlayer = gameState.players[botIndex];
      if (!botPlayer || !botPlayer.isAI) return;

      const botHand = botPlayer.hand;
      if (botHand.length !== 11) return;

      const decision = DiguAI.chooseBestAction(botHand);
      const discardCard = botHand.find(c => c.id === decision.cardId) || botHand[botHand.length - 1];
      const shouldGinSlam = decision.action === 'GIN_SLAM';

      if (shouldGinSlam) {
        const slammedCard: Card = { ...discardCard, isFaceDown: true };
        const handWithoutFinish = botHand.filter(c => c.id !== discardCard.id);

        const isThousandPointRun =
          handWithoutFinish.length === 10 &&
          RummyValidator.checkThousandPointRun(handWithoutFinish);

        const optimization = TeamHandOptimizer.optimizeMergedHand(handWithoutFinish);
        const meldsToResolve = isThousandPointRun ? [handWithoutFinish] : optimization.melds;

        try {
          // Strip 11th finish card from bot hand so round resolver receives exact 10 resting cards (20 team cards)
          const playersForResolution = gameState.players.map((p, idx) =>
            idx === botIndex ? { ...p, hand: handWithoutFinish, handCount: 10 } : p
          );
          const stateForResolution: GameState = {
            ...gameState,
            players: playersForResolution,
          };

          const resolution = RoundResolver.resolveRound(
            stateForResolution,
            botPlayer.id,
            meldsToResolve,
            slammedCard
          );

          const updatedPlayers = playersForResolution.map(p => {
            const scoreDetail = resolution.playerScores.find(s => s.playerId === p.id);
            const isWinner = p.id === botPlayer.id;

            return {
              ...p,
              cumulativeScore: scoreDetail ? scoreDetail.newCumulativeScore : p.cumulativeScore,
              consecutiveGins: isWinner ? p.consecutiveGins + 1 : 0,
            };
          });

          const updatedGameState: GameState = {
            ...gameState,
            phase: resolution.matchOver ? 'MATCH_OVER' : 'ROUND_RESOLVING',
            players: updatedPlayers,
            finishSlotCard: slammedCard,
            lastRoundWinnerId: botPlayer.id,
          };

          const wasAlreadySlamming = get().isSlammingFinish;
          set(state => ({
            gameState: updatedGameState,
            roundResolution: resolution,
            roundHistory: [...state.roundHistory, resolution],
            isSlammingFinish: wasAlreadySlamming ? false : true,
            aiThoughtMessage: { seatIndex: botIndex, message: '⚡ GIN SLAM!' },
          }));

          if (!wasAlreadySlamming) {
            setTimeout(() => {
              set({ isSlammingFinish: false });
            }, 1200);
          }
        } catch (err: any) {
          console.error('Bot Gin resolution error:', err);
        }
        return;
      }

      // Regular discard
      const remainingHand = botHand.filter(c => c.id !== discardCard.id);
      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === botIndex
          ? { ...p, hand: remainingHand, handCount: 10 }
          : p
      );

      const updatedDiscard = [...gameState.discardPile, { ...discardCard, isFaceDown: false }];
      const nextPlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;

      set({
        gameState: {
          ...gameState,
          phase: 'AWAIT_DRAW',
          players: updatedPlayers,
          activePlayerIndex: nextPlayerIndex,
          discardPile: updatedDiscard,
        },
        turnStartedAt: nextPlayerIndex === 0 ? Date.now() : null,
        aiThoughtMessage: {
          seatIndex: botIndex,
          message: `Discarded ${formatCard(discardCard)}`,
        },
      });
    },

    nextRound: () => {
      const { gameState } = get();
      const winnerIndex = gameState.players.findIndex(p => p.id === gameState.lastRoundWinnerId);
      const nextDealerIndex =
        winnerIndex >= 0 ? (winnerIndex + 1) % gameState.players.length : gameState.dealerIndex;

      const deal = DeckService.dealRound(
        gameState.players,
        nextDealerIndex,
        gameState.rules
      );

      const updatedGameState: GameState = {
        ...gameState,
        phase: 'AWAIT_DRAW',
        players: deal.updatedPlayers,
        dealerIndex: nextDealerIndex,
        activePlayerIndex: deal.activePlayerIndex,
        stockPile: deal.stockPile,
        discardPile: deal.discardPile,
        finishSlotCard: null,
      };

      const humanHand = [...deal.updatedPlayers[0].hand];

      set({
        gameState: updatedGameState,
        handCards: humanHand,
        selectedCardId: null,
        sortMode: 'CUSTOM',
        handAnalysis: analyzeHand(humanHand),
        roundResolution: null,
        isSlammingFinish: false,
        isDealingOpeningAnimation: false,
        actionError: null,
        aiThoughtMessage: null,
        turnStartedAt: deal.activePlayerIndex === 0 ? Date.now() : null,
        consecutiveMissedTurns: 0,
      });
    },

    resetMatch: () => {
      safeClearSession();
      const { gameState } = get();
      get().initGame(gameState.rules);
      set({
        isForfeitedDueToInactivity: false,
        consecutiveMissedTurns: 0,
        turnStartedAt: null,
        awayToastMessage: null,
      });
    },

    autoPlayAwayTurn: () => {
      const { gameState, handCards, consecutiveMissedTurns } = get();

      // Only applies when human player (Seat 0) is the active player
      if (gameState.activePlayerIndex !== 0) {
        return;
      }

      if (gameState.phase !== 'AWAIT_DRAW' && gameState.phase !== 'AWAIT_ACTION') {
        return;
      }

      const nextMissed = (consecutiveMissedTurns || 0) + 1;

      // If this was the 3rd missed turn (exceeding 2 allowed away turns), trigger forfeit!
      if (nextMissed >= 3) {
        get().forfeitMatchDueToInactivity();
        return;
      }

      let currentHand = [...handCards];
      let newStock = [...gameState.stockPile];
      let newDiscard = [...gameState.discardPile];

      // Auto-draw if in AWAIT_DRAW
      if (gameState.phase === 'AWAIT_DRAW') {
        if (newStock.length === 0 && newDiscard.length > 0) {
          newStock = DeckService.shuffle(newDiscard.map(c => ({ ...c, isFaceDown: true })));
          newDiscard = [];
        }

        let drawnCard: Card;
        if (newStock.length > 0) {
          drawnCard = { ...newStock.pop()!, isFaceDown: false };
        } else if (newDiscard.length > 0) {
          drawnCard = newDiscard.pop()!;
        } else {
          return;
        }

        currentHand.push(drawnCard);
      }

      // Auto-discard if hand has 11 cards
      if (currentHand.length !== 11) {
        return;
      }

      const discardDecision = DiguAI.chooseBestAction(currentHand);
      const cardToDiscard = currentHand.find(c => c.id === discardDecision.cardId) || currentHand[0];
      const remainingHand = currentHand.filter(c => c.id !== cardToDiscard.id);

      const updatedPlayers = gameState.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: remainingHand, handCount: 10 } : p
      );

      const updatedDiscard = [...newDiscard, { ...cardToDiscard, isFaceDown: false }];
      const nextPlayerIndex = (0 + 1) % gameState.players.length;

      const toast =
        nextMissed === 1
          ? 'Auto-played away turn (1/2)'
          : 'Auto-played away turn (2/2) — Next missed turn will forfeit match';

      set({
        gameState: {
          ...gameState,
          phase: 'AWAIT_DRAW',
          activePlayerIndex: nextPlayerIndex,
          players: updatedPlayers,
          stockPile: newStock,
          discardPile: updatedDiscard,
        },
        handCards: remainingHand,
        selectedCardId: null,
        handAnalysis: analyzeHand(remainingHand),
        consecutiveMissedTurns: nextMissed,
        turnStartedAt: null,
        awayToastMessage: toast,
        aiThoughtMessage: {
          seatIndex: 0,
          message: `Auto-discarded ${formatCard(cardToDiscard)} (Away)`,
        },
      });
    },

    resetAwayTurnCounter: () => set({ consecutiveMissedTurns: 0 }),
    clearAwayToast: () => set({ awayToastMessage: null }),

    forfeitMatchDueToInactivity: () => {
      safeClearSession();
      try {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      } catch {}

      set({
        isForfeitedDueToInactivity: true,
        consecutiveMissedTurns: 3,
        turnStartedAt: null,
        awayToastMessage: null,
        actionError: null,
      });
    },

    restoreActiveMatchSession: () => {
      const session = safeLoadSession();
      if (!session || !session.gameState || !session.handCards) {
        return false;
      }

      const ageMs = Date.now() - session.savedAt;
      if (ageMs > 24 * 60 * 60 * 1000 || session.gameState.phase === 'MATCH_OVER') {
        safeClearSession();
        return false;
      }

      let missedTurns = session.consecutiveMissedTurns || 0;
      let isForfeited = false;
      let newTurnStartedAt = session.turnStartedAt;

      if (session.gameState.activePlayerIndex === 0 && session.turnStartedAt) {
        const elapsedSec = (Date.now() - session.turnStartedAt) / 1000;
        const awayTurnCount = Math.floor(elapsedSec / 30);
        if (awayTurnCount >= 3 || (missedTurns + awayTurnCount) >= 3) {
          isForfeited = true;
          safeClearSession();
        } else if (awayTurnCount > 0) {
          missedTurns += awayTurnCount;
          newTurnStartedAt = Date.now() - ((elapsedSec % 30) * 1000);
        }
      }

      if (isForfeited) {
        set({
          gameState: session.gameState,
          handCards: session.handCards,
          currentScreen: 'TABLE',
          isForfeitedDueToInactivity: true,
          consecutiveMissedTurns: 3,
          turnStartedAt: null,
        });
        return true;
      }

      set({
        gameState: session.gameState,
        handCards: session.handCards,
        currentScreen: 'TABLE',
        pendingRules: session.pendingRules || { ...DEFAULT_RULES },
        roundHistory: session.roundHistory || [],
        tablePot: session.tablePot || 4000,
        tableBuyIn: session.tableBuyIn || 1000,
        consecutiveMissedTurns: missedTurns,
        turnStartedAt: session.gameState.activePlayerIndex === 0 ? (newTurnStartedAt || Date.now()) : null,
        handAnalysis: analyzeHand(session.handCards),
        isForfeitedDueToInactivity: false,
        roundResolution: null,
        isSlammingFinish: false,
        actionError: null,
      });

      return true;
    },

    clearActiveMatchSession: () => {
      safeClearSession();
    },
  };
});

// Auto-persist match state changes whenever on TABLE screen
useGameStore.subscribe((state) => {
  if (
    state.currentScreen === 'TABLE' &&
    state.gameState &&
    state.gameState.phase !== 'MATCH_OVER' &&
    !state.isForfeitedDueToInactivity
  ) {
    safeSaveSession({
      gameState: state.gameState,
      handCards: state.handCards,
      pendingRules: state.pendingRules,
      roundHistory: state.roundHistory,
      tablePot: state.tablePot,
      tableBuyIn: state.tableBuyIn,
      consecutiveMissedTurns: state.consecutiveMissedTurns,
      turnStartedAt: state.turnStartedAt,
      savedAt: Date.now(),
    });
  } else if (state.currentScreen === 'MODE_SELECT' || state.isForfeitedDueToInactivity) {
    safeClearSession();
  }
});

