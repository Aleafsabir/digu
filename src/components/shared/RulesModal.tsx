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
          className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(200,75,49,0.15)] max-w-lg w-full text-[#f7f0ea] relative my-auto max-h-[92dvh] flex flex-col justify-between border-2 border-[#301a14]"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[#301a14] pb-2.5 mb-3.5 shrink-0">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#e5c378]" />
              <h3 className="font-black text-sm sm:text-base text-[#e5c378] uppercase tracking-wider font-serif-luxury">
                Digu Rules Cheat Sheet
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[#e5c378]/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Graphical Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[70vh] py-1 text-xs">
            {/* Rule 1: Gin Meld Formula */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-[#f7f0ea]/70 tracking-wider flex items-center gap-1 font-mono">
                  <Layers className="w-3.5 h-3.5 text-[#e5c378]" /> Gin Hand
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#c84b31]/30 text-[#e5c378] border border-[#e5c378]/40 font-mono">
                  0 Deadwood
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 py-2">
                <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] text-white font-black text-xs shadow-sm">
                  4 Cards
                </div>
                <span className="text-[#e5c378] font-bold">+</span>
                <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] text-white font-black text-xs shadow-sm">
                  3 Cards
                </div>
                <span className="text-[#e5c378] font-bold">+</span>
                <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] text-white font-black text-xs shadow-sm">
                  3 Cards
                </div>
              </div>
              <div className="text-[10px] text-[#e5c378]/90 font-bold text-center mt-1 font-mono">
                🎴 11th card slammed face-down
              </div>
            </div>

            {/* Rule 2: Strict Ace Rule */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Strict Ace
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                  -15p Penalty
                </span>
              </div>
              <div className="space-y-1.5 my-auto">
                <div className="flex items-center justify-between bg-[#170b09] border border-[#301a14] px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold text-[#e5c378]">Sets Only (3–4)</span>
                  <span className="font-mono text-[#e5c378] font-bold">A♥ A♦ A♣ ✔️</span>
                </div>
                <div className="flex items-center justify-between bg-[#170b09] border border-[#301a14] px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold text-rose-300">No Runs</span>
                  <span className="font-mono text-rose-400 font-bold">A-2-3 ❌</span>
                </div>
              </div>
            </div>

            {/* Rule 3: 1,000-Point Special Run */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-[#f7f0ea]/70 tracking-wider flex items-center gap-1 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#e5c378]" /> Special Sequence
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#c84b31] text-white shadow font-mono">
                  +1,000p
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 bg-[#170b09] border border-[#301a14] py-2 px-1 rounded-xl my-auto font-mono font-black text-[11px] text-[#e5c378] tracking-wider">
                A • 2 • 3 • 4 • 5 • 6 • 7 • 8 • 9 • 10
              </div>
              <div className="text-[10px] text-center text-[#f7f0ea]/70 font-bold mt-1">
                Same suit • Instant win bonus
              </div>
            </div>

            {/* Rule 4: Team 2v2 Merger */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-[#e5c378] tracking-wider flex items-center gap-1 font-mono">
                  <Users className="w-3.5 h-3.5 text-[#e5c378]" /> Team 2v2
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#301a14] text-[#e5c378] border border-[#e5c378]/30 font-mono">
                  20 Cards
                </span>
              </div>
              <div className="flex items-center justify-around py-2 my-auto bg-[#170b09] border border-[#301a14] rounded-xl">
                <div className="text-center">
                  <div className="text-[10px] text-[#f7f0ea]/50 font-bold">Player</div>
                  <div className="font-mono font-black text-xs text-[#e5c378]">10 Cards</div>
                </div>
                <span className="text-[#e5c378] font-black">+</span>
                <div className="text-center">
                  <div className="text-[10px] text-[#f7f0ea]/50 font-bold">Partner</div>
                  <div className="font-mono font-black text-xs text-[#e5c378]">10 Cards</div>
                </div>
              </div>
              <div className="text-[10px] text-center text-[#f7f0ea]/60 font-bold mt-1">
                Solver optimizes melds & debt
              </div>
            </div>
          </div>

          {/* Close button */}
          <JuicyButton
            variant="gold"
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
