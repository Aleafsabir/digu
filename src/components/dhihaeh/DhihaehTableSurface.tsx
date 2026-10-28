import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDhihaehStore } from '../../store/useDhihaehStore';
import { useGameStore } from '../../store/useGameStore';
import { PlayingCard } from '../shared/PlayingCard';
import { Suit } from '../../core/models/types';
import { DhihaehValidator } from '@game/core';
import { ArrowLeft, Trophy, Shield } from 'lucide-react';
import { TrumpDeclarationModal } from './TrumpDeclarationModal';

const SUIT_ICONS: Record<Suit, { symbol: string; color: string }> = {
  SPADES: { symbol: '♠', color: '#1e293b' },
  HEARTS: { symbol: '♥', color: '#b91c1c' },
  DIAMONDS: { symbol: '♦', color: '#b91c1c' },
  CLUBS: { symbol: '♣', color: '#1e293b' },
};

export const DhihaehTableSurface: React.FC = () => {
  const { gameState, selectedCardId, isResolvingTrick, statusMessage, selectCard, playCard, nextHand, startMatch } =
    useDhihaehStore();
  const exitToLobby = useGameStore(state => state.exitToLobby);

  if (!gameState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0605] text-[#f7f0ea]">
        <h2 className="text-xl font-bold font-serif-luxury mb-4 text-[#e5c378]">Dhihaeh Match Setup</h2>
        <button
          onClick={() => startMatch('DYNAMIC_CUT', 7)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] font-bold text-sm text-white shadow-lg cursor-pointer hover:brightness-110"
        >
          Start 2v2 Match
        </button>
      </div>
    );
  }

  const human = gameState.players[0];
  const eastBot = gameState.players[1];
  const northPartner = gameState.players[2];
  const westBot = gameState.players[3];

  const currentTrick = gameState.currentTrick;
  const isHumanTurn = gameState.activeSeat === 0 && !isResolvingTrick && gameState.phase === 'TRICK_PLAY';

  // Trump Cut Declaration Fanfare tracking
  const [showTrumpModal, setShowTrumpModal] = useState(false);
  const [lastAnnouncedTrump, setLastAnnouncedTrump] = useState<string | null>(null);

  useEffect(() => {
    if (gameState.trumpSuit && gameState.trumpSuit !== lastAnnouncedTrump) {
      setLastAnnouncedTrump(gameState.trumpSuit);
      setShowTrumpModal(true);
    } else if (!gameState.trumpSuit) {
      setLastAnnouncedTrump(null);
      setShowTrumpModal(false);
    }
  }, [gameState.trumpSuit, lastAnnouncedTrump]);

  const declarerSeat = gameState.trumpDeclaredBySeat ?? 0;
  const declarerPlayer = gameState.players[declarerSeat];
  const declarerName = declarerSeat === 0 ? 'You' : declarerPlayer?.name || 'A player';

  // 10s tracking for trophy bar
  const allTens: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
  const getTenOwner = (suit: Suit): 'TEAM_1' | 'TEAM_2' | null => {
    for (const p of gameState.players) {
      if (p.capturedTens.some(c => c.suit === suit)) {
        return p.teamId;
      }
    }
    return null;
  };

  const team1Tricks = gameState.players[0].tricksWon + gameState.players[2].tricksWon;
  const team2Tricks = gameState.players[1].tricksWon + gameState.players[3].tricksWon;

  return (
    <div className="relative w-screen h-screen h-[100dvh] max-h-screen bg-radial from-[#24110d] via-[#170b09] to-[#0a0504] text-[#f7f0ea] flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Subtle table felt texture & stadium borders */}
      <div className="absolute inset-2 sm:inset-4 rounded-3xl border border-[#301a14]/60 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]" />

      {/* TOP HEADER: Navigation, Mode Info & 10s Trophy Bar */}
      <header
        className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2 border-b border-[#301a14]/80 bg-[#170b09]/80 shrink-0"
        style={{
          paddingTop: 'max(6px, env(safe-area-inset-top))',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {/* Left: Exit to Lobby & Round counter */}
        <div className="flex items-center gap-2">
          <button
            onClick={exitToLobby}
            className="w-8 h-8 rounded-xl bg-[#0d0605] border border-[#301a14] hover:border-[#e5c378] text-[#f7f0ea]/70 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Leave Match"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black font-serif-luxury text-[#e5c378] flex items-center gap-1 leading-tight">
              DHIHAEH <span className="font-thaana text-sm">ދިހައެއް</span>
            </span>
            <span className="text-[9px] font-mono font-bold text-[#f7f0ea]/60">
              TRICK {Math.min(currentTrick.trickNumber, 13)} / 13
            </span>
          </div>
        </div>

        {/* Center: 10s Trophy Bar (The Core Objective) */}
        <div className="flex items-center gap-2 bg-[#0d0605] border border-[#301a14] px-3 py-1 rounded-2xl shadow-md">
          <span className="text-[9px] font-black uppercase tracking-wider text-[#e5c378] font-mono mr-1 hidden sm:inline">
            10s TROPHY:
          </span>
          <div className="flex items-center gap-1.5">
            {allTens.map(suit => {
              const owner = getTenOwner(suit);
              const info = SUIT_ICONS[suit];
              return (
                <div
                  key={suit}
                  className={`w-6 h-7 rounded-md border flex flex-col items-center justify-center text-[10px] font-bold transition-all ${
                    owner === 'TEAM_1'
                      ? 'bg-[#e5c378] border-[#e5c378] text-[#0d0605] shadow-[0_0_8px_#e5c378]'
                      : owner === 'TEAM_2'
                      ? 'bg-[#c84b31] border-[#c84b31] text-white shadow-[0_0_8px_#c84b31]'
                      : 'bg-[#170b09] border-[#301a14] text-[#f7f0ea]/30 opacity-60'
                  }`}
                  title={`${suit} 10: ${owner ? (owner === 'TEAM_1' ? 'Captured by Your Team' : 'Captured by Opponents') : 'Uncaptured'}`}
                >
                  <span className="leading-none text-[8px]">10</span>
                  <span className="leading-none">{info.symbol}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Trump Badge & Team Scores */}
        <div className="flex items-center gap-2">
          {/* Trump Badge */}
          <div className="flex items-center gap-1.5 bg-[#0d0605] border border-[#301a14] px-2.5 py-1 rounded-full text-xs font-black shadow">
            <span className="text-[9px] text-[#f7f0ea]/60 uppercase font-mono">TRUMP:</span>
            {gameState.trumpSuit ? (
              <span className={`text-xs font-black flex items-center gap-1 ${gameState.trumpSuit === 'HEARTS' || gameState.trumpSuit === 'DIAMONDS' ? 'text-red-400' : 'text-slate-100'}`}>
                <span>{SUIT_ICONS[gameState.trumpSuit].symbol}</span>
                <span>{gameState.trumpSuit}</span>
              </span>
            ) : (
              <span className="text-[10px] text-[#e5c378]/70 italic">
                {gameState.variant === 'BLIND_RESERVE' ? 'Blind Hidden' : 'Cut On Void'}
              </span>
            )}
          </div>

          {/* Scores Pill */}
          <div className="flex items-center gap-1 bg-[#170b09] border border-[#301a14] px-2.5 py-1 rounded-full text-xs font-mono font-black">
            <span className="text-[#e5c378]" title="Your Team Tricks">T1: {team1Tricks}</span>
            <span className="text-white/30">•</span>
            <span className="text-[#c84b31]" title="Opponents Tricks">T2: {team2Tricks}</span>
          </div>
        </div>
      </header>

      {/* MIDDLE ARENA: 4 Seats Perimeter & Fluid Center Trick Arena */}
      <main
        className="relative flex-1 w-full max-w-6xl mx-auto flex items-center justify-center p-1 sm:p-2 overflow-hidden"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
        }}
      >
        {/* NORTH SEAT: Partner (Ali) */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border shadow transition ${
              gameState.activeSeat === 2
                ? 'bg-[#301a14] border-[#e5c378] text-[#e5c378] ring-2 ring-[#e5c378]/60 animate-pulse'
                : 'bg-[#170b09]/90 border-[#301a14] text-[#f7f0ea]/80'
            }`}
          >
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e5c378]" />
            <span className="text-[11px] sm:text-xs font-bold">{northPartner.name}</span>
            <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 bg-[#0d0605] rounded text-[#e5c378]">
              {northPartner.hand.length} cards
            </span>
          </div>
        </div>

        {/* WEST SEAT: Opponent (Ahmed) */}
        <div className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 flex flex-col items-center z-20">
          <div
            className={`flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-2xl border shadow transition ${
              gameState.activeSeat === 3
                ? 'bg-[#301a14] border-[#c84b31] text-[#c84b31] ring-2 ring-[#c84b31]/60 animate-pulse'
                : 'bg-[#170b09]/90 border-[#301a14] text-[#f7f0ea]/80'
            }`}
          >
            <span className="text-[11px] sm:text-xs font-bold">{westBot.name}</span>
            <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 bg-[#0d0605] rounded text-slate-300">
              {westBot.hand.length} cards
            </span>
          </div>
        </div>

        {/* EAST SEAT: Opponent (Hussain) */}
        <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col items-center z-20">
          <div
            className={`flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-2xl border shadow transition ${
              gameState.activeSeat === 1
                ? 'bg-[#301a14] border-[#c84b31] text-[#c84b31] ring-2 ring-[#c84b31]/60 animate-pulse'
                : 'bg-[#170b09]/90 border-[#301a14] text-[#f7f0ea]/80'
            }`}
          >
            <span className="text-[11px] sm:text-xs font-bold">{eastBot.name}</span>
            <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 bg-[#0d0605] rounded text-slate-300">
              {eastBot.hand.length} cards
            </span>
          </div>
        </div>

        {/* CENTER TRICK ARENA (Fluid Responsive Sizing for all Screen Sizes & DPIs) */}
        <div className="relative w-[clamp(210px,36vw,290px)] h-[clamp(135px,36dvh,195px)] rounded-2xl sm:rounded-3xl bg-[#120806]/90 border-2 border-[#301a14] flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.85)] z-10">
          {/* Subtle felt markings */}
          <div className="absolute inset-2 sm:inset-3 rounded-xl sm:rounded-2xl border border-[#301a14]/40 border-dashed pointer-events-none" />

          {/* DOCKED STATUS BANNER: Zero Collision with North Partner */}
          {statusMessage && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 bg-[#170b09]/95 border border-[#e5c378]/70 text-[#e5c378] text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-0.5 sm:py-1 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.9)] pointer-events-none transition whitespace-nowrap animate-in fade-in flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Cards played into active trick */}
          {currentTrick.cards.length === 0 ? (
            <div className="text-center text-[#f7f0ea]/40 text-xs font-mono">
              <span>Awaiting Lead...</span>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {currentTrick.cards.map((play, idx) => {
                // Coordinate offset depending on player position
                const seat = play.playedBySeat;
                let offsetClass = '';
                if (seat === 0) offsetClass = 'translate-y-6 sm:translate-y-8 z-20'; // South
                else if (seat === 2) offsetClass = '-translate-y-6 sm:-translate-y-8 z-10'; // North
                else if (seat === 3) offsetClass = '-translate-x-8 sm:-translate-x-12 z-15'; // West
                else if (seat === 1) offsetClass = 'translate-x-8 sm:translate-x-12 z-15'; // East

                const isWinnerCard = currentTrick.winnerSeat === seat;

                return (
                  <motion.div
                    key={`${play.card.id}-${idx}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`absolute ${offsetClass} transition-all`}
                  >
                    <div className={`relative ${isWinnerCard ? 'ring-3 ring-[#e5c378] rounded-xl shadow-[0_0_20px_#e5c378]' : ''}`}>
                      <PlayingCard
                        card={play.card}
                        size="table"
                        isInteractive={false}
                      />
                      <span className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-[#0d0605] border border-[#301a14] text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap text-[#e5c378]">
                        {gameState.players[seat].name.split(' ')[0]}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

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
                ? 'bg-[#301a14] border-[#e5c378] text-[#e5c378] shadow-[0_0_12px_rgba(229,195,120,0.6)] animate-pulse'
                : 'bg-[#170b09]/80 border-[#301a14] text-[#f7f0ea]/50'
            }`}
          >
            {isHumanTurn ? 'YOUR TURN • CLICK CARD TO PLAY' : 'WAITING FOR OPPONENT...'}
          </div>
          {selectedCardId && isHumanTurn && (
            <button
              onClick={() => playCard(selectedCardId)}
              className="px-3 py-0.5 rounded-full bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] border border-[#e5c378] text-white text-[10px] font-black uppercase tracking-wider cursor-pointer shadow hover:brightness-110 active:scale-95"
            >
              Play Card
            </button>
          )}
        </div>

        {/* Fanned Hand Cards Container (Dynamic Overlap for 13 Cards across all Screen Sizes) */}
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
            const isSelected = selectedCardId === card.id;
            const midIndex = (human.hand.length - 1) / 2;
            const fanAngle = isSelected ? 0 : (index - midIndex) * 1.5;
            const isPlayable = isHumanTurn && DhihaehValidator.isCardPlayable(card, human.hand, currentTrick);

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

      {/* ROUND / MATCH OVER MODAL */}
      <AnimatePresence>
        {(gameState.phase === 'ROUND_OVER' || gameState.phase === 'MATCH_OVER') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#e5c378] p-5 shadow-[0_0_50px_rgba(229,195,120,0.4)] flex flex-col items-center text-center text-[#f7f0ea]"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#301a14] border-2 border-[#e5c378] flex items-center justify-center text-[#e5c378] mb-3 shadow">
                <Trophy className="w-7 h-7" />
              </div>

              <h2 className="text-2xl font-black font-serif-luxury text-white mb-1">
                {gameState.phase === 'MATCH_OVER' ? 'Match Complete!' : 'Hand Completed!'}
              </h2>

              <p className="text-sm font-bold text-[#e5c378] font-mono mb-4">
                {gameState.score.outcomeType === 'HAASBAGGA'
                  ? '🌟 HAASBAGGA (1,000 PTS)! 🌟'
                  : gameState.score.outcomeType === 'BAGGA'
                  ? '👑 BAGGA (4 POINTS)!'
                  : gameState.score.outcomeType === 'STANDARD'
                  ? '✨ STANDARD WIN (3-1 SPLIT)!'
                  : '🤝 TIE-BREAKER (2-2 SPLIT)'}
              </p>

              {/* Hand Summary Breakdown */}
              <div className="w-full grid grid-cols-2 gap-3 bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 mb-5">
                <div className="flex flex-col items-center border-r border-[#301a14] pr-2">
                  <span className="text-xs font-bold text-[#e5c378]">Your Team</span>
                  <span className="text-xl font-black font-mono text-white mt-1">
                    {gameState.score.team1Score} <small className="text-[10px] text-[#f7f0ea]/50">PTS</small>
                  </span>
                  <span className="text-[10px] text-[#f7f0ea]/60 font-mono mt-0.5">
                    10s: {gameState.score.team1Tens} • Tricks: {team1Tricks}
                  </span>
                </div>
                <div className="flex flex-col items-center pl-2">
                  <span className="text-xs font-bold text-[#c84b31]">Opponents</span>
                  <span className="text-xl font-black font-mono text-white mt-1">
                    {gameState.score.team2Score} <small className="text-[10px] text-[#f7f0ea]/50">PTS</small>
                  </span>
                  <span className="text-[10px] text-[#f7f0ea]/60 font-mono mt-0.5">
                    10s: {gameState.score.team2Tens} • Tricks: {team2Tricks}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={exitToLobby}
                  className="flex-1 py-2.5 rounded-xl bg-[#170b09] border border-[#301a14] hover:border-[#c84b31] font-bold text-xs uppercase tracking-wider text-[#f7f0ea]/80 transition cursor-pointer"
                >
                  Exit to Lobby
                </button>
                {gameState.phase !== 'MATCH_OVER' ? (
                  <button
                    onClick={nextHand}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] border border-[#e5c378] font-black text-xs uppercase tracking-wider text-white shadow hover:brightness-110 active:scale-95 transition cursor-pointer"
                  >
                    Next Hand
                  </button>
                ) : (
                  <button
                    onClick={() => startMatch(gameState.variant, gameState.targetScore)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] border border-[#e5c378] font-black text-xs uppercase tracking-wider text-white shadow hover:brightness-110 active:scale-95 transition cursor-pointer"
                  >
                    Play Again
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRUMP CUT DECLARATION FANFARE MODAL */}
      <TrumpDeclarationModal
        isOpen={showTrumpModal}
        suit={gameState.trumpSuit as any}
        cardRank={gameState.trumpCard?.rank}
        cardSuit={gameState.trumpCard?.suit as any}
        declaredByName={declarerName}
        onDismiss={() => setShowTrumpModal(false)}
      />
    </div>
  );
};
