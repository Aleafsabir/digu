import React from 'react';
import { motion } from 'framer-motion';
import { PlayerState, GamePhase } from '../../core/models/types';
import { PlayingCard } from '../shared/PlayingCard';
import { useGameStore } from '../../store/useGameStore';
import { THEME_CONFIGS } from '../../theme/themeConfig';

interface OpponentHandProps {
  player: PlayerState;
  isActiveTurn: boolean;
  isDealer: boolean;
  phase: GamePhase;
  thoughtMessage?: string | null;
}

export const OpponentHand: React.FC<OpponentHandProps> = ({
  player,
  isActiveTurn,
  isDealer,
  phase,
  thoughtMessage,
}) => {
  const visualTheme = useGameStore(state => state.visualTheme) || 'royal_lacquer';
  const theme = THEME_CONFIGS[visualTheme] || THEME_CONFIGS.royal_lacquer;

  const playerReaction = useGameStore(state => state.playerReactions[player.seatIndex]);

  return (
    <motion.div
      animate={isActiveTurn ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative flex flex-col items-center select-none group"
    >
      {/* Active Quick Chat / Emoji Reaction Bubble with Sender Attribution & High Visibility */}
      {playerReaction && (
        <motion.div
          key={playerReaction.id}
          initial={{ scale: 0.6, y: 8, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center"
        >
          <div className="bg-gradient-to-r from-[#170b09]/98 via-[#220f0c]/98 to-[#170b09]/98 backdrop-blur-md text-white border-1.5 border-[#e5c378] rounded-2xl px-3 py-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.9),0_0_20px_rgba(229,195,120,0.3)] flex items-center gap-2 relative overflow-hidden">
            {/* Sender Badge */}
            <span className="bg-gradient-to-r from-[#c84b31] to-[#8f2c18] text-white border border-[#e5c378]/60 font-black text-[9px] tracking-wide uppercase px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
              {playerReaction.senderName || player.name}
            </span>

            {/* Reaction Text */}
            {playerReaction.text && (
              <span className="text-xs sm:text-sm font-extrabold text-white whitespace-nowrap drop-shadow-sm">
                {playerReaction.text}
              </span>
            )}

            {/* Large Animated Emoji */}
            {playerReaction.emoji && (
              <span className="text-2xl sm:text-3xl leading-none animate-bounce drop-shadow-md">
                {playerReaction.emoji}
              </span>
            )}

            {/* Countdown Progress Line (6.0s duration) */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c84b31] to-[#e5c378]"
                style={{
                  animation: 'shrinkProgress 6s linear forwards',
                  transformOrigin: 'left',
                }}
              />
            </div>
          </div>

          {/* Speech Bubble Tail pointing down to Opponent Avatar */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#e5c378] -mt-[1px]" />
        </motion.div>
      )}

      {/* Circular Avatar Chip */}
      <div className="relative">
        {/* Active Turn Breathing Halo */}
        {isActiveTurn && (
          <div className="absolute -inset-1 rounded-full bg-[#e5c378]/30 blur-sm pointer-events-none animate-pulse" />
        )}

        {/* Dealer "D" Badge */}
        {isDealer && (
          <div
            title="Dealer"
            className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-[#FFF0C8] via-[#E5C378] to-[#B48D36] text-[#1A1202] font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-md border border-[#FEF08A] z-20"
          >
            D
          </div>
        )}

        {/* Avatar Ring */}
        <div
          id={`anchor-seat-${player.seatIndex}`}
          className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-slate-400/40 flex items-center justify-center shadow-md transition-all duration-300 ${
            isActiveTurn
              ? 'bg-gradient-to-br from-[#c84b31] to-[#8f2d1b] text-[#f7f0ea] shadow-[0_0_18px_rgba(200,75,49,0.6)] border-[#e5c378]'
              : 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-slate-200'
          }`}
        >
          <span className={`font-black text-xs sm:text-sm tracking-tight ${theme.fontHeader}`}>
            {player.name.replace(/^Bot\s+/, '').slice(0, 2).toUpperCase()}
          </span>
        </div>

        {/* Bot Badge (if AI) */}
        {player.isAI && (
          <div
            title="Autonomous AI Bot"
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-black/80 border border-slate-600 text-[9px] flex items-center justify-center shadow z-20"
          >
            🤖
          </div>
        )}

        {/* Live Opponent Hand Count Chip (e.g. 10 or 11 cards) */}
        <div
          title={`${player.hand.length} cards held`}
          className={`absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-black flex items-center gap-0.5 shadow-sm border border-slate-700 z-20 ${
            player.hand.length === 11
              ? 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
              : 'bg-black/85 text-neutral-300'
          }`}
        >
          <span>🎴</span>
          <span>{player.hand.length}</span>
        </div>

        {/* Team Pill Badge (if in 4P team mode) */}
        {player.teamId && (
          <div
            className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black flex items-center shadow-sm z-20 ${
              player.teamId === 'TEAM_A'
                ? 'bg-[#F1F5F9] text-stone-950 border border-slate-300'
                : 'bg-rose-500 text-white border border-rose-300'
            }`}
          >
            {player.teamId === 'TEAM_A' ? 'A' : 'B'}
          </div>
        )}
      </div>

      {/* Clean Floating Name Pill */}
      <div
        className={`mt-1 px-2.5 py-0.5 rounded-full border backdrop-blur-xs flex items-center shadow-sm transition-colors ${
          isActiveTurn
            ? 'bg-[#170b09]/95 border-[#e5c378]/80 text-[#e5c378] font-black shadow-[0_0_10px_rgba(229,195,120,0.4)]'
            : 'bg-[#0d0605]/85 border-[#301a14] text-[#f7f0ea]/70'
        }`}
      >
        <span
          className={`text-[10px] sm:text-xs font-bold truncate max-w-[70px] sm:max-w-[90px] ${
            isActiveTurn ? 'text-[#e5c378]' : 'text-[#f7f0ea]/70'
          }`}
        >
          {player.name.replace(/^Bot\s+/, '')}
        </span>
      </div>

      {/* Live AI Thought / Turn Action Bubble */}
      {isActiveTurn && (
        <motion.div
          initial={{ opacity: 0, y: -3, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#170b09]/95 border border-[#301a14] text-[8px] sm:text-[9px] font-black text-[#e5c378] shadow-xl z-30 pointer-events-none"
        >
          {thoughtMessage || (player.isAI ? 'Thinking...' : 'Playing...')}
        </motion.div>
      )}

      {/* Scatter Cut Reveal Card (during pre-game high-card cut) */}
      {phase === 'SCATTER_CUT' && player.scatterCard && (
        <div className="mt-1 flex flex-col items-center animate-in zoom-in-75">
          <PlayingCard card={player.scatterCard} size="sm" isInteractive={false} />
        </div>
      )}
    </motion.div>
  );
};
