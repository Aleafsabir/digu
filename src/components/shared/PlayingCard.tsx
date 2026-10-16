import React from 'react';
import { motion } from 'framer-motion';
import { Card, Rank, Suit } from '../../core/models/types';
import { useGameStore } from '../../store/useGameStore';
import { THEME_CONFIGS } from '../../theme/themeConfig';

export type MeldColor = 'cyan' | 'emerald' | 'amber' | 'purple';

export interface MeldHighlight {
  meldIndex: number;
  color: MeldColor;
  type?: 'SET' | 'RUN';
}

interface PlayingCardProps {
  card: Card;
  isSelected?: boolean;
  isFaceDown?: boolean;
  isInteractive?: boolean;
  isAceStranded?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hand' | 'table';
  meldHighlight?: MeldHighlight;
  onClick?: () => void;
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, { symbol: string; isRed: boolean }> = {
  SPADES: { symbol: '♠', isRed: false },
  HEARTS: { symbol: '♥', isRed: true },
  DIAMONDS: { symbol: '♦', isRed: true },
  CLUBS: { symbol: '♣', isRed: false },
};

const RANK_LABELS: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

const SIZE_CLASSES = {
  sm: 'w-10 h-14 text-[9px] rounded-md p-1',
  md: 'w-13.5 sm:w-16 md:w-18 h-19.5 sm:h-22 md:h-26 text-xs sm:text-sm rounded-lg sm:rounded-xl md:rounded-2xl p-1 sm:p-2',
  lg: 'w-16 sm:w-19 md:w-21 h-23 sm:h-27 md:h-30 text-xs sm:text-sm rounded-lg sm:rounded-xl md:rounded-2xl p-1.5 sm:p-2.5',
  hand: 'w-[68px] sm:w-[76px] md:w-[80px] h-[104px] sm:h-[114px] md:h-[120px] text-xs sm:text-sm rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5',
  table: 'w-[62px] sm:w-[70px] md:w-[74px] h-[92px] sm:h-[104px] md:h-[110px] text-xs sm:text-sm rounded-xl sm:rounded-2xl p-1.5 sm:p-2',
};

import { DeckDesignId } from '../../config/deckConfig';

export const CardBackVisual: React.FC<{ deckId?: DeckDesignId; className?: string }> = ({
  deckId = 'burgundy_gold',
  className = '',
}) => {
  if (deckId === 'sapphire_lattice') {
    return (
      <div className={`w-full h-full bg-white p-0.5 sm:p-1 rounded-lg sm:rounded-xl shadow-md flex items-center justify-center select-none ${className}`}>
        <div className="w-full h-full rounded-md sm:rounded-lg bg-gradient-to-br from-[#0c2356] via-[#081738] to-[#040c1e] border border-sky-400/60 p-0.5 relative flex flex-col items-center justify-center overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 140" fill="none">
            <defs>
              <pattern id="sapphire-diamonds" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="none" stroke="#38BDF8" strokeWidth="0.5" opacity="0.4" />
                <circle cx="6" cy="6" r="0.8" fill="#BAE6FD" opacity="0.6" />
              </pattern>
            </defs>
            <rect x="4" y="4" width="92" height="132" rx="4" fill="url(#sapphire-diamonds)" stroke="#38BDF8" strokeWidth="1" opacity="0.9" />
            <rect x="7" y="7" width="86" height="126" rx="3" stroke="#BAE6FD" strokeWidth="0.5" opacity="0.6" />
            <ellipse cx="50" cy="70" rx="20" ry="15" fill="#081738" stroke="#FBBF24" strokeWidth="1.5" />
            <ellipse cx="50" cy="70" rx="17" ry="12" fill="#0C2356" stroke="#FDE68A" strokeWidth="0.75" strokeDasharray="1.5 1" />
            <text x="50" y="73" textAnchor="middle" fill="#FDE68A" fontSize="7" fontWeight="bold" fontFamily="sans-serif">DIGU</text>
          </svg>
        </div>
      </div>
    );
  }

  if (deckId === 'maldivian_lacquer') {
    return (
      <div className={`w-full h-full bg-[#FAF7EE] p-0.5 sm:p-1 rounded-lg sm:rounded-xl shadow-md flex items-center justify-center select-none ${className}`}>
        <div className="w-full h-full rounded-md sm:rounded-lg bg-gradient-to-br from-[#1c0404] via-[#0d0202] to-[#000000] border-2 border-amber-500 p-0.5 relative flex flex-col items-center justify-center overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 140" fill="none">
            <rect x="4" y="4" width="92" height="132" rx="4" stroke="#DC2626" strokeWidth="1.5" />
            <rect x="7" y="7" width="86" height="126" rx="3" stroke="#F59E0B" strokeWidth="1" />
            <rect x="9" y="9" width="82" height="122" rx="2" stroke="#DC2626" strokeWidth="0.75" strokeDasharray="2 1" />
            <path d="M12 12 Q20 14 22 22 Q14 20 12 12 Z M88 12 Q80 14 78 22 Q86 20 88 12 Z M12 128 Q20 126 22 118 Q14 120 12 128 Z M88 128 Q80 126 78 118 Q86 120 88 128 Z" fill="#F59E0B" />
            <circle cx="50" cy="70" r="19" fill="#7F1D1D" stroke="#F59E0B" strokeWidth="1.5" />
            <circle cx="50" cy="70" r="15" fill="#1C0404" stroke="#DC2626" strokeWidth="1" />
            <polygon points="50,56 53,66 64,70 53,74 50,84 47,74 36,70 47,66" fill="#F59E0B" />
            <circle cx="50" cy="70" r="3.5" fill="#DC2626" stroke="#FEF08A" strokeWidth="0.75" />
          </svg>
          <span className="font-thaana text-[9px] sm:text-[10px] font-black text-amber-300 drop-shadow z-10 mt-8">
            ތާސް
          </span>
        </div>
      </div>
    );
  }

  // Default: Royal Burgundy & Gold Filigree
  return (
    <div className={`w-full h-full bg-[#FAF7EE] p-0.5 sm:p-1 rounded-lg sm:rounded-xl shadow-md flex items-center justify-center select-none ${className}`}>
      <div className="w-full h-full rounded-md sm:rounded-lg bg-gradient-to-br from-[#58111A] via-[#3d080f] to-[#200408] border border-[#D4AF37]/90 p-0.5 relative flex flex-col items-center justify-center overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 140" fill="none">
          <rect x="5" y="5" width="90" height="130" rx="4" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 1" opacity="0.6" />
          <rect x="8" y="8" width="84" height="124" rx="3" stroke="#D4AF37" strokeWidth="0.75" opacity="0.8" />
          <path d="M10 20 C10 12, 12 10, 20 10 M80 10 C88 10, 90 12, 90 20 M10 120 C10 128, 12 130, 20 130 M80 130 C88 130, 90 128, 90 120" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M15 25 L85 115 M15 115 L85 25 M30 15 L85 85 M15 70 L70 125 M15 70 L70 15 M30 125 L85 55" stroke="#D4AF37" strokeWidth="0.4" opacity="0.18" />
          <circle cx="50" cy="70" r="18" fill="#200408" stroke="#D4AF37" strokeWidth="1.5" />
          <circle cx="50" cy="70" r="14" fill="#3D080F" stroke="#FDE68A" strokeWidth="0.75" strokeDasharray="1.5 1" />
          <polygon points="50,58 53,67 62,70 53,73 50,82 47,73 38,70 47,67" fill="#D4AF37" />
        </svg>
        <span className="font-cinzel text-[7px] sm:text-[8px] font-black tracking-widest text-amber-200 uppercase drop-shadow z-10 mt-8">
          DIGU
        </span>
      </div>
    </div>
  );
};

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isSelected = false,
  isFaceDown = card.isFaceDown || false,
  isInteractive = true,
  isAceStranded = false,
  size = 'md',
  meldHighlight,
  onClick,
  className = '',
}) => {
  const visualTheme = useGameStore(state => state.visualTheme) || 'tournoi';
  const theme = THEME_CONFIGS[visualTheme] || THEME_CONFIGS.tournoi;
  const activeDeck = useGameStore(state => state.activeDeck) || 'burgundy_gold';

  const suitMeta = SUIT_SYMBOLS[card.suit];
  const rankLabel = RANK_LABELS[card.rank];
  const suitColorClass = suitMeta.isRed ? theme.redSuitClass : theme.blackSuitClass;

  if (isFaceDown) {
    return (
      <motion.div
        whileHover={isInteractive ? { scale: 1.04 } : undefined}
        onClick={onClick}
        className={`${SIZE_CLASSES[size]} select-none ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
      >
        <CardBackVisual deckId={activeDeck} />
      </motion.div>
    );
  }

  const highlightMeta = meldHighlight
    ? theme.getMeldHighlight(meldHighlight.color, meldHighlight.meldIndex, meldHighlight.type)
    : null;

  return (
    <motion.div
      whileHover={isInteractive && !isSelected ? { y: size === 'hand' ? -10 : -8, scale: 1.02 } : undefined}
      animate={
        isSelected
          ? { y: size === 'hand' ? -32 : -20, scale: size === 'hand' ? 1.06 : 1.05 }
          : meldHighlight
          ? { y: size === 'hand' ? -10 : -10, scale: 1.02 }
          : { y: 0, scale: 1 }
      }
      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
      onClick={onClick}
      className={`${SIZE_CLASSES[size]} flex flex-col justify-between select-none relative transition-all ${
        isSelected
          ? `${theme.cardFaceClass} ${theme.selectedCardRing} ring-2 ring-[#05D59A] shadow-[0_24px_35px_-5px_rgba(0,0,0,0.85)] z-40`
          : highlightMeta
          ? highlightMeta.containerClass
          : `${theme.cardFaceClass} hover:shadow-lg`
      } ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Stranded Ace Hazard Warning Badge (-15 Debt) */}
      {isAceStranded && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#DC2626] text-white font-sans-clean font-black text-[7px] sm:text-[8px] px-2 py-0.5 rounded-full shadow-lg border border-red-300 flex items-center gap-0.5 animate-bounce z-40 whitespace-nowrap pointer-events-none">
          <span>⚠️ -15 DEBT</span>
        </div>
      )}

      {/* Top Left Rank and Pip */}
      <div className="flex justify-between items-start leading-none">
        <div className="flex flex-col items-center leading-none">
          <span className={`font-black ${size === 'hand' || size === 'table' ? 'text-sm sm:text-base md:text-lg' : 'text-xs sm:text-base'} ${theme.fontCard} ${suitColorClass}`}>
            {rankLabel}
          </span>
          <span className={`${size === 'hand' || size === 'table' ? 'text-xs sm:text-sm md:text-base' : 'text-[10px] sm:text-sm'} ${suitColorClass} mt-0.5`}>
            {suitMeta.symbol}
          </span>
          {/* Always-visible Glowing Meld Pip (visible even when cards overlap!) */}
          {highlightMeta && (
            <span
              className={`mt-1 ${size === 'hand' || size === 'table' ? 'w-2 h-2 sm:w-2.5 sm:h-2.5' : 'w-1.5 h-1.5 sm:w-2 sm:h-2'} rounded-full shrink-0 ${highlightMeta.pipClass}`}
              title={meldHighlight?.type || 'Meld'}
            />
          )}
        </div>

        {/* Meld Tag if present */}
        {highlightMeta && meldHighlight?.type && (
          <span className={`text-[6px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded font-mono font-bold uppercase shadow-sm ${highlightMeta.badgeClass}`}>
            {meldHighlight.type}
          </span>
        )}
      </div>

      {/* Center Pip */}
      <div className={`self-center ${size === 'hand' || size === 'table' ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-xl sm:text-3xl'} leading-none select-none ${suitColorClass}`}>
        {suitMeta.symbol}
      </div>

      {/* Bottom Right Inverted Rank and Pip */}
      <div className="flex justify-end items-end leading-none rotate-180">
        <div className="flex flex-col items-center leading-none">
          <span className={`font-black ${size === 'hand' || size === 'table' ? 'text-sm sm:text-base md:text-lg' : 'text-xs sm:text-base'} ${theme.fontCard} ${suitColorClass}`}>
            {rankLabel}
          </span>
          <span className={`${size === 'hand' || size === 'table' ? 'text-xs sm:text-sm md:text-base' : 'text-xs sm:text-sm'} ${suitColorClass} mt-0.5`}>
            {suitMeta.symbol}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
