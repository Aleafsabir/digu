import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TableRules } from '../../core/models/types';
import { Shield, Target, Play, ChevronLeft, Coins, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { JuicyButton } from '../shared/JuicyButton';
import { RulesModal } from '../shared/RulesModal';

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
  const [showRules, setShowRules] = useState(false);
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
        return 'Holhuashi: Digu';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 select-none overflow-y-auto font-sans-clean text-[#f7f0ea]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(200,75,49,0.15)] max-w-lg w-full text-[#f7f0ea] relative border-2 border-[#301a14]"
        >
          {/* Header with Back Button, Mode Title + Rules Button, & Balance */}
          <div className="flex items-center justify-between border-b border-[#301a14] pb-3 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-bold text-[#e5c378]/70 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#e5c378]" />
              <h3 className="font-black text-sm sm:text-base text-[#e5c378] uppercase tracking-wider font-serif-luxury">
                {getModeTitle()}
              </h3>
              <button
                onClick={() => setShowRules(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#170b09] hover:bg-[#301a14] border border-[#301a14] text-[#e5c378] text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-sm"
                title="View Digu Rules Cheat Sheet"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#e5c378]" />
                <span>Rules</span>
              </button>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0d0605] border border-[#301a14] text-xs font-mono font-bold text-[#e5c378]">
              <span>🪙</span>
              <span>{profile.coins.toLocaleString()}</span>
            </div>
          </div>

          {/* Stakes & Options Selectors: Balanced 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* Table Stake Buy-In */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
              <span className="text-[11px] font-black text-[#f7f0ea]/70 uppercase tracking-wide flex items-center gap-1 mb-2.5 font-mono">
                <Coins className="w-3.5 h-3.5 text-[#e5c378]" /> Table Buy-In
              </span>
              <div className="flex items-center gap-2">
                {[250, 1000, 5000].map(stake => (
                  <button
                    key={stake}
                    onClick={() => onUpdateRules({ buyIn: stake })}
                    className={`flex-1 py-2 rounded-xl font-black text-xs font-mono transition cursor-pointer border ${
                      currentBuyIn === stake
                        ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white border-[#e5c378] shadow-[0_0_15px_rgba(200,75,49,0.4)] scale-[1.02]'
                        : 'bg-[#170b09] text-[#f7f0ea]/70 border-[#301a14] hover:bg-[#301a14]'
                    }`}
                  >
                    {stake >= 1000 ? `${stake / 1000}k` : stake}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#e5c378] font-bold mt-2 text-center font-mono">
                Total Pot: {totalPot.toLocaleString()} Coins
              </span>
            </div>

            {/* Target Score */}
            <div className="bg-[#0d0605] border border-[#301a14] rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
              <span className="text-[11px] font-black text-[#f7f0ea]/70 uppercase tracking-wide flex items-center gap-1 mb-2.5 font-mono">
                <Target className="w-3.5 h-3.5 text-[#e5c378]" /> Target Score
              </span>
              <div className="flex items-center gap-2">
                {[500, 1000, 1500].map(score => (
                  <button
                    key={score}
                    onClick={() => onUpdateRules({ targetScore: score })}
                    className={`flex-1 py-2 rounded-xl font-black text-xs font-mono transition cursor-pointer border ${
                      pendingRules.targetScore === score
                        ? 'bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] text-white border-[#e5c378] shadow-[0_0_15px_rgba(200,75,49,0.4)] scale-[1.02]'
                        : 'bg-[#170b09] text-[#f7f0ea]/70 border-[#301a14] hover:bg-[#301a14]'
                    }`}
                  >
                    {score}p
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#f7f0ea]/60 font-semibold mt-2 text-center font-mono">
                Match Winning Goal
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-2xl bg-[#170b09] hover:bg-[#301a14] border border-[#301a14] text-[#f7f0ea] text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Back
            </button>
            {hasEnoughCoins ? (
              <JuicyButton variant="gold" size="md" onClick={onConfirm} className="flex-[2] py-3">
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

      {/* Rules Cheat Sheet Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </>
  );
};
