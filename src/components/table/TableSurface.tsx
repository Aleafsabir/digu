import React, { useState } from 'react';
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
import { Trophy, Target, Menu, LogOut, RotateCcw, HelpCircle, X, Palette, MessageSquare, Smile, Layers } from 'lucide-react';
import { THEME_CONFIGS } from '../../theme/themeConfig';
import { DECK_DESIGNS } from '../../config/deckConfig';
import { QuickChatModal } from '../shared/QuickChatModal';
import { RulesModal } from '../shared/RulesModal';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
    setVisualTheme,
    activeDeck,
    setActiveDeck,
    triggerReaction,
    playerReactions,
    startScatterCut,
    dealRound,
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

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Browser fallback
    }

    const cardToSlam = handCards.find(c => c.id === cardIdToSlam);
    if (cardToSlam) {
      setPendingDiscardCardId(cardIdToSlam);
      await startFlight({
        card: cardToSlam,
        fromAnchor: `card-anchor-${cardIdToSlam}`,
        toAnchor: 'anchor-discard-pile',
        isFaceDown: false,
        flipToFaceUp: false,
        durationMs: 520,
      });
      setPendingDiscardCardId(null);
    }
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
          isSlammingFinish ? 'anim-shake scale-[1.01] shadow-[0_0_50px_rgba(220,38,38,0.7)]' : ''
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

            {/* Gin Slam Table Felt Shockwave Ripple Animation */}
            {isSlammingFinish && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <motion.div
                  initial={{ scale: 0.3, opacity: 1 }}
                  animate={{ scale: [0.3, 2.5], opacity: [1, 0] }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                  className="w-44 h-44 rounded-full border-4 border-red-500 shadow-[0_0_60px_rgba(220,38,38,0.95)]"
                />
                <motion.div
                  initial={{ scale: 0.2, opacity: 0.9 }}
                  animate={{ scale: [0.2, 1.9], opacity: [0.9, 0] }}
                  transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
                  className="w-44 h-44 rounded-full border-2 border-red-400"
                />
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
              {/* Top-Left: Menu/Pause Button (Pure Icon) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowInGameMenu(true)}
                  title="Match Menu"
                  className={`p-2 rounded-xl flex items-center justify-center transition shadow active:scale-95 cursor-pointer shrink-0 ${currentTheme.menuButtonClass}`}
                >
                  <Menu className="w-4 h-4" />
                </button>
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
            <div className="flex items-center justify-center my-auto z-10 px-2 shrink-0">
              <StockDiscardArea
                stockPile={gameState.stockPile}
                discardPile={gameState.discardPile}
                phase={gameState.phase}
                isHumanTurn={isHumanTurn}
                onDrawStock={handleHumanDrawStock}
                onDrawDiscard={handleHumanDrawDiscard}
                onDiscardSelected={handleDiscardSelected}
                onSlamFinish={handleSlamFinish}
                onDragDrawHover={handleDragDrawHover}
                onInitiateReshuffle={handleInitiateReshuffle}
              />
            </div>

            {/* Bottom Felt: Active Player Hand (Gin Rummy Plus Fanned Hand + Bottom Carved Console) */}
            {humanPlayer && (
              <div className="w-full shrink-0 z-20 mt-auto">
                <GinRummyHand
                  player={humanPlayer}
                  handCards={handCards}
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
                bottom: 'max(12px, env(safe-area-inset-bottom))',
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
                bottom: 'max(12px, env(safe-area-inset-bottom))',
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

            {/* Pre-Game High-Card Scatter Cut Banner */}
            {gameState.phase === 'SCATTER_CUT' && (
              <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
                <div className="bg-[#02140D] border-2 border-slate-700 rounded-3xl p-5 text-center shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xs w-full animate-in zoom-in-95 font-sans-clean">
                  <div className="text-3xl mb-1">✂️</div>
                  <h4 className="font-black text-sm text-white mb-3 uppercase tracking-wider">
                    High-Card Cut for Dealer
                  </h4>
                  <button
                    onClick={startScatterCut}
                    className="btn-3d-platinum w-full py-2.5 px-6 rounded-2xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Cut Cards
                  </button>
                </div>
              </div>
            )}

            {/* Deal Round Hands Banner */}
            {gameState.phase === 'ROUND_DEALING' && (
              <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
                <div className="bg-[#02140D] border-2 border-slate-700 rounded-3xl p-5 text-center shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xs w-full animate-in zoom-in-95 font-sans-clean">
                  <div className="text-3xl mb-1">🎴</div>
                  <h4 className="font-black text-sm text-[#05D59A] mb-1">
                    Seat {gameState.dealerIndex} Deals
                  </h4>
                  <div className="text-[11px] text-slate-300 mb-3">
                    Lead: <strong className="text-[#F1F5F9]">Seat {(gameState.dealerIndex - 1 + gameState.players.length) % gameState.players.length}</strong>
                  </div>
                  <button
                    onClick={dealRound}
                    className="btn-3d-platinum w-full py-2.5 px-6 rounded-2xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Deal Round
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Round End Score Sheet Modal */}
      {roundResolution && (
        <RoundScoreModal
          resolution={roundResolution}
          onNextRound={nextRound}
          onResetMatch={resetMatch}
        />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-[#02140D] border-2 border-slate-700 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xs w-full animate-in zoom-in-95 text-center font-sans-clean">
            <div className="flex justify-between items-center border-b border-emerald-950 pb-2 mb-4">
              <span className="font-black text-xs text-white uppercase tracking-wider">
                Match Menu
              </span>
              <button
                onClick={() => setShowInGameMenu(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Deck Artwork Selector */}
            <div className="p-2.5 rounded-2xl bg-[#031B11] border border-slate-800 space-y-1.5 text-left mb-2 shadow-md">
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-300" /> Deck Artwork
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                  {DECK_DESIGNS[activeDeck || 'burgundy_gold'].name}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {(['burgundy_gold', 'sapphire_lattice', 'maldivian_lacquer'] as const).map(dKey => {
                  const dCfg = DECK_DESIGNS[dKey];
                  const isSelected = (activeDeck || 'burgundy_gold') === dKey;
                  return (
                    <button
                      key={dKey}
                      onClick={() => setActiveDeck(dKey)}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-200 text-stone-950 border-white font-black shadow-md'
                          : 'bg-[#02140D] hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-black leading-tight">
                          {dCfg.name}
                        </div>
                        <div className="text-[9px] opacity-75">{dCfg.description}</div>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 font-bold ml-2 shrink-0">
                        {dCfg.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme / Visual Style Selector */}
            <div className="p-2.5 rounded-2xl bg-[#031B11] border border-slate-800 space-y-1.5 text-left mb-3 shadow-md">
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-300" /> Visual Style
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                  {currentTheme.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(['tournoi', 'sultan', 'holhuashi', 'risograph', 'nocturne', 'swiss'] as const).map(tKey => {
                  const t = THEME_CONFIGS[tKey];
                  const isSelected = (visualTheme || 'tournoi') === tKey;
                  return (
                    <button
                      key={tKey}
                      onClick={() => setVisualTheme(tKey)}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-slate-200 text-stone-950 border-white font-black shadow-md'
                          : 'bg-[#02140D] hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-black leading-tight flex items-center justify-between">
                        <span>{t.name}</span>
                        <span className="text-[8px] opacity-75">{t.badge}</span>
                      </div>
                      <div className="text-[9px] opacity-75 truncate mt-0.5">{t.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => setShowInGameMenu(false)}
                className="btn-3d-platinum w-full py-2.5 rounded-xl uppercase tracking-wider text-xs cursor-pointer"
              >
                Resume
              </button>
              <button
                onClick={() => {
                  setShowInGameMenu(false);
                  setShowRules(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#031B11] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-slate-300" />
                <span>Rules</span>
              </button>
              <button
                onClick={() => {
                  setShowInGameMenu(false);
                  setShowScoreHistory(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#031B11] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Target className="w-4 h-4 text-slate-300" />
                <span>Scorecard</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Restart this match from the beginning?')) {
                    resetMatch();
                    setShowInGameMenu(false);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#031B11] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-300" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Exit match and return to the main lobby?')) {
                    exitToLobby();
                    setShowInGameMenu(false);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-800/60 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
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
