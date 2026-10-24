import React from 'react';
import { motion } from 'framer-motion';
import { Card, Rank, Suit } from '../../core/models/types';
import { useGameStore } from '../../store/useGameStore';
import { DeckDesignId } from '../../config/deckConfig';

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

export const RANK_LABELS: Record<Rank, string> = {
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
  sm: 'w-10 h-14 rounded-md',
  md: 'w-14 sm:w-16 md:w-20 h-20 sm:h-24 md:h-28 rounded-lg sm:rounded-xl',
  lg: 'w-18 sm:w-22 md:w-26 h-26 sm:h-30 md:h-36 rounded-xl sm:rounded-2xl',
  hand: 'w-[84px] sm:w-[96px] md:w-[108px] h-[126px] sm:h-[144px] md:h-[162px] rounded-[11px] sm:rounded-[13px]',
  table: 'w-[78px] sm:w-[90px] md:w-[100px] h-[114px] sm:h-[132px] md:h-[148px] rounded-[10px] sm:rounded-[12px]',
};

export function getSuitSVGPath(suit: Suit, cx: number, cy: number, scale = 1, fill = '#111827'): React.ReactElement {
  if (suit === 'SPADES') {
    return (
      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        <path d="M0 -11 C-5 -5 -10 -1 -10 4 C-10 7.5 -7 9.5 -4 9.5 C-2 9.5 -0.8 8.5 0 7 C0.8 8.5 2 9.5 4 9.5 C7 9.5 10 7.5 10 4 C10 -1 5 -5 0 -11 Z" fill={fill} />
        <path d="M-1.2 5.5 L-3.5 11.5 L3.5 11.5 L1.2 5.5 Z" fill={fill} />
      </g>
    );
  }
  if (suit === 'HEARTS') {
    return (
      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        <path d="M0 -5.5 C-2 -9.5 -6.5 -10.5 -9 -7.5 C-11.5 -4.5 -11 0.5 -7 4.5 L0 11.5 L7 4.5 C11 0.5 11.5 -4.5 9 -7.5 C6.5 -10.5 2 -9.5 0 -5.5 Z" fill={fill} />
      </g>
    );
  }
  if (suit === 'DIAMONDS') {
    return (
      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        <path d="M0 -11.5 C2.5 -6 6 -2.5 10 0 C6 2.5 2.5 6 0 11.5 C-2.5 6 -6 2.5 -10 0 C-6 -2.5 -2.5 -6 0 -11.5 Z" fill={fill} />
      </g>
    );
  }
  // CLUBS
  return (
    <g transform={`translate(${cx},${cy}) scale(${scale})`}>
      <circle cx="0" cy="-5.2" r="4.5" fill={fill} />
      <circle cx="-5" cy="2" r="4.5" fill={fill} />
      <circle cx="5" cy="2" r="4.5" fill={fill} />
      <path d="M-1.3 3.5 L-3.5 11 L3.5 11 L1.3 3.5 Z" fill={fill} />
    </g>
  );
}

export const CardBackVisual: React.FC<{ deckId?: DeckDesignId; className?: string }> = ({
  deckId = 'royal_lacquer',
  className = '',
}) => {
  const themes = {
    royal_lacquer:     { primary: '#881313', dark: '#3b0707', accent: '#e5c378' },
    maldivian_lacquer: { primary: '#881313', dark: '#3b0707', accent: '#e5c378' },
    burgundy_gold:     { primary: '#881313', dark: '#3b0707', accent: '#e5c378' },
    bicycle_red:       { primary: '#b91c1c', dark: '#7f1d1d', accent: '#faf6ee' },
    bicycle_blue:      { primary: '#1d4ed8', dark: '#1e3a8a', accent: '#faf6ee' },
    sapphire_lattice:  { primary: '#1d4ed8', dark: '#1e3a8a', accent: '#faf6ee' },
    casino_emerald:    { primary: '#047857', dark: '#064e3b', accent: '#e5c378' },
    digu_emerald:      { primary: '#047857', dark: '#064e3b', accent: '#e5c378' },
  };
  const t = themes[deckId] || themes.royal_lacquer;
  const pid = `pat_${deckId}`;

  return (
    <div className={`w-full h-full rounded-[10px] sm:rounded-[12px] overflow-hidden shadow-lg select-none ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 100 148" fill="none">
        <defs>
          <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 3L3 0L6 3L3 6Z" fill="none" stroke={t.accent} strokeWidth="0.55" strokeOpacity="0.32" />
            <circle cx="3" cy="3" r="0.7" fill={t.accent} fillOpacity="0.35" />
          </pattern>
        </defs>
        {/* Crisp White/Ivory Physical Poker Border */}
        <rect width="100" height="148" rx="10" fill="#faf6ee" />
        {/* Colored Guilloché Field */}
        <rect x="5.5" y="5.5" width="89" height="137" rx="6" fill={t.primary} />
        <rect x="5.5" y="5.5" width="89" height="137" rx="6" fill={`url(#${pid})`} />
        {/* Double Filigree Framing */}
        <rect x="8.5" y="8.5" width="83" height="131" rx="4" stroke={t.accent} strokeWidth="1.3" />
        <rect x="11" y="11" width="78" height="126" rx="2.5" stroke={t.accent} strokeWidth="0.6" strokeDasharray="2 1.5" />

        {/* 4 Corner Rosette Flourishes */}
        <circle cx="16" cy="16" r="3.5" fill={t.dark} stroke={t.accent} strokeWidth="1" />
        <circle cx="84" cy="16" r="3.5" fill={t.dark} stroke={t.accent} strokeWidth="1" />
        <circle cx="16" cy="132" r="3.5" fill={t.dark} stroke={t.accent} strokeWidth="1" />
        <circle cx="84" cy="132" r="3.5" fill={t.dark} stroke={t.accent} strokeWidth="1" />

        {/* Top Symmetrical Medallion */}
        <g transform="translate(50, 44)">
          <circle cx="0" cy="0" r="21" fill={t.dark} stroke={t.accent} strokeWidth="1.4" />
          <circle cx="0" cy="0" r="17" stroke={t.accent} strokeWidth="0.7" strokeDasharray="2 1.5" />
          <path d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" fill={t.primary} stroke={t.accent} strokeWidth="1" />
          <circle cx="0" cy="0" r="4.5" fill={t.accent} />
        </g>

        {/* Bottom Symmetrical Medallion */}
        <g transform="translate(50, 104)">
          <circle cx="0" cy="0" r="21" fill={t.dark} stroke={t.accent} strokeWidth="1.4" />
          <circle cx="0" cy="0" r="17" stroke={t.accent} strokeWidth="0.7" strokeDasharray="2 1.5" />
          <path d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" fill={t.primary} stroke={t.accent} strokeWidth="1" />
          <circle cx="0" cy="0" r="4.5" fill={t.accent} />
        </g>

        {/* Center Clasp Band */}
        <rect x="28" y="68" width="44" height="12" rx="6" fill={t.dark} stroke={t.accent} strokeWidth="1.3" />
        <text x="50" y="76.5" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize="6.5" fill={t.accent} letterSpacing="1.5">DIGU</text>
      </svg>
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
  const activeDeck = useGameStore(state => state.activeDeck) || 'royal_lacquer';
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const ink = isRed ? '#b91c1c' : '#0f172a';
  const gold = '#d4af37';
  const navy = '#1e293b';
  const crimson = '#b91c1c';
  const rankText = RANK_LABELS[card.rank];
  const fontSize = rankText === '10' ? '16' : '18';
  const letterSpacing = rankText === '10' ? '-1.5' : '0';

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

  const uid = `court_${card.id}`;

  return (
    <motion.div
      whileHover={isInteractive && !isSelected ? { y: size === 'hand' ? -10 : -6, scale: 1.02 } : undefined}
      animate={
        isSelected
          ? { y: size === 'hand' ? -24 : -16, scale: size === 'hand' ? 1.05 : 1.04 }
          : meldHighlight
          ? { y: size === 'hand' ? -6 : -4, scale: 1.01 }
          : { y: 0, scale: 1 }
      }
      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
      onClick={onClick}
      className={`${SIZE_CLASSES[size]} select-none relative bg-gradient-to-br from-[#ffffff] via-[#fcfaf5] to-[#f4efe4] border border-[#301a14]/30 shadow-md ${
        isSelected
          ? 'ring-3 ring-[#e5c378] shadow-[0_20px_35px_rgba(229,195,120,0.55)] z-40'
          : meldHighlight
          ? 'ring-2 ring-[#e5c378]/70 shadow-lg'
          : 'hover:shadow-xl'
      } ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Stranded Ace Hazard Warning Badge (-15 Debt) */}
      {isAceStranded && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#c84b31] text-[#f7f0ea] font-sans font-black text-[7px] sm:text-[8px] px-2 py-0.5 rounded-full shadow-lg border border-[#e5c378] flex items-center gap-0.5 animate-bounce z-40 whitespace-nowrap pointer-events-none">
          <span>⚠️ -15 DEBT</span>
        </div>
      )}

      {/* Meld Type Pill if Part of Meld */}
      {meldHighlight?.type && (
        <div className="absolute -top-2.5 right-1 bg-[#301a14] text-[#e5c378] border border-[#e5c378]/60 text-[6.5px] sm:text-[7.5px] font-mono font-black px-1.5 py-0.2 rounded-full shadow z-30 pointer-events-none">
          {meldHighlight.type}
        </div>
      )}

      {/* SVG Canvas for Physical Card */}
      <svg className="w-full h-full select-none pointer-events-none" viewBox="0 0 100 148" fill="none">
        {/* TOP-LEFT STACKED PHYSICAL CORNER INDEX */}
        <g>
          <text
            x="11"
            y="21"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize={fontSize}
            letterSpacing={letterSpacing}
            fill={ink}
          >
            {rankText}
          </text>
          {getSuitSVGPath(card.suit, 11, 32, 0.62, ink)}
        </g>

        {/* CENTER ARTWORK */}
        {rankText === 'A' && card.suit === 'SPADES' ? (
          /* BICYCLE / ROYAL ORNATE ACE OF SPADES FILIGREE MEDALLION */
          <g>
            <rect x="20" y="14" width="60" height="120" rx="4" stroke={gold} strokeWidth="0.9" strokeOpacity="0.7" fill="none" />
            <g transform="translate(50, 72)">
              <circle cx="0" cy="0" r="27" stroke={gold} strokeWidth="1.2" strokeDasharray="2 1.5" fill="#faf6ee" />
              <circle cx="0" cy="0" r="23" stroke={ink} strokeWidth="0.8" strokeOpacity="0.4" fill="none" />
              <path d="M0 -24 C-11 -11 -21 -2 -21 9 C-21 16 -15 20 -8.5 20 C-4.5 20 -1.5 17.5 0 14.5 C1.5 17.5 4.5 20 8.5 20 C15 20 21 16 21 9 C21 -2 11 -11 0 -24 Z" fill={ink} />
              <path d="M-2.8 12 L-8 25 L8 25 L2.8 12 Z" fill={ink} />
              <path d="M0 -17 C-7 -7 -14 0 -14 8 C-14 12.5 -10 15 -5.5 15 C-2.5 15 0 12.5 0 10 C0 12.5 2.5 15 5.5 15 C10 15 14 12.5 14 8 C14 0 7 -7 0 -17 Z" stroke={gold} strokeWidth="1.2" fill="none" />
              <path d="M-7 4 L-5 -3 L0 1 L5 -3 L7 4 Z" fill={gold} />
              <circle cx="0" cy="7" r="2.2" fill="#faf6ee" />
              <rect x="-22" y="27" width="44" height="7" rx="2" fill="#faf6ee" stroke={gold} strokeWidth="1" />
              <text x="0" y="32.2" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="4.5" fontWeight="900" fill={ink} letterSpacing="0.8">ROYAL DIGU</text>
            </g>
          </g>
        ) : rankText === 'A' ? (
          /* Casino Ornate Ace */
          <g>
            <rect x="20" y="14" width="60" height="120" rx="4" stroke={gold} strokeWidth="0.9" strokeOpacity="0.7" fill="none" />
            <circle cx="50" cy="74" r="22" stroke={gold} strokeWidth="1.4" strokeDasharray="3 1.5" fill={ink} fillOpacity="0.04" />
            <circle cx="50" cy="74" r="17" stroke={ink} strokeWidth="0.8" strokeOpacity="0.3" fill="none" />
            {getSuitSVGPath(card.suit, 50, 74, 1.55, ink)}
          </g>
        ) : rankText === 'K' || rankText === 'Q' || rankText === 'J' ? (
          /* DOUBLE-HEADED (TWO-WAY MIRRORED) COURT PORTRAIT */
          <g>
            <defs>
              <clipPath id={`${uid}_top`}>
                <polygon points="22,16 78,16 78,70 22,78" />
              </clipPath>
              <clipPath id={`${uid}_bot`}>
                <polygon points="22,78 78,70 78,132 22,132" />
              </clipPath>
            </defs>
            <rect x="21" y="15" width="58" height="118" rx="3" fill="#faf5e8" stroke={gold} strokeWidth="1.5" />
            <rect x="23" y="17" width="54" height="114" rx="2" fill="none" stroke={ink} strokeWidth="0.7" strokeOpacity="0.6" />

            {/* Top Half */}
            <g clipPath={`url(#${uid}_top)`}>
              {getSuitSVGPath(card.suit, 30, 30, 0.58, ink)}
              <path d="M26 74 C27 54 36 48 50 48 C64 48 73 54 74 74 Z" fill={isRed ? crimson : navy} stroke={ink} strokeWidth="1.3" />
              <path d="M36 49 L50 69 L64 49" fill="none" stroke={gold} strokeWidth="3.5" />
              <path d="M42 49 L50 61 L58 49" fill="#faf6ee" stroke={ink} strokeWidth="1" />
              <circle cx="34" cy="62" r="1.5" fill={gold} />
              <circle cx="66" cy="62" r="1.5" fill={gold} />
              <path d="M40 33 C39 28 61 28 60 33 L59 43 C59 48 41 48 41 43 Z" fill="#fae8d4" stroke={ink} strokeWidth="1.2" />
              <path d="M39 33 C36 36 36 43 40 45 M61 33 C64 36 64 43 60 45" stroke={gold} strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <circle cx="46.5" cy="37.5" r="1" fill={ink} />
              <circle cx="53.5" cy="37.5" r="1" fill={ink} />
              <path d="M50 37.5 L49.2 41 L51 41" stroke={ink} strokeWidth="0.9" fill="none" />
              {rankText === 'K' ? (
                <path d="M43 43.5 Q50 48 57 43.5" stroke={ink} strokeWidth="1.5" fill="none" />
              ) : (
                <path d="M47.5 43.5 Q50 45 52.5 43.5" stroke={crimson} strokeWidth="1.2" fill="none" />
              )}
              {/* Crown */}
              {rankText === 'K' ? (
                <>
                  <path d="M36 33 L38 22 L44 28 L50 20 L56 28 L62 22 L64 33 Z" fill={gold} stroke={ink} strokeWidth="1.2" />
                  <circle cx="50" cy="19" r="1.8" fill={crimson} />
                  <line x1="65" y1="30" x2="60" y2="68" stroke={gold} strokeWidth="2.2" />
                </>
              ) : rankText === 'Q' ? (
                <>
                  <path d="M38 33 C38 24 44 21 50 20 C56 21 62 24 62 33 Z" fill={gold} stroke={ink} strokeWidth="1.2" />
                  <circle cx="50" cy="25" r="2.2" fill={crimson} />
                  <line x1="64" y1="38" x2="58" y2="66" stroke="#15803d" strokeWidth="1.6" />
                </>
              ) : (
                <>
                  <path d="M37 33 L41 24 L59 24 L63 33 Z" fill={isRed ? crimson : navy} stroke={gold} strokeWidth="1.3" />
                  <line x1="65" y1="26" x2="61" y2="68" stroke={ink} strokeWidth="2" />
                </>
              )}
            </g>

            {/* Bottom Mirrored Half */}
            <g clipPath={`url(#${uid}_bot)`}>
              <g transform="rotate(180 50 74)">
                {getSuitSVGPath(card.suit, 30, 30, 0.58, ink)}
                <path d="M26 74 C27 54 36 48 50 48 C64 48 73 54 74 74 Z" fill={isRed ? crimson : navy} stroke={ink} strokeWidth="1.3" />
                <path d="M36 49 L50 69 L64 49" fill="none" stroke={gold} strokeWidth="3.5" />
                <path d="M42 49 L50 61 L58 49" fill="#faf6ee" stroke={ink} strokeWidth="1" />
                <circle cx="34" cy="62" r="1.5" fill={gold} />
                <circle cx="66" cy="62" r="1.5" fill={gold} />
                <path d="M40 33 C39 28 61 28 60 33 L59 43 C59 48 41 48 41 43 Z" fill="#fae8d4" stroke={ink} strokeWidth="1.2" />
                <path d="M39 33 C36 36 36 43 40 45 M61 33 C64 36 64 43 60 45" stroke={gold} strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <circle cx="46.5" cy="37.5" r="1" fill={ink} />
                <circle cx="53.5" cy="37.5" r="1" fill={ink} />
                <path d="M50 37.5 L49.2 41 L51 41" stroke={ink} strokeWidth="0.9" fill="none" />
                {rankText === 'K' ? (
                  <path d="M43 43.5 Q50 48 57 43.5" stroke={ink} strokeWidth="1.5" fill="none" />
                ) : (
                  <path d="M47.5 43.5 Q50 45 52.5 43.5" stroke={crimson} strokeWidth="1.2" fill="none" />
                )}
                {rankText === 'K' ? (
                  <>
                    <path d="M36 33 L38 22 L44 28 L50 20 L56 28 L62 22 L64 33 Z" fill={gold} stroke={ink} strokeWidth="1.2" />
                    <circle cx="50" cy="19" r="1.8" fill={crimson} />
                    <line x1="65" y1="30" x2="60" y2="68" stroke={gold} strokeWidth="2.2" />
                  </>
                ) : rankText === 'Q' ? (
                  <>
                    <path d="M38 33 C38 24 44 21 50 20 C56 21 62 24 62 33 Z" fill={gold} stroke={ink} strokeWidth="1.2" />
                    <circle cx="50" cy="25" r="2.2" fill={crimson} />
                    <line x1="64" y1="38" x2="58" y2="66" stroke="#15803d" strokeWidth="1.6" />
                  </>
                ) : (
                  <>
                    <path d="M37 33 L41 24 L59 24 L63 33 Z" fill={isRed ? crimson : navy} stroke={gold} strokeWidth="1.3" />
                    <line x1="65" y1="26" x2="61" y2="68" stroke={ink} strokeWidth="2" />
                  </>
                )}
              </g>
            </g>
            <line x1="22" y1="78" x2="78" y2="70" stroke={gold} strokeWidth="2.4" />
            <line x1="22" y1="78" x2="78" y2="70" stroke={ink} strokeWidth="0.7" />
          </g>
        ) : (
          /* JUMBO-INDEX NUMBER CARDS (2-10) */
          <g>
            <rect x="22" y="16" width="56" height="116" rx="4" stroke={ink} strokeWidth="0.6" strokeOpacity="0.18" fill="none" />
            {getSuitSVGPath(card.suit, 31, 28, 0.48, ink)}
            <g transform="rotate(180 69 120)">
              {getSuitSVGPath(card.suit, 69, 120, 0.48, ink)}
            </g>
            {getSuitSVGPath(card.suit, 50, 74, 1.55, ink)}
          </g>
        )}

        {/* BOTTOM-RIGHT INVERTED STACKED PHYSICAL CORNER INDEX */}
        <g transform="rotate(180 50 74)">
          <text
            x="11"
            y="21"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize={fontSize}
            letterSpacing={letterSpacing}
            fill={ink}
          >
            {rankText}
          </text>
          {getSuitSVGPath(card.suit, 11, 32, 0.62, ink)}
        </g>
      </svg>
    </motion.div>
  );
};
