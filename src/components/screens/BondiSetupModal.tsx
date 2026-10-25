import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BondiVariant } from '../../core/bondi/bondiTypes';
import { X } from 'lucide-react';

interface BondiSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (variant: BondiVariant, playerCount: number) => void;
}

export const BondiSetupModal: React.FC<BondiSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [variant, setVariant] = useState<BondiVariant>('STANDARD');
  const [playerCount, setPlayerCount] = useState<number>(4);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#1a0c28] via-[#10071c] to-[#08030e] border-2 border-purple-500/80 p-5 sm:p-6 shadow-[0_0_50px_rgba(168,85,247,0.35)] flex flex-col text-[#f7f0ea]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#08030e] border border-purple-900/60 text-[#f7f0ea]/70 hover:text-white flex items-center justify-center cursor-pointer transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-800 to-purple-950 border-2 border-purple-400 flex items-center justify-center text-purple-200 shadow">
            <span className="font-thaana text-2xl font-black">ބ</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif-luxury text-white flex items-center gap-2">
              BONDI <span className="font-thaana text-xl text-purple-300">ބޮނޑި</span>
            </h2>
            <p className="text-xs text-purple-200/70">
              Cutthroat Card Shedding • Don't be the Bondi!
            </p>
          </div>
        </div>

        {/* Section 1: Penalty Variant Selector */}
        <div className="mb-4">
          <label className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider block mb-2">
            Penalty Rule Variant:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVariant('STANDARD')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                variant === 'STANDARD'
                  ? 'bg-purple-950/80 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                  : 'bg-[#08030e]/80 border-purple-950 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-purple-200">Standard Bondi</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300">
                  SINGLE CARD
                </span>
              </div>
              <p className="text-[10px] text-purple-200/70 leading-snug">
                When void in led suit, play 1 off-suit card. Highest card player takes entire trick pile.
              </p>
            </button>

            <button
              onClick={() => setVariant('SUIT_BONDI')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                variant === 'SUIT_BONDI'
                  ? 'bg-purple-950/80 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                  : 'bg-[#08030e]/80 border-purple-950 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">Suit Bondi</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300">
                  MASS DUMP
                </span>
              </div>
              <p className="text-[10px] text-purple-200/70 leading-snug">
                When void, dump every card of a chosen suit at once! At-risk player absorbs the entire mass dump.
              </p>
            </button>
          </div>
        </div>

        {/* Section 2: Player Count Selector */}
        <div className="mb-5">
          <label className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider block mb-2">
            Player Count (Cutthroat Free-For-All):
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[2, 3, 4, 5, 6].map(count => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                className={`py-2 rounded-xl border text-center font-mono font-black text-xs transition cursor-pointer ${
                  playerCount === count
                    ? 'bg-purple-500 text-[#08030e] border-purple-300 shadow font-bold'
                    : 'bg-[#08030e] text-purple-200/70 border-purple-950 hover:text-white'
                }`}
              >
                {count}P
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onStart(variant, playerCount)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(168,85,247,0.5)] cursor-pointer transition active:scale-95"
        >
          Enter Bondi Arena
        </button>
      </motion.div>
    </div>
  );
};
