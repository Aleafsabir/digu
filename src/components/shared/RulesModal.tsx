import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X, Sparkles, AlertTriangle, Users, Layers } from 'lucide-react';
import { JuicyButton } from './JuicyButton';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto font-sans-clean">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-lg w-full text-slate-100 relative my-auto max-h-[92dvh] flex flex-col justify-between border-2 border-slate-700"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-emerald-950 pb-2.5 mb-3.5 shrink-0">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#05D59A]" />
              <h3 className="font-black text-sm sm:text-base text-[#F1F5F9] uppercase tracking-wider">
                Digu Rules Cheat Sheet
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Graphical Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[70vh] py-1 text-xs">
            {/* Rule 1: Gin Meld Formula */}
            <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Gin Hand
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#05D59A]/20 text-[#05D59A]">
                  0 Deadwood
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 py-2">
                <div className="px-2 py-1 rounded-lg btn-3d-platinum text-slate-950 font-black text-xs">
                  4 Cards
                </div>
                <span className="text-slate-400 font-bold">+</span>
                <div className="px-2 py-1 rounded-lg btn-3d-platinum text-slate-950 font-black text-xs">
                  3 Cards
                </div>
                <span className="text-slate-400 font-bold">+</span>
                <div className="px-2 py-1 rounded-lg btn-3d-platinum text-slate-950 font-black text-xs">
                  3 Cards
                </div>
              </div>
              <div className="text-[10px] text-slate-300 font-bold text-center mt-1">
                🎴 11th card slammed face-down
              </div>
            </div>

            {/* Rule 2: Strict Ace Rule */}
            <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Strict Ace
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                  -15p Penalty
                </span>
              </div>
              <div className="space-y-1.5 my-auto">
                <div className="flex items-center justify-between bg-white/[0.05] px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold text-[#05D59A]">Sets Only (3–4)</span>
                  <span className="font-mono text-[#05D59A] font-bold">A♥ A♦ A♣ ✔️</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.05] px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold text-rose-300">No Runs</span>
                  <span className="font-mono text-rose-400 font-bold">A-2-3 ❌</span>
                </div>
              </div>
            </div>

            {/* Rule 3: 1,000-Point Special Run */}
            <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#05D59A]" /> Special Sequence
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#05D59A] text-slate-950 shadow">
                  +1,000p
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 bg-[#010D08] border border-slate-800 py-2 px-1 rounded-xl my-auto font-mono font-black text-[11px] text-[#05D59A] tracking-wider">
                A • 2 • 3 • 4 • 5 • 6 • 7 • 8 • 9 • 10
              </div>
              <div className="text-[10px] text-center text-slate-300 font-bold mt-1">
                Same suit • Instant win bonus
              </div>
            </div>

            {/* Rule 4: Team 2v2 Merger */}
            <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-[#818CF8] tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#818CF8]" /> Team 2v2
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#818CF8]/20 text-[#818CF8]">
                  20 Cards
                </span>
              </div>
              <div className="flex items-center justify-around py-2 my-auto bg-[#010D08] border border-slate-800 rounded-xl">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 font-bold">Player</div>
                  <div className="font-mono font-black text-xs text-[#818CF8]">10 Cards</div>
                </div>
                <span className="text-slate-500 font-black">+</span>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 font-bold">Partner</div>
                  <div className="font-mono font-black text-xs text-[#818CF8]">10 Cards</div>
                </div>
              </div>
              <div className="text-[10px] text-center text-slate-400 font-bold mt-1">
                Solver optimizes melds & debt
              </div>
            </div>
          </div>

          {/* Close button */}
          <JuicyButton
            variant="platinum"
            size="md"
            onClick={onClose}
            className="w-full mt-3"
          >
            Close
          </JuicyButton>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
