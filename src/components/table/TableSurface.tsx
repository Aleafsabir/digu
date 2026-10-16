import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useAITurnController } from '../../hooks/useAITurnController';
import { OpponentHand } from './OpponentHand';
import { StockDiscardArea } from './StockDiscardArea';
import { GinRummyHand } from '../player/GinRummyHand';
import { RoundScoreModal } from '../shared/RoundScoreModal';
import { MatchScoreHistoryModal } from '../shared/MatchScoreHistoryModal';
import { CardFlightOverlay } from '../shared/CardFlightOverlay';
import { useAnimationStore } from '../../store/useAnimationStore';
import { Trophy, Target, Menu, LogOut, RotateCcw, HelpCircle, X, MessageSquare, Smile, Maximize2, Minimize2 } from 'lucide-react';
import { THEME_CONFIGS } from '../../theme/themeConfig';
import { QuickChatModal } from '../shared/QuickChatModal';
import { RulesModal } from '../shared/RulesModal';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ShuffleDeckAnimation } from './ShuffleDeckAnimation';
import { playCardFlickSound, playGinSlamImpactSound } from '../../utils/audioEffects';
import { Card } from '../../core/models/types';

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

  const currentTheme = THEME_CONFIGS[visualTheme || 'sultan'] || THEME_CONFIGS.sultan;

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
    setDealtHumanCardsCount(10);
    setOpeningPhase('idle');
    setIsDealingOpeningAnimation(false);
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
    if (!isHumanTurn || gameState.phase !== 'AWAIT_DRAW' || gameState.stockPile.length === 0) return;
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
  };

  const handleHumanDrawDiscard = async (dropPoint?: { x: number; y: number }) => {
    if (!isHumanTurn || gameState.phase !== 'AWAIT_DRAW' || gameState.discardPile.length === 0) return;
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
    setPendingDiscardCardId(null);
  };

  const handleDiscardSelected = () => {
    if (!isHumanTurn) return;
    if (selectedCardId) {
      handleHumanDiscard(selectedCardId);
    }
  };

  const handleSlamFinish = async () => {
    if (!isHumanTurn) return;
    // If no card is manually selected, automatically target the unmelded deadwood card, or the 11th card
    const deadwoodCard = handAnalysis.deadwood[0];
    const cardIdToSlam =
      selectedCardId || deadwoodCard?.id || (handCards.length === 11 ? handCards[handCards.length - 1].id : null);

    if (!cardIdToSlam) {
      alert('Please tap your 11th card to slam face-down for Gin!');
      return;
    }

    const cardToSlam = handCards.find(c => c.id === cardIdToSlam);
    if (cardToSlam) {
      setPendingDiscardCardId(cardIdToSlam);
      // High arc flight, scaling up, flipping 180° in 3D to slam FACE DOWN into finish slot!
      await startFlight({
        card: cardToSlam,
        fromAnchor: `card-anchor-${cardIdToSlam}`,
        toAnchor: 'anchor-finish-slot',
        isFaceDown: false,
        flipToFaceDown: true,
        isGinSlam: true,
        durationMs: 580,
      });
      setPendingDiscardCardId(null);
    }

    // Thunderous table slam impact audio & heavy physical haptics
    playGinSlamImpactSound();
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Browser fallback
    }

    // Trigger dramatic shockwave & screen shake
    useGameStore.setState({ isSlammingFinish: true });

    // Theatrical pause: let player witness their face-down slammed card, shockwave & GIN SLAM banner before score sheet
    await new Promise(res => setTimeout(res, 1200));

    declareGinWithSlam(cardIdToSlam);
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
            
            {/* Felt Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className={currentTheme.watermarkClass}>
                {currentTheme.watermarkText}
              </span>
            </div>

            {/* Gin Slam Table Felt Shockwave Ripple Animation & Cinematic Splash */}
            {isSlammingFinish && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 overflow-hidden">
                {/* Expanding Fire / Gold Shockwaves */}
                <motion.div
                  initial={{ scale: 0.2, opacity: 1 }}
                  animate={{ scale: [0.2, 3.2], opacity: [1, 0] }}
                  transition={{ duration: 0.85, ease: 'easeOut' }}
                  className="w-52 h-52 rounded-full border-4 border-red-500 shadow-[0_0_80px_rgba(239,68,68,1)]"
                />
                <motion.div
                  initial={{ scale: 0.15, opacity: 0.95 }}
                  animate={{ scale: [0.15, 2.5], opacity: [0.95, 0] }}
                  transition={{ duration: 0.75, delay: 0.08, ease: 'easeOut' }}
                  className="w-48 h-48 rounded-full border-3 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.9)]"
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
                  className="flex flex-col items-center select-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
                >
                  <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 px-6 sm:px-8 py-2 sm:py-2.5 rounded-2xl border-2 border-yellow-300 shadow-[0_0_60px_rgba(239,68,68,0.9)] flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl animate-bounce">⚡</span>
                    <span className="text-xl sm:text-3xl font-black text-white tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-sans-clean whitespace-nowrap">
                      GIN SLAM!
                    </span>
                    <span className="text-2xl sm:text-3xl animate-bounce">⚡</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-amber-200 tracking-widest mt-1 bg-black/90 px-3.5 py-0.5 rounded-full border border-amber-400/70 font-mono shadow-md">
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
                    className="absolute left-0 top-full mt-1.5 z-40 bg-[#02140D]/95 border border-[#05D59A]/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer animate-bounce"
                  >
                    <span>Tap ⛶ for Fullscreen</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullscreenHint(false);
                      }}
                      className="text-slate-400 hover:text-white ml-0.5"
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
                  className="absolute -top-7 z-40 bg-black/85 hover:bg-black text-slate-300 hover:text-white border border-slate-700/80 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer font-sans-clean animate-in fade-in duration-300"
                >
                  <span>Dealing...</span>
                  <span className="text-[#05D59A]">Skip ⏩</span>
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

            {/* Bottom Felt: Active Player Hand (Gin Rummy Plus Fanned Hand + Bottom Carved Console) */}
            {humanPlayer && (
              <div className="w-full shrink-0 z-20 mt-auto pb-[max(14px,calc(env(safe-area-inset-bottom)+8px))]">
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

            {/* Floating Quick Chat & Emoji Triggers (Bottom Corners with Safe Areas) */}
            <div
              className="absolute z-30 pointer-events-auto"
              style={{
                left: 'max(12px, env(safe-area-inset-left))',
                bottom: 'max(18px, calc(env(safe-area-inset-bottom) + 8px))',
              }}
            >
              <button
                onClick={() => {
                  setQuickChatTab('chat');
                  setShowQuickChat(true);
                }}
                title="Quick Chat"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#02140D]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-300 shadow-xl flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer group"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div
              className="absolute z-30 pointer-events-auto"
              style={{
                right: 'max(12px, env(safe-area-inset-right))',
                bottom: 'max(18px, calc(env(safe-area-inset-bottom) + 8px))',
              }}
            >
              <button
                onClick={() => {
                  setQuickChatTab('emoji');
                  setShowQuickChat(true);
                }}
                title="Emojis"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#02140D]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-300 shadow-xl flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer group"
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

      {/* 5. In-Game Match Pause Menu */}
      {showInGameMenu && (
        <div
          onClick={() => setShowInGameMenu(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto font-sans-clean"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-slate-700 rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xs sm:max-w-sm w-full my-auto animate-in zoom-in-95 text-center"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-950 pb-2.5 mb-3.5">
              <span className="font-black text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                <Menu className="w-4 h-4 text-emerald-400" /> Match Menu
              </span>
              <button
                onClick={() => setShowInGameMenu(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Close match menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Action */}
            <button
              onClick={() => setShowInGameMenu(false)}
              className="btn-3d-platinum w-full py-2.5 rounded-xl uppercase tracking-wider text-xs font-black cursor-pointer shadow-md mb-2.5"
            >
              Resume
            </button>

            {/* 4-Action Secondary Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setShowInGameMenu(false);
                  setShowRules(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#010D08] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <HelpCircle className="w-4 h-4 text-slate-300 shrink-0" />
                <span>Rules</span>
              </button>
              <button
                onClick={() => {
                  setShowInGameMenu(false);
                  setShowScoreHistory(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#010D08] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <Target className="w-4 h-4 text-slate-300 shrink-0" />
                <span>Scorecard</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Restart this match from the beginning?')) {
                    resetMatch();
                    setShowInGameMenu(false);
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-[#010D08] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <RotateCcw className="w-4 h-4 text-slate-300 shrink-0" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Exit match and return to the main lobby?')) {
                    exitToLobby();
                    setShowInGameMenu(false);
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-800/60 font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
