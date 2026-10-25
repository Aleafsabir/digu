import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DhihaehVariant } from '../../core/dhihaeh/dhihaehTypes';
import { X } from 'lucide-react';

interface DhihaehSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (variant: DhihaehVariant, targetScore: number) => void;
}

export const DhihaehSetupModal: React.FC<DhihaehSetupModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [variant, setVariant] = useState<DhihaehVariant>('DYNAMIC_CUT');
  const [targetScore, setTargetScore] = useState<number>(7);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#e5c378] p-5 sm:p-6 shadow-[0_0_50px_rgba(229,195,120,0.35)] flex flex-col text-[#f7f0ea]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#0d0605] border border-[#301a14] text-[#f7f0ea]/70 hover:text-white flex items-center justify-center cursor-pointer transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#301a14] border-2 border-[#e5c378] flex items-center justify-center text-[#e5c378] shadow">
            <span className="font-thaana text-2xl font-black">ދި</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif-luxury text-white flex items-center gap-2">
              DHIHAEH <span className="font-thaana text-xl text-[#e5c378]">ދިހައެއް</span>
            </h2>
            <p className="text-xs text-[#f7f0ea]/70">
              4-Player 2v2 Partnership • 13 Tricks • Capture the 10s
            </p>
          </div>
        </div>

        {/* Section 1: Trump Variant Selector */}
        <div className="mb-4">
          <label className="text-xs font-mono font-bold text-[#e5c378] uppercase tracking-wider block mb-2">
            Trump Declaration Variant:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVariant('DYNAMIC_CUT')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                variant === 'DYNAMIC_CUT'
                  ? 'bg-[#301a14] border-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.3)] ring-1 ring-[#e5c378]'
                  : 'bg-[#0d0605]/80 border-[#301a14] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#e5c378]">Dynamic Cut</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#e5c378]/20 text-[#e5c378]">
                  DEFAULT
                </span>
              </div>
              <p className="text-[10px] text-[#f7f0ea]/70 leading-snug">
                Play starts with no trump. First player void in led suit cuts with any card, setting Trump.
              </p>
            </button>

            <button
              onClick={() => setVariant('BLIND_RESERVE')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                variant === 'BLIND_RESERVE'
                  ? 'bg-[#301a14] border-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.3)] ring-1 ring-[#e5c378]'
                  : 'bg-[#0d0605]/80 border-[#301a14] opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">Hidden Card</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300">
                  BLIND
                </span>
              </div>
              <p className="text-[10px] text-[#f7f0ea]/70 leading-snug">
                Opening player reserves 1 blind face-down card. Card is revealed on first void to set Trump.
              </p>
            </button>
          </div>
        </div>

        {/* Section 2: Target Score Selector */}
        <div className="mb-5">
          <label className="text-xs font-mono font-bold text-[#e5c378] uppercase tracking-wider block mb-2">
            Target Match Points:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 7, 10].map(score => (
              <button
                key={score}
                onClick={() => setTargetScore(score)}
                className={`py-2 rounded-xl border text-center font-mono font-black text-xs transition cursor-pointer ${
                  targetScore === score
                    ? 'bg-[#e5c378] text-[#0d0605] border-[#e5c378] shadow'
                    : 'bg-[#0d0605] text-[#f7f0ea]/70 border-[#301a14] hover:text-white'
                }`}
              >
                {score} Points
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onStart(variant, targetScore)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(200,75,49,0.5)] cursor-pointer transition active:scale-95"
        >
          Enter Dhihaeh Stadium
        </button>
      </motion.div>
    </div>
  );
};
