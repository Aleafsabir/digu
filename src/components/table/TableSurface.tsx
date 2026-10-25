import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useAITurnController } from '../../hooks/useAITurnController';
import { OpponentHand } from './OpponentHand';
import { StockDiscardArea } from './StockDiscardArea';
import { GinRummyHand } from '../player/GinRummyHand';
import { RoundScoreModal } from '../shared/RoundScoreModal';
import { MatchScoreHistoryModal } from '../shared/MatchScoreHistoryModal';
import { InGameSettingsModal } from '../shared/InGameSettingsModal';
import { CardFlightOverlay } from '../shared/CardFlightOverlay';
import { useAnimationStore } from '../../store/useAnimationStore';
import { Trophy, Menu, MessageSquare, Smile, Maximize2, Minimize2 } from 'lucide-react';
import { THEME_CONFIGS } from '../../theme/themeConfig';
import { QuickChatModal } from '../shared/QuickChatModal';
import { RulesModal } from '../shared/RulesModal';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ShuffleDeckAnimation } from './ShuffleDeckAnimation';
import {
  playCardFlickSound,
  playGinSlamImpactSound,
  playCardDrawSound,
  playDiscardPickupSound,
  playCardDiscardThud,
  primeAudioContext,
} from '../../utils/audioEffects';
import { Card } from '../../core/models/types';
import { TeamHandOptimizer } from '../../core/engine/solver';

export const TableSurface: React.FC = () => {
  // Mount autonomous AI turn engine
  useAITurnController();

  const startFlight = useAnimationStore(state => state.startFlight);

  const {
    gameState,
    handCards,
    selectedCardId,
    sortMode,
    handAnalysis,
    roundResolution,
    roundHistory,
    tablePot,
    isSlammingFinish,
    aiThoughtMessage,
    visualTheme,
    triggerReaction,
    playerReactions,
    drawFromStock,
    drawFromDiscard,
    selectCard,
    discardCard,
    sortHand,
    reorderHand,
    moveCardInHand,
    declareGinWithSlam,
    initiateReshuffleFromDiscards,
    nextRound,
    resetMatch,
    exitToLobby,
    isDealingOpeningAnimation,
    setIsDealingOpeningAnimation,
  } = useGameStore();

  const currentTheme = THEME_CONFIGS[visualTheme || 'tournoi'] || THEME_CONFIGS.tournoi;

  // In VS AI mode, Seat 0 is always the Human player
  const humanPlayer = gameState.players[0];
  const isHumanTurn = gameState.activePlayerIndex === 0;
  const isActionPhase = gameState.phase === 'AWAIT_ACTION' && isHumanTurn;

  const [showScoreHistory, setShowScoreHistory] = useState(false);
  const [showInGameMenu, setShowInGameMenu] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [quickChatTab, setQuickChatTab] = useState<'chat' | 'emoji'>('chat');
  const [pendingDiscardCardId, setPendingDiscardCardId] = useState<string | null>(null);
  const [dragHoverPoint, setDragHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    return isIOS && !isStandalone;
  });
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (isFs) setShowFullscreenHint(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    const timer = setTimeout(() => {
      setShowFullscreenHint(false);
    }, 6000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      clearTimeout(timer);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      setShowFullscreenHint(false);
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  // Opening Deal & 3D Shuffle Animation State
  const [openingPhase, setOpeningPhase] = useState<'shuffle' | 'dealing' | 'idle'>('idle');
  const [dealtHumanCardsCount, setDealtHumanCardsCount] = useState<number>(10);

  useEffect(() => {
    if (isDealingOpeningAnimation) {
      setOpeningPhase('shuffle');
      setDealtHumanCardsCount(0);
    } else {
      setOpeningPhase('idle');
      setDealtHumanCardsCount(handCards.length);
    }
  }, [isDealingOpeningAnimation, handCards.length]);

  const skipDealRef = useRef(false);

  const handleShuffleComplete = () => {
    setOpeningPhase('dealing');
    skipDealRef.current = false;
    runClockwiseDealAnimation();
  };

  const runClockwiseDealAnimation = async () => {
    try {
      const numPlayers = gameState.players.length;
      const leadIndex = (gameState.dealerIndex - 1 + numPlayers) % numPlayers;

      const dealSequence: number[] = [];
      for (let pass = 0; pass < 10; pass++) {
        for (let i = 0; i < numPlayers; i++) {
          dealSequence.push((leadIndex + i) % numPlayers);
        }
      }

      let humanCardsReceived = 0;

      for (let i = 0; i < dealSequence.length; i++) {
        if (skipDealRef.current) break;

        const seat = dealSequence[i];
        const isHumanSeat = seat === 0;

        playCardFlickSound();
        try {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        } catch {}

        const toAnchor = `anchor-seat-${seat}`;
        const flightCard: Card = isHumanSeat && handCards[humanCardsReceived]
          ? handCards[humanCardsReceived]
          : { id: `deal-flight-${i}`, suit: 'SPADES', rank: 1, isFaceDown: true };

        startFlight({
          card: flightCard,
          fromAnchor: 'anchor-stock-pile',
          toAnchor,
          isFaceDown: true,
          flipToFaceUp: isHumanSeat,
          durationMs: 360,
          onComplete: () => {
            if (isHumanSeat) {
              setDealtHumanCardsCount(prev => Math.min(10, prev + 1));
            }
          },
        });

        if (isHumanSeat) {
          humanCardsReceived++;
        }

        await new Promise(res => setTimeout(res, 190));
      }

      await new Promise(res => setTimeout(res, 450));
    } catch (err) {
      console.warn('Clockwise deal animation error:', err);
    } finally {
      setDealtHumanCardsCount(10);
      setOpeningPhase('idle');
      setIsDealingOpeningAnimation(false);
    }
  };

  const humanReaction = playerReactions[0];

  const calculateHandTargetIndex = (clientX: number): number => {
    if (!handCards.length) return 0;
    for (let i = 0; i < handCards.length; i++) {
      const el = document.getElementById(`card-anchor-${handCards[i].id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (clientX < midX) {
          return i;
        }
      }
    }
    return handCards.length;
  };

  const handleDragDrawHover = (point: { x: number; y: number } | null) => {
    if (!point || point.y < window.innerHeight * 0.45) {
      setDragHoverPoint(null);
    } else {
      setDragHoverPoint(point);
    }
  };

  const hoverInsertIndex = dragHoverPoint ? calculateHandTargetIndex(dragHoverPoint.x) : null;

  const handleHumanDrawStock = async (dropPoint?: { x: number; y: number }) => {
    if (!isHumanTurn) {
      useGameStore.setState({ actionError: "Please wait for your opponent's turn." });
      return;
    }
    if (gameState.phase !== 'AWAIT_DRAW' || gameState.stockPile.length === 0 || handCards.length >= 11) return;
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;

    try {
      const topCard = gameState.stockPile[gameState.stockPile.length - 1];

      const targetIndex = dropPoint ? calculateHandTargetIndex(dropPoint.x) : handCards.length;
      let toPoint: { x: number; y: number } | undefined;
      let toAnchor = 'anchor-seat-0-draw-slot';

      if (dropPoint && targetIndex < handCards.length) {
        const targetCard = handCards[targetIndex];
        const targetEl = document.getElementById(`card-anchor-${targetCard.id}`);
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          toPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }

      setDragHoverPoint(null);
      playCardDrawSound();

      await startFlight({
        card: topCard,
        fromPoint: dropPoint,
        fromAnchor: dropPoint ? undefined : 'anchor-stock-pile',
        toPoint,
        toAnchor,
        isFaceDown: true,
        flipToFaceUp: true,
        durationMs: dropPoint ? 280 : 540,
      });
      drawFromStock(targetIndex);
    } finally {
      isDrawingRef.current = false;
    }
  };

  const handleHumanDrawDiscard = async (dropPoint?: { x: number; y: number }) => {
    if (!isHumanTurn) {
      useGameStore.setState({ actionError: "Please wait for your opponent's turn." });
      return;
    }
    if (gameState.phase !== 'AWAIT_DRAW' || gameState.discardPile.length === 0 || handCards.length >= 11) return;
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;

    try {
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];

      const targetIndex = dropPoint ? calculateHandTargetIndex(dropPoint.x) : handCards.length;
      let toPoint: { x: number; y: number } | undefined;
      let toAnchor = 'anchor-seat-0-draw-slot';

      if (dropPoint && targetIndex < handCards.length) {
        const targetCard = handCards[targetIndex];
        const targetEl = document.getElementById(`card-anchor-${targetCard.id}`);
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          toPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }

      setDragHoverPoint(null);
      playDiscardPickupSound();

      await startFlight({
        card: topCard,
        fromPoint: dropPoint,
        fromAnchor: dropPoint ? undefined : 'anchor-discard-pile',
        toPoint,
        toAnchor,
        isFaceDown: false,
        flipToFaceUp: false,
        durationMs: dropPoint ? 260 : 500,
      });
      drawFromDiscard(targetIndex);
    } finally {
      isDrawingRef.current = false;
    }
  };

  const handleInitiateReshuffle = async () => {
    if (!isHumanTurn || gameState.phase !== 'AWAIT_DRAW' || gameState.stockPile.length > 0) return;
    if (gameState.discardPile.length === 0) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Browser fallback
    }

    const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
    if (topDiscard) {
      await startFlight({
        card: topDiscard,
        fromAnchor: 'anchor-discard-pile',
        toAnchor: 'anchor-stock-pile',
        isFaceDown: false,
        flipToFaceUp: false,
        durationMs: 440,
      });
    }

    initiateReshuffleFromDiscards();
  };

  const handleHumanDiscard = async (cardId: string, fromPoint?: { x: number; y: number }) => {
    if (!isHumanTurn || gameState.phase !== 'AWAIT_ACTION') return;
    const cardToDiscard = handCards.find(c => c.id === cardId);
    if (!cardToDiscard) return;

    // Check if player dragged toward the GIN Pad (left of table) and this card completes Gin
    if (handAnalysis.isGinReady && handAnalysis.validGinFinishCardIds.includes(cardId)) {
      if (fromPoint && fromPoint.x < window.innerWidth * 0.45) {
        handleSlamFinish(cardId, fromPoint);
        return;
      }
    }

    // Immediately hide the card from the player tray to prevent duplicate glitch or snap-back
    setPendingDiscardCardId(cardId);

    await startFlight({
      card: cardToDiscard,
      fromAnchor: fromPoint ? undefined : `card-anchor-${cardId}`,
      fromPoint,
      toAnchor: 'anchor-discard-pile',
      isFaceDown: false,
      flipToFaceUp: false,
      durationMs: fromPoint ? 440 : 480,
    });
    discardCard(cardId);
    playCardDiscardThud();
    setPendingDiscardCardId(null);
  };

  const handleDiscardSelected = () => {
    if (!isHumanTurn) return;
    if (selectedCardId) {
      handleHumanDiscard(selectedCardId);
    }
  };

  const handleSlamFinish = async (targetCardId?: string, fromPoint?: { x: number; y: number }) => {
    if (!isHumanTurn) return;
    // Prime audio context synchronously on the user gesture
    primeAudioContext();

    // Bulletproof finish card resolution: guarantees meld integrity
    const preferredId = targetCardId || selectedCardId;
    const cardIdToSlam =
      TeamHandOptimizer.resolveGinFinishCardId(handCards, preferredId) ||
      handAnalysis.deadwood[0]?.id ||
      (handCards.length === 11 ? handCards[handCards.length - 1].id : null);

    if (!cardIdToSlam) {
      useGameStore.setState({ actionError: 'Cannot declare Gin: Hand does not form valid melds.' });
      return;
    }

    const cardToSlam = handCards.find(c => c.id === cardIdToSlam);
    if (!cardToSlam) return;

    // 1. Hide from hand during flight to avoid duplication
    setPendingDiscardCardId(cardIdToSlam);

    // 2. High arc flight, scaling up, flipping 180° in 3D to slam FACE DOWN into finish slot!
    // Directly flights from drop point if dragged, or from hand tray if tapped
    await startFlight({
      card: cardToSlam,
      fromPoint: fromPoint,
      fromAnchor: fromPoint ? undefined : `card-anchor-${cardIdToSlam}`,
      toAnchor: 'center-slam-slot',
      isFaceDown: false,
      flipToFaceDown: true,
      isGinSlam: true,
      durationMs: fromPoint ? 380 : 560,
    });

    // 3. Immediately render the slammed card face-down in the tabletop finish slot upon arrival (NO SNAP-BACK)
    const slammedCard: Card = { ...cardToSlam, isFaceDown: true };
    useGameStore.setState(state => ({
      gameState: {
        ...state.gameState,
        finishSlotCard: slammedCard,
      },
      isSlammingFinish: true,
    }));

    // 4. Thunderous table slam impact audio & heavy physical haptics
    playGinSlamImpactSound();
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Browser fallback
    }

    // 5. Theatrical pause: let player witness their face-down slammed card, shockwaves & GIN SLAM banner before score sheet
    await new Promise(res => setTimeout(res, 1200));

    // 6. Officially resolve the round and clear pending discard
    declareGinWithSlam(cardIdToSlam);
    setPendingDiscardCardId(null);
  };

  // Team scores calculation if in team mode
  const teamAScore = gameState.players
    .filter(p => p.teamId === 'TEAM_A')
    .reduce((sum, p) => sum + p.cumulativeScore, 0);

  const teamBScore = gameState.players
    .filter(p => p.teamId === 'TEAM_B')
    .reduce((sum, p) => sum + p.cumulativeScore, 0);

  // Top rim seating layout:
  // In normal play, show all other seats (Seats 1..N - Bots/Opponents/Partner).
  // During SCATTER_CUT: displays all players so all cut cards can be compared.
  const isScatterCut = gameState.phase === 'SCATTER_CUT';
  const displayedSeats = isScatterCut
    ? gameState.players.map((p, idx) => ({ player: p, index: idx }))
    : gameState.players
        .map((p, idx) => ({ player: p, index: idx }))
        .filter(({ index }) => index !== 0);

  return (
    <div className="w-full h-full flex-1 flex flex-col justify-between min-h-0 overflow-hidden select-none">
      {/* Visual Flying Card Trajectory Animation Layer */}
      <CardFlightOverlay />

      {/* 1. Main 3D Perspective Stadium Card Table (Full Bleed Edge-to-Edge) */}
      <div
        className={`relative w-full h-full flex-1 rounded-none sm:rounded-[28px] p-0.5 sm:p-2 flex flex-col justify-between transition-all duration-300 overflow-hidden min-h-0 ${currentTheme.tableWrapperClass} ${
          isSlammingFinish ? 'anim-slam-shake scale-[1.01] shadow-[0_0_60px_rgba(220,38,38,0.85)]' : ''
        }`}
      >
        {/* Inner Beveled Rim */}
        <div className={`w-full h-full rounded-none sm:rounded-[22px] p-0.5 sm:p-1 flex flex-col justify-between relative min-h-0 overflow-hidden ${currentTheme.tableBevelClass}`}>
          
          {/* Inner Felt Surface with Theme Texture */}
          <div className={`w-full h-full rounded-none sm:rounded-[18px] p-1 sm:p-2 relative flex flex-col justify-between overflow-hidden min-h-0 ${currentTheme.tableFeltClass} ${currentTheme.feltTextureClass}`}>
            
            {/* Felt Watermark (Pure Vector Maldivian Liyelaa Jehun Medallion) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <div className="relative flex items-center justify-center opacity-18 w-72 h-72 sm:w-96 sm:h-96">
                <svg className="w-full h-full text-[#E5C378]" viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="100" cy="100" r="82" stroke="#c84b31" strokeWidth="2" opacity="0.6" />
                  <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="1" />
                  <circle cx="100" cy="100" r="58" stroke="#c84b31" strokeWidth="1.5" strokeDasharray="6 3" />
                  <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="1" />
                  <g stroke="currentColor" strokeWidth="0.75" opacity="0.5">
                    <line x1="100" y1="8" x2="100" y2="35" />
                    <line x1="100" y1="165" x2="100" y2="192" />
                    <line x1="8" y1="100" x2="35" y2="100" />
                    <line x1="165" y1="100" x2="192" y2="100" />
                    <line x1="35" y1="35" x2="54" y2="54" />
                    <line x1="146" y1="146" x2="165" y2="165" />
                    <line x1="165" y1="35" x2="146" y2="54" />
                    <line x1="35" y1="165" x2="54" y2="146" />
                  </g>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-thaana text-6xl sm:text-8xl font-black text-[#E5C378] drop-shadow-[0_2px_12px_rgba(229,195,120,0.5)]">
                    ޑ
                  </span>
                  <span className="font-sans-clean text-[10px] sm:text-xs font-black tracking-[0.3em] text-[#e5c378] uppercase -mt-2">
                    DIGU
                  </span>
                </div>
              </div>
            </div>

            {/* Gin Slam Table Felt Shockwave Ripple Animation & Cinematic Splash */}
            {isSlammingFinish && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 overflow-hidden">
                {/* Expanding Fire / Gold Shockwaves */}
                <motion.div
                  initial={{ scale: 0.2, opacity: 1 }}
                  animate={{ scale: [0.2, 3.2], opacity: [1, 0] }}
                  transition={{ duration: 0.85, ease: 'easeOut' }}
                  className="w-52 h-52 rounded-full border-4 border-[#c84b31] shadow-[0_0_80px_rgba(200,75,49,1)]"
                />
                <motion.div
                  initial={{ scale: 0.15, opacity: 0.95 }}
                  animate={{ scale: [0.15, 2.5], opacity: [0.95, 0] }}
                  transition={{ duration: 0.75, delay: 0.08, ease: 'easeOut' }}
                  className="w-48 h-48 rounded-full border-3 border-[#E5C378] shadow-[0_0_60px_rgba(229,195,120,0.9)]"
                />
                <motion.div
                  initial={{ scale: 0.1, opacity: 0.9 }}
                  animate={{ scale: [0.1, 1.8], opacity: [0.9, 0] }}
                  transition={{ duration: 0.65, delay: 0.16, ease: 'easeOut' }}
                  className="w-40 h-40 rounded-full border-2 border-white"
                />

                {/* Cinematic Center Splash Banner */}
                <motion.div
                  initial={{ scale: 0.2, opacity: 0, y: 30 }}
                  animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 1], y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="flex flex-col items-center select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)]"
                >
                  <div className="bg-gradient-to-r from-[#170b09] via-[#c84b31] to-[#170b09] px-6 sm:px-8 py-2 sm:py-2.5 rounded-2xl border-2 border-[#E5C378] shadow-[0_0_60px_rgba(200,75,49,0.9)] flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl animate-bounce">⚡</span>
                    <div className="flex items-center gap-2">
                      <span className="font-thaana text-3xl sm:text-4xl font-black text-[#E5C378] drop-shadow-[0_2px_10px_rgba(229,195,120,0.8)]">
                        ޑިގު!
                      </span>
                      <span className="text-xl sm:text-3xl font-black text-[#f7f0ea] tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] font-sans-clean whitespace-nowrap">
                        GIN SLAM!
                      </span>
                    </div>
                    <span className="text-2xl sm:text-3xl animate-bounce">⚡</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-[#E5C378] tracking-widest mt-1 bg-black/90 px-3.5 py-0.5 rounded-full border border-[#E5C378]/70 font-mono shadow-md">
                    ★ FACE-DOWN FINISH ★
                  </span>
                </motion.div>
              </div>
            )}

            {/* Top Table Rim: In-game Menu + Opponent Seats + Mode Pill */}
            <div
              className="relative flex items-center justify-between z-20 w-full mb-0.5 shrink-0 px-2 sm:px-4 gap-2 pt-1"
              style={{
                paddingLeft: 'max(10px, env(safe-area-inset-left))',
                paddingRight: 'max(10px, env(safe-area-inset-right))',
                paddingTop: 'max(4px, env(safe-area-inset-top))',
              }}
            >
              {/* Top-Left: Menu/Pause Button (Pure Icon) + Fullscreen Toggle */}
              <div className="flex items-center gap-1.5 shrink-0 relative">
                <button
                  onClick={() => setShowInGameMenu(true)}
                  title="Match Menu"
                  className={`p-2 rounded-xl flex items-center justify-center transition shadow active:scale-95 cursor-pointer shrink-0 ${currentTheme.menuButtonClass}`}
                >
                  <Menu className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  className={`p-2 rounded-xl flex items-center justify-center transition shadow active:scale-95 cursor-pointer shrink-0 ${currentTheme.menuButtonClass}`}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {showFullscreenHint && (
                  <div
                    onClick={toggleFullscreen}
                    className="absolute left-0 top-full mt-1.5 z-40 bg-[#170b09]/95 border border-[#e5c378]/60 text-[#f7f0ea] text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer animate-bounce"
                  >
                    <span>Tap ⛶ for Fullscreen</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullscreenHint(false);
                      }}
                      className="text-[#e5c378]/60 hover:text-white ml-0.5"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Center: Opponent Avatar Chips */}
              <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6">
                {displayedSeats.map(({ player, index }) => (
                  <OpponentHand
                    key={player.id}
                    player={player}
                    isActiveTurn={index === gameState.activePlayerIndex}
                    isDealer={index === gameState.dealerIndex}
                    phase={gameState.phase}
                    thoughtMessage={aiThoughtMessage?.seatIndex === index ? aiThoughtMessage.message : null}
                  />
                ))}
              </div>

              {/* Top-Right: Table Pot & Score Trophy Chip */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow ${currentTheme.hudPillClass}`}
                  title="Total Table Pot"
                >
                  <span className="text-xs">🪙</span>
                  <span className="font-mono text-xs font-black text-[#F1F5F9]">
                    {(tablePot || 4000).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => setShowScoreHistory(true)}
                  title="Tap to view match scores"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow active:scale-95 cursor-pointer ${currentTheme.hudPillClass}`}
                >
                  <Trophy className="w-4 h-4 text-slate-300 shrink-0" />
                  {gameState.rules.mode === 'TEAM_4P' ? (
                    <span className="font-mono text-xs font-black flex items-center gap-1">
                      <span className="text-[#F1F5F9]">A:{teamAScore}</span>
                      <span className="opacity-40">|</span>
                      <span className="text-rose-300">B:{teamBScore}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-black text-[#F1F5F9]">
                      {gameState.rules.targetScore}p
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Center Felt Play Arena (Clean, Focused, Zero Text Clutter) */}
            <div className="flex items-center justify-center my-auto z-10 px-2 shrink-0 relative">
              {openingPhase === 'dealing' && (
                <button
                  onClick={() => { skipDealRef.current = true; }}
                  className="absolute -top-7 z-40 bg-[#0d0605]/90 hover:bg-[#170b09] text-[#f7f0ea]/80 hover:text-white border border-[#301a14] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer font-sans-clean animate-in fade-in duration-300"
                >
                  <span>Dealing...</span>
                  <span className="text-[#e5c378]">Skip ⏩</span>
                </button>
              )}
              {openingPhase === 'shuffle' ? (
                <ShuffleDeckAnimation onComplete={handleShuffleComplete} />
              ) : (
                <StockDiscardArea
                  stockPile={gameState.stockPile}
                  discardPile={gameState.discardPile}
                  finishSlotCard={gameState.finishSlotCard}
                  phase={gameState.phase}
                  isHumanTurn={isHumanTurn}
                  onDrawStock={handleHumanDrawStock}
                  onDrawDiscard={handleHumanDrawDiscard}
                  onDiscardSelected={handleDiscardSelected}
                  onSlamFinish={handleSlamFinish}
                  onDragDrawHover={handleDragDrawHover}
                  onInitiateReshuffle={handleInitiateReshuffle}
                />
              )}
            </div>

            {/* Bottom Felt: Active Player Hand (70% Tucked Seamless Edge Bleed) */}
            {humanPlayer && (
              <div className="w-full shrink-0 z-20 mt-auto pb-0 overflow-visible">
                <GinRummyHand
                  player={humanPlayer}
                  handCards={
                    isDealingOpeningAnimation
                      ? handCards.slice(0, dealtHumanCardsCount)
                      : handCards
                  }
                  selectedCardId={selectedCardId}
                  sortMode={sortMode}
                  handAnalysis={handAnalysis}
                  isActionPhase={isActionPhase}
                  onCardClick={selectCard}
                  onReorderHand={reorderHand}
                  onSortHand={sortHand}
                  onMoveCard={moveCardInHand}
                  onDiscardCard={handleHumanDiscard}
                  onDiscardSelected={handleDiscardSelected}
                  onSlamFinish={handleSlamFinish}
                  hiddenCardId={pendingDiscardCardId}
                  draggedDrawIndex={hoverInsertIndex}
                />
              </div>
            )}

            {/* South Seat (Human) Reaction Bubble */}
            {humanReaction && (
              <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in duration-200">
                <div className="bg-[#12161a]/95 backdrop-blur-md text-white border-0 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-2">
                  {humanReaction.emoji && (
                    <span className="text-2xl animate-bounce">{humanReaction.emoji}</span>
                  )}
                  {humanReaction.text && (
                    <span className="text-xs font-bold text-amber-200 whitespace-nowrap">
                      {humanReaction.text}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Mid-Table Ergonomic Thumb Rails: Quick Chat (West Rail) & Reaction Emojis (East Rail) */}
            <div
              className="absolute z-30 pointer-events-auto"
              style={{
                left: 'max(12px, env(safe-area-inset-left))',
                bottom: 'clamp(90px, 34%, 150px)',
              }}
            >
              <button
                onClick={() => {
                  setQuickChatTab('chat');
                  setShowQuickChat(true);
                }}
                title="Quick Chat"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#170b09]/95 hover:bg-[#301a14] backdrop-blur-md border-1.5 border-[#301a14] hover:border-[#e5c378] text-[#e5c378] shadow-xl flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer group"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div
              className="absolute z-30 pointer-events-auto"
              style={{
                right: 'max(12px, env(safe-area-inset-right))',
                bottom: 'clamp(90px, 34%, 150px)',
              }}
            >
              <button
                onClick={() => {
                  setQuickChatTab('emoji');
                  setShowQuickChat(true);
                }}
                title="Emojis"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#170b09]/95 hover:bg-[#301a14] backdrop-blur-md border-1.5 border-[#301a14] hover:border-[#e5c378] text-[#e5c378] shadow-xl flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer group"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Round End Score Sheet Modal */}
      {roundResolution && (
        <ErrorBoundary>
          <RoundScoreModal
            resolution={roundResolution}
            onNextRound={nextRound}
            onResetMatch={resetMatch}
          />
        </ErrorBoundary>
      )}

      {/* 4. Match Scorecard & Round History Modal (Triggered by clicking Scorecard Placard) */}
      {showScoreHistory && (
        <MatchScoreHistoryModal
          gameState={gameState}
          roundHistory={roundHistory}
          onClose={() => setShowScoreHistory(false)}
        />
      )}

      {/* 5. In-Game Match Settings HUD Modal */}
      <InGameSettingsModal
        isOpen={showInGameMenu}
        onClose={() => setShowInGameMenu(false)}
        onOpenRules={() => setShowRules(true)}
        onOpenScorecard={() => setShowScoreHistory(true)}
        onRestartMatch={resetMatch}
        onExitMatch={exitToLobby}
      />

      {/* 6. In-Game Rules Cheat Sheet Modal (Graphic Formulas, Zero Paragraphs) */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* 7. Quick Chat & Emoji Popover Modal */}
      <QuickChatModal
        isOpen={showQuickChat}
        initialTab={quickChatTab}
        onClose={() => setShowQuickChat(false)}
        onSendReaction={(text, emoji) => triggerReaction(0, text, emoji)}
      />
    </div>
  );
};
