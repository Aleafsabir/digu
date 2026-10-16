import React from 'react';
import { motion } from 'framer-motion';
import { TableRules } from '../../core/models/types';
import { Shield, Target, Play, ChevronLeft, Award, Coins } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { JuicyButton } from '../shared/JuicyButton';

interface RulesConfirmationModalProps {
  pendingRules: TableRules;
  onUpdateRules: (rules: Partial<TableRules>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const RulesConfirmationModal: React.FC<RulesConfirmationModalProps> = ({
  pendingRules,
  onUpdateRules,
  onConfirm,
  onBack,
}) => {
  const profile = useAuthStore(state => state.profile);
  const currentBuyIn = pendingRules.buyIn ?? 1000;
  const playerCount = pendingRules.mode === 'SOLO_2P' ? 2 : 4;
  const totalPot = currentBuyIn * playerCount;
  const hasEnoughCoins = profile.coins >= currentBuyIn;

  const getModeTitle = () => {
    switch (pendingRules.mode) {
      case 'TEAM_4P':
        return '4-Player Team Mode (2v2)';
      case 'SOLO_4P':
        return '4-Player Cutthroat (Solo)';
      case 'SOLO_2P':
        return '2-Player Head-to-Head';
      default:
        return 'Thaasbai Digu';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 select-none overflow-y-auto font-sans-clean">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xl w-full text-slate-100 relative border-2 border-slate-700"
      >
        {/* Header with Back Button & Balance */}
        <div className="flex items-center justify-between border-b border-emerald-950 pb-3 mb-3.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-slate-300" />
            <h3 className="font-black text-sm sm:text-base text-[#FAF7F2] uppercase tracking-wider">
              {getModeTitle()}
            </h3>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#02140D] border border-slate-700 text-xs font-mono font-bold text-[#F1F5F9]">
            <span>🪙</span>
            <span>{profile.coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Stakes & Options Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3.5">
          {/* Table Stake Buy-In */}
          <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Coins className="w-3 h-3 text-slate-400" /> Buy-In
            </span>
            <div className="flex items-center gap-1.5">
              {[250, 1000, 5000].map(stake => (
                <button
                  key={stake}
                  onClick={() => onUpdateRules({ buyIn: stake })}
                  className={`flex-1 py-1.5 rounded-xl font-black text-[11px] font-mono transition cursor-pointer border ${
                    currentBuyIn === stake
                      ? 'bg-slate-200 text-stone-950 border-white shadow-md'
                      : 'bg-white/[0.05] text-slate-300 border-slate-800 hover:bg-white/[0.08]'
                  }`}
                >
                  {stake >= 1000 ? `${stake / 1000}k` : stake}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[#05D59A] font-semibold mt-1 text-center font-mono">
              Pot: {totalPot.toLocaleString()}
            </span>
          </div>

          {/* Target Score */}
          <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Target className="w-3 h-3 text-slate-400" /> Target Score
            </span>
            <div className="flex items-center gap-1.5">
              {[500, 1000, 1500].map(score => (
                <button
                  key={score}
                  onClick={() => onUpdateRules({ targetScore: score })}
                  className={`flex-1 py-1.5 rounded-xl font-black text-[11px] font-mono transition cursor-pointer border ${
                    pendingRules.targetScore === score
                      ? 'bg-slate-200 text-stone-950 border-white shadow-md'
                      : 'bg-white/[0.05] text-slate-300 border-slate-800 hover:bg-white/[0.08]'
                  }`}
                >
                  {score}p
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 font-semibold mt-1 text-center font-mono">
              Match Goal
            </span>
          </div>

          {/* Deal Option */}
          <div className="bg-[#02140D] border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Award className="w-3 h-3 text-slate-400" /> Opening Deal
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'DEAL_11_CARDS' as const, label: '11 Lead' },
                { id: 'DRAW_FIRST_CARD' as const, label: '10 + Flip' },
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => onUpdateRules({ dealOption: d.id })}
                  className={`flex-1 py-1.5 px-0.5 rounded-xl font-bold text-[10px] transition cursor-pointer text-center border ${
                    pendingRules.dealOption === d.id
                      ? 'bg-slate-200 text-stone-950 border-white font-black shadow-md'
                      : 'bg-white/[0.05] text-slate-300 border-slate-800 hover:bg-white/[0.08]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[#05D59A] font-semibold mt-1 text-center font-mono">
              Starting Hand
            </span>
          </div>
        </div>

        {/* Visual Rules Formula */}
        <div className="grid grid-cols-3 gap-2 mb-4 font-sans-clean">
          <div className="bg-[#031B11] border border-slate-800 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-base mb-1">🎴</span>
            <span className="text-xs font-black text-white">4 + 3 + 3</span>
            <span className="text-[9px] font-bold text-[#05D59A]">0 Deadwood</span>
          </div>
          <div className="bg-[#031B11] border border-slate-800 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-base mb-1">🅰️</span>
            <span className="text-xs font-black text-white">Sets Only</span>
            <span className="text-[9px] font-bold text-rose-400">No Runs (A23 ❌)</span>
          </div>
          <div className="bg-[#031B11] border border-slate-800 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-base mb-1">👑</span>
            <span className="text-xs font-black text-white">10-Card Run</span>
            <span className="text-[9px] font-bold text-[#05D59A]">+1,000p Bonus</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-2.5 rounded-2xl bg-[#031B11] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Back
          </button>
          {hasEnoughCoins ? (
            <JuicyButton variant="platinum" size="md" onClick={onConfirm} className="flex-[2]">
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Deal & Play</span>
            </JuicyButton>
          ) : (
            <button
              disabled
              className="flex-[2] py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-rose-950/70 border border-rose-800 text-rose-300 cursor-not-allowed opacity-80 flex items-center justify-center gap-2"
            >
              <span>Need {currentBuyIn.toLocaleString()} Coins</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
