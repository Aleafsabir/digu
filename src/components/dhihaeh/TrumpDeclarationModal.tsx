import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suit, Rank } from '../../core/models/types';

interface TrumpDeclarationModalProps {
  isOpen: boolean;
  suit: Suit | null;
  cardRank?: Rank;
  cardSuit?: Suit;
  declaredByName: string;
  onDismiss: () => void;
}

const SUIT_DATA: Record<Suit, { nameEn: string; nameDv: string; symbol: string; color: string; bgGlow: string; border: string }> = {
  HEARTS: {
    nameEn: 'HEARTS',
    nameDv: 'ހިތް (އާޓްސް)',
    symbol: '♥',
    color: 'text-rose-500',
    bgGlow: 'shadow-[0_0_60px_rgba(244,63,94,0.35)]',
    border: 'border-rose-500/60',
  },
  DIAMONDS: {
    nameEn: 'DIAMONDS',
    nameDv: 'ދަލު (ދައިމަންޑް)',
    symbol: '♦',
    color: 'text-amber-500',
    bgGlow: 'shadow-[0_0_60px_rgba(245,158,11,0.35)]',
    border: 'border-amber-500/60',
  },
  SPADES: {
    nameEn: 'SPADES',
    nameDv: 'ހުކުރު (އިސްކޫލް)',
    symbol: '♠',
    color: 'text-sky-400',
    bgGlow: 'shadow-[0_0_60px_rgba(56,189,248,0.35)]',
    border: 'border-sky-500/60',
  },
  CLUBS: {
    nameEn: 'CLUBS',
    nameDv: 'ޗިޅިޔާ (ކަލާބަރު)',
    symbol: '♣',
    color: 'text-emerald-400',
    bgGlow: 'shadow-[0_0_60px_rgba(52,211,153,0.35)]',
    border: 'border-emerald-500/60',
  },
};

export const TrumpDeclarationModal: React.FC<TrumpDeclarationModalProps> = ({
  isOpen,
  suit,
  cardRank,
  cardSuit,
  declaredByName,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen || !suit) return;

    setProgress(100);
    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds auto-dismiss

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isOpen, suit, onDismiss]);

  if (!isOpen || !suit) return null;

  const data = SUIT_DATA[suit];

  return (
    <AnimatePresence>
      <div
        onClick={onDismiss}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none pointer-events-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 350 }}
          onClick={e => e.stopPropagation()}
          className={`relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 ${data.border} p-5 text-center flex flex-col items-center ${data.bgGlow} shadow-2xl overflow-hidden`}
        >
          {/* Top Banner Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#301a14]/90 border border-[#e5c378]/50 text-[#e5c378] text-[11px] font-bold tracking-widest uppercase mb-3 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e5c378] animate-ping" />
            <span>TRUMP CUT DECLARED</span>
          </div>

          {/* Dhivehi Calligraphy Title */}
          <h2 className="text-2xl font-black text-[#e5c378] tracking-wide mb-1 font-serif-luxury">
            ހުކުމް ކަނޑައެޅުން
          </h2>

          {/* Declarer Subtitle */}
          <p className="text-xs text-[#f7f0ea]/80 mb-3">
            <span className="font-bold text-white text-sm">{declaredByName}</span> has cut on a void!
          </p>

          {/* Large Suit Icon & Name Card */}
          <div className="relative w-full py-4 px-3 rounded-2xl bg-[#0d0605]/80 border border-[#301a14] flex flex-col items-center justify-center my-1">
            {/* Glowing background burst */}
            <div className={`text-6xl sm:text-7xl ${data.color} filter drop-shadow-[0_0_20px_currentColor] leading-none mb-1 animate-pulse`}>
              {data.symbol}
            </div>

            <div className="text-lg font-black text-[#f7f0ea] tracking-wider uppercase">
              {data.nameEn}
            </div>
            <div className="text-sm font-bold text-[#e5c378] opacity-90">
              {data.nameDv}
            </div>

            {/* Cut Card Badge */}
            {cardRank && (
              <div className="mt-2 text-[11px] font-mono text-[#f7f0ea]/70 px-2 py-0.5 rounded bg-[#170b09] border border-[#301a14]">
                Cut Card: <strong className="text-white">{cardRank} of {cardSuit || suit}</strong>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] border border-[#e5c378]/50 text-white font-bold text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-98 transition cursor-pointer"
          >
            Got It
          </button>

          {/* Auto-dismiss progress bar */}
          <div className="w-full h-1 bg-[#301a14] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-[#e5c378] to-[#c84b31] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
