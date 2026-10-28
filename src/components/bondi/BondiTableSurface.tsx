import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBondiStore } from '../../store/useBondiStore';
import { useGameStore } from '../../store/useGameStore';
import { PlayingCard } from '../shared/PlayingCard';
import { Suit } from '../../core/models/types';
import { BondiValidator } from '@game/core';
import { ArrowLeft, AlertTriangle, Flame, ShieldAlert, Award, Skull } from 'lucide-react';

const SUIT_ICONS: Record<Suit, { symbol: string; color: string }> = {
  SPADES: { symbol: '♠', color: '#1e293b' },
  HEARTS: { symbol: '♥', color: '#b91c1c' },
  DIAMONDS: { symbol: '♦', color: '#b91c1c' },
  CLUBS: { symbol: '♣', color: '#1e293b' },
};

export const BondiTableSurface: React.FC = () => {
  const {
    gameState,
    selectedCardIds,
    isResolvingTrick,
    statusMessage,
    selectCard,
    playSelectedCards,
    dumpSuit,
    startMatch,
  } = useBondiStore();

  const exitToLobby = useGameStore(state => state.exitToLobby);

  if (!gameState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0605] text-[#f7f0ea]">
        <h2 className="text-xl font-bold font-serif-luxury mb-4 text-[#e5c378]">Bondi Match Setup</h2>
        <button
          onClick={() => startMatch('STANDARD', 4)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] font-bold text-sm text-white shadow-lg cursor-pointer hover:brightness-110"
        >
          Start 4-Player Match
        </button>
      </div>
    );
  }

  const human = gameState.players[0];
  const opponents = gameState.players.slice(1);
  const currentTrick = gameState.currentTrick;
  const isHumanTurn = gameState.activeSeat === 0 && !isResolvingTrick && gameState.phase === 'TRICK_PLAY';

  // Check if human is void in led suit
  const isHumanVoid =
    currentTrick.leadSuit !== null &&
    !BondiValidator.hasSuit(human.hand, currentTrick.leadSuit);

  const availableDumpSuits =
    isHumanVoid && gameState.variant === 'SUIT_BONDI'
      ? BondiValidator.getAvailableDumpSuits(human.hand)
      : [];

  const atRiskPlayer =
    currentTrick.atRiskSeat !== null ? gameState.players[currentTrick.atRiskSeat] : null;

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-screen bg-radial from-[#1e1428] via-[#120a1c] to-[#07030c] text-[#f7f0ea] flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Table border rim */}
      <div className="absolute inset-2 sm:inset-4 rounded-3xl border border-purple-900/40 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.85)]" />

      {/* TOP HEADER: Navigation, Mode Info & At-Risk Alert */}
      <header
        className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2 border-b border-purple-950/80 bg-[#0d0614]/85 shrink-0"
        style={{
          paddingTop: 'max(6px, env(safe-area-inset-top))',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {/* Left: Exit & Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={exitToLobby}
            className="w-8 h-8 rounded-xl bg-[#07030c] border border-purple-900/60 hover:border-[#e5c378] text-[#f7f0ea]/70 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Leave Match"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black font-serif-luxury text-[#e5c378] flex items-center gap-1 leading-tight">
              BONDI <span className="font-thaana text-sm">ބޮނޑި</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-[#f7f0ea]/60">
              {gameState.variant === 'SUIT_BONDI' ? 'MASS SUIT DUMP' : 'STANDARD SINGLE-CARD'} • {gameState.playerCount}P
            </span>
          </div>
        </div>

        {/* Center: Live At-Risk Indicator (The high card player facing penalty) */}
        {atRiskPlayer && (
          <div className="flex items-center gap-2 bg-[#2a0e1a] border border-rose-500/80 px-3 py-1 rounded-2xl shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span className="text-rose-300 font-mono text-[10px] uppercase">AT RISK:</span>
              <span className="text-white">{atRiskPlayer.name}</span>
              {currentTrick.atRiskCard && (
                <span className="text-[10px] font-mono bg-rose-950 px-1.5 py-0.2 rounded border border-rose-400/50 text-rose-200">
                  {currentTrick.atRiskCard.rank === 1 ? 'A' : currentTrick.atRiskCard.rank}
                  {SUIT_ICONS[currentTrick.atRiskCard.suit].symbol}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Right: Burned pile count & Trick number */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#07030c] border border-purple-900/60 px-2.5 py-1 rounded-full text-xs font-mono font-bold text-purple-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Burned: {gameState.burnedCardsCount}</span>
          </div>
        </div>
      </header>

      {/* MIDDLE ARENA: Opponents on Perimeter + High-Visibility Center Trick Pile */}
      <main
        className="relative flex-1 w-full max-w-6xl mx-auto flex items-center justify-center p-1 sm:p-2 overflow-hidden"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
        }}
      >
        {/* OPPONENTS PERIMETER SLOTS (Zero overlap with center!) */}
        <div className="absolute top-1 left-0 right-0 flex items-center justify-center gap-2 sm:gap-6 z-20 px-2 sm:px-4">
          {opponents.map(opp => {
            const isActive = gameState.activeSeat === opp.seatIndex;
            return (
              <div
                key={opp.id}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-2xl border transition shadow ${
                  opp.hasExited
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 opacity-60'
                    : isActive
                    ? 'bg-purple-950 border-[#e5c378] text-[#e5c378] ring-2 ring-[#e5c378]/60 animate-pulse'
                    : 'bg-[#0f0717]/90 border-purple-900/50 text-[#f7f0ea]/80'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="text-[11px] sm:text-xs font-bold leading-tight">
                    {opp.name} {opp.hasExited ? '✓ CLEARED' : ''}
                  </span>
                  {!opp.hasExited && (
                    <span className="text-[8px] sm:text-[9px] font-mono text-purple-300">
                      {opp.hand.length} cards left
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* HIGH-VISIBILITY CENTER TRICK ARENA (Fluid Sizing for All Screen Sizes & DPIs) */}
        <div className="relative w-[clamp(220px,36vw,320px)] h-[clamp(130px,36dvh,185px)] rounded-2xl sm:rounded-3xl bg-[#0d0514]/90 border-2 border-purple-900/60 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.85)] z-10 px-2 sm:px-4">
          {/* Subtle felt rings */}
          <div className="absolute inset-2 sm:inset-3 rounded-xl sm:rounded-2xl border border-purple-800/30 border-dashed pointer-events-none" />

          {/* DOCKED STATUS BANNER: Zero Collision with North Opponents */}
          {statusMessage && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 bg-[#170524]/95 border border-[#e5c378]/70 text-[#e5c378] text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-0.5 sm:py-1 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.9)] pointer-events-none transition whitespace-nowrap animate-in fade-in flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {currentTrick.cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-purple-400/50 text-xs font-mono">
              <span>Pile Cleared</span>
              <span className="text-[10px] text-purple-400/40 mt-1">Awaiting Lead</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full">
              {/* Lead Suit Label */}
              {currentTrick.leadSuit && (
                <div className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300 mb-1 sm:mb-2 flex items-center gap-1">
                  <span>Led Suit:</span>
                  <span className={currentTrick.leadSuit === 'HEARTS' || currentTrick.leadSuit === 'DIAMONDS' ? 'text-red-400' : 'text-slate-200'}>
                    {SUIT_ICONS[currentTrick.leadSuit].symbol} {currentTrick.leadSuit}
                  </span>
                </div>
              )}

              {/* Fanned / Stacked Visible Trick Cards */}
              <div className="flex items-center justify-center -space-x-5 sm:-space-x-7 py-1 sm:py-2 overflow-visible">
                {currentTrick.cards.map((play, idx) => {
                  const isAtRiskPlay =
                    currentTrick.atRiskCard && play.card.id === currentTrick.atRiskCard.id;

                  return (
                    <motion.div
                      key={`${play.card.id}-${idx}`}
                      initial={{ scale: 0.8, y: -15, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                      className="relative"
                      style={{ zIndex: idx }}
                    >
                      <div className={`relative ${isAtRiskPlay ? 'ring-3 ring-rose-500 rounded-xl shadow-[0_0_18px_rgba(244,63,94,0.7)]' : ''}`}>
                        <PlayingCard
                          card={play.card}
                          size="table"
                          isInteractive={false}
                        />
                        <span className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-[#07030c] border border-purple-900 text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap text-purple-200">
                          {gameState.players[play.playedBySeat].name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Total Cards in Pile */}
              <div className="text-[8px] sm:text-[9px] font-mono text-purple-400/80 mt-2 sm:mt-3">
                {currentTrick.cards.length} {currentTrick.cards.length === 1 ? 'card' : 'cards'} in active pile
              </div>
            </div>
          )}
        </div>
      </main>

      {/* SUIT BONDI DUMP PICKER MODAL (Docked Gracefully above Hand Tray) */}
      <AnimatePresence>
        {isHumanTurn && isHumanVoid && gameState.variant === 'SUIT_BONDI' && availableDumpSuits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-[clamp(76px,24dvh,115px)] left-1/2 -translate-x-1/2 z-40 bg-[#170524]/95 border-2 border-rose-500/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-[0_0_25px_rgba(244,63,94,0.5)] flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-rose-300">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
              <span>GIVE BONDI: CHOOSE SUIT TO DUMP!</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {availableDumpSuits.map(dump => (
                <button
                  key={dump.suit}
                  onClick={() => dumpSuit(dump.suit)}
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-rose-900 border border-rose-400 hover:brightness-110 font-bold text-[11px] sm:text-xs text-white shadow cursor-pointer transition active:scale-95"
                >
                  {SUIT_ICONS[dump.suit].symbol} {dump.suit} ({dump.cards.length})
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM ARENA: Human Player Hand Tray (Exact Digu Styling & Fanning) */}
      <footer
        className="relative z-30 flex flex-col items-center w-full px-2 pt-1 pb-2 shrink-0 overflow-visible"
        style={{
          paddingBottom: 'max(8px, calc(env(safe-area-inset-bottom) + 4px))',
        }}
      >
        {/* Human Turn Action Prompt */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`px-3 py-0.5 rounded-full border text-[10px] font-bold font-mono transition ${
              isHumanTurn
                ? 'bg-purple-950 border-[#e5c378] text-[#e5c378] shadow-[0_0_12px_rgba(229,195,120,0.6)] animate-pulse'
                : 'bg-[#0f0717]/80 border-purple-900 text-[#f7f0ea]/50'
            }`}
          >
            {isHumanTurn
              ? isHumanVoid
                ? 'VOID IN LED SUIT • CLICK ANY CARD TO GIVE BONDI'
                : 'YOUR TURN • CLICK CARD TO PLAY'
              : 'WAITING FOR OPPONENT...'}
          </div>

          {selectedCardIds.length > 0 && isHumanTurn && (
            <button
              onClick={playSelectedCards}
              className="px-3 py-0.5 rounded-full bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] border border-[#e5c378] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer shadow hover:brightness-110 active:scale-95"
            >
              Play Card
            </button>
          )}
        </div>

        {/* Fanned Hand Cards Container (Dynamic Overlap for Bondi across all Screen Sizes) */}
        <div
          className={`flex items-end justify-center px-1 pb-0 overflow-visible min-h-[clamp(74px,23dvh,118px)] max-w-full ${
            human.hand.length > 10
              ? '-space-x-5 sm:-space-x-6 md:-space-x-7'
              : human.hand.length > 7
              ? '-space-x-4 sm:-space-x-5 md:-space-x-6'
              : '-space-x-3 sm:-space-x-4'
          }`}
        >
          {human.hand.map((card, index) => {
            const isSelected = selectedCardIds.includes(card.id);
            const midIndex = (human.hand.length - 1) / 2;
            const fanAngle = isSelected ? 0 : (index - midIndex) * 1.5;
            const isPlayable = isHumanTurn && BondiValidator.isCardPlayable(card, human.hand, currentTrick);

            return (
              <motion.div
                key={card.id}
                animate={{
                  rotate: fanAngle,
                  y: isSelected ? -24 : 0,
                  scale: isSelected ? 1.05 : 1,
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                whileHover={!isSelected && isHumanTurn ? { y: -10, scale: 1.03, rotate: 0 } : undefined}
                onClick={() => {
                  if (isHumanTurn) selectCard(card.id);
                }}
                className={`relative select-none ${
                  isHumanTurn && !isPlayable ? 'opacity-40 grayscale-[40%] cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{ zIndex: isSelected ? 40 : index }}
              >
                <PlayingCard
                  card={card}
                  size="hand"
                  isSelected={isSelected}
                  isInteractive={isHumanTurn && isPlayable}
                />
              </motion.div>
            );
          })}
        </div>
      </footer>

      {/* MATCH OVER MODAL (Strictly "You Lose!" or "You Win!" per user directive) */}
      <AnimatePresence>
        {gameState.phase === 'MATCH_OVER' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`w-full max-w-sm rounded-3xl bg-gradient-to-b ${
                gameState.humanWon
                  ? 'from-emerald-950 via-[#0d1f14] to-[#050a07] border-2 border-emerald-400'
                  : 'from-rose-950 via-[#1f0d14] to-[#0a0507] border-2 border-rose-500'
              } p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col items-center text-center text-[#f7f0ea]`}
            >
              <div
                className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-4 shadow ${
                  gameState.humanWon
                    ? 'bg-emerald-900/60 border-emerald-400 text-emerald-300'
                    : 'bg-rose-900/60 border-rose-500 text-rose-300'
                }`}
              >
                {gameState.humanWon ? <Award className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
              </div>

              {/* Headline per user directive: "instead of this just say You Lose!" */}
              <h2 className="text-3xl font-black font-serif-luxury tracking-tight text-white mb-2">
                {gameState.humanWon ? 'You Win!' : 'You Lose!'}
              </h2>

              <p className="text-xs font-mono text-slate-300 mb-6">
                {gameState.humanWon
                  ? 'You shed all cards and cleared first!'
                  : 'You were the last player holding cards (The Bondi).'}
              </p>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={exitToLobby}
                  className="flex-1 py-2.5 rounded-xl bg-[#0d0614] border border-purple-900/80 hover:border-purple-400 font-bold text-xs uppercase tracking-wider text-[#f7f0ea]/80 transition cursor-pointer"
                >
                  Exit to Lobby
                </button>
                <button
                  onClick={() => startMatch(gameState.variant, gameState.playerCount)}
                  className={`flex-1 py-2.5 rounded-xl border font-black text-xs uppercase tracking-wider text-white shadow hover:brightness-110 active:scale-95 transition cursor-pointer ${
                    gameState.humanWon
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 border-emerald-400'
                      : 'bg-gradient-to-r from-rose-600 to-rose-800 border-rose-400'
                  }`}
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
