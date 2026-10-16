import React from 'react';
import { motion } from 'framer-motion';
import { Card, PlayerState, MeldValidationResult } from '../../core/models/types';
import { PlayingCard } from '../shared/PlayingCard';
import {
  ArrowDownToLine,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface PlayerHandTrayProps {
  player: PlayerState;
  stagedMelds: [Card[], Card[], Card[]];
  unassignedCards: Card[];
  slotValidations: [MeldValidationResult | null, MeldValidationResult | null, MeldValidationResult | null];
  selectedCardId: string | null;
  isActionPhase: boolean;
  onCardClick: (cardId: string) => void;
  onSlotClick: (slotIndex: 0 | 1 | 2) => void;
  onAutoArrange: () => void;
  onClearSlots: () => void;
  onDiscardSelected: () => void;
  onSlamFinish: () => void;
}

const MELD_SLOTS = [
  { label: 'Meld 1 (4 Cards)', max: 4, index: 0 as const },
  { label: 'Meld 2 (3 Cards)', max: 3, index: 1 as const },
  { label: 'Meld 3 (3 Cards)', max: 3, index: 2 as const },
];

export const PlayerHandTray: React.FC<PlayerHandTrayProps> = ({
  player,
  stagedMelds,
  unassignedCards,
  slotValidations,
  selectedCardId,
  isActionPhase,
  onCardClick,
  onSlotClick,
  onAutoArrange,
  onClearSlots,
  onDiscardSelected,
  onSlamFinish,
}) => {
  // Check if hand satisfies 4+3+3 Gin (all 3 slots valid and filled)
  const isSlot0Valid = stagedMelds[0].length === 4 && slotValidations[0]?.isValid;
  const isSlot1Valid = stagedMelds[1].length === 3 && slotValidations[1]?.isValid;
  const isSlot2Valid = stagedMelds[2].length === 3 && slotValidations[2]?.isValid;
  const isGinReady = isSlot0Valid && isSlot1Valid && isSlot2Valid;

  return (
    <div className="bg-[#2C1B10] border-2 sm:border-4 border-[#D4AF37]/60 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col gap-3">
      {/* Hand & Meld Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#D4AF37]/30 pb-2.5">
        {/* Player Meta & Hand Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-black text-[#FAF7F2]">
              {player.name}
            </span>
            {player.teamId && (
              <span className="text-[10px] font-extrabold bg-[#0F3838] text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/40">
                {player.teamId}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span>
              Total Hand: <strong className="text-white">{player.hand.length}</strong>
            </span>
            <span className="text-slate-500">•</span>
            {isGinReady ? (
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 4+3+3 Gin Ready!
              </span>
            ) : (
              <span className="text-amber-300/90 text-[11px]">
                Organize hand into 4 + 3 + 3 melds
              </span>
            )}
          </div>
        </div>

        {/* Global Hand Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAutoArrange}
            className="flex items-center gap-1 text-xs font-black text-[#2C1B10] bg-[#D4AF37] hover:bg-[#c49f2e] px-3 py-1.5 rounded-xl transition shadow active:scale-95 cursor-pointer"
            title="Automatically arrange your cards into the best meld combination"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Arrange Hand
          </button>

          <button
            onClick={onClearSlots}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-[#0F3838] px-2.5 py-1.5 rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
            title="Reset melds to unassigned dock"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>

          {/* Discard Selected Card (Active turn only) */}
          {isActionPhase && (
            <button
              disabled={!selectedCardId}
              onClick={onDiscardSelected}
              className={`flex items-center gap-1 text-xs font-black px-3.5 py-1.5 rounded-xl transition shadow active:scale-95 ${
                selectedCardId
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Discard
            </button>
          )}

          {/* Slam Finish Card & Declare Gin */}
          {isActionPhase && (
            <button
              onClick={onSlamFinish}
              className={`flex items-center gap-1 text-xs font-black px-4 py-1.5 rounded-xl transition shadow-lg active:scale-95 ${
                isGinReady
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 ring-4 ring-emerald-500/40 animate-pulse cursor-pointer'
                  : 'bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2C1B10] cursor-pointer'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Slam Finish & Declare Gin
            </button>
          )}
        </div>
      </div>

      {/* Unified Meld Dropzones & Hand Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* 3 Dedicated Meld Slots (4 + 3 + 3) */}
        {MELD_SLOTS.map(({ label, max, index }) => {
          const cardsInSlot = stagedMelds[index];
          const validation = slotValidations[index];
          const isSlotFull = cardsInSlot.length === max;

          return (
            <motion.div
              key={index}
              layout
              onClick={() => onSlotClick(index)}
              className={`min-h-[140px] rounded-2xl p-2.5 sm:p-3 border-2 transition-all flex flex-col justify-between cursor-pointer ${
                validation?.isValid
                  ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30 shadow-emerald-950/30 shadow-lg'
                  : validation && !validation.isValid
                  ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 shadow-rose-950/30 shadow-lg'
                  : selectedCardId
                  ? 'bg-[#124444]/60 border-dashed border-[#D4AF37] hover:border-[#D4AF37] shadow-md ring-2 ring-[#D4AF37]/30'
                  : 'bg-[#124444]/40 border-dashed border-[#D4AF37]/40 hover:border-[#D4AF37]'
              }`}
            >
              {/* Slot Header */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-200">{label}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isSlotFull ? 'bg-emerald-900/60 text-emerald-300' : 'bg-[#0F3838] text-slate-400'
                  }`}
                >
                  {cardsInSlot.length} / {max}
                </span>
              </div>

              {/* Cards in this Meld Slot */}
              <div className="flex flex-wrap gap-1.5 my-2 min-h-[82px] items-center">
                {cardsInSlot.map(c => (
                  <PlayingCard
                    key={c.id}
                    card={c}
                    size="sm"
                    isSelected={selectedCardId === c.id}
                    onClick={() => onCardClick(c.id)}
                  />
                ))}

                {cardsInSlot.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[11px] text-slate-400 italic py-4 text-center">
                    {selectedCardId
                      ? 'Tap here to drop selected card'
                      : 'Meld slot empty'}
                  </div>
                )}
              </div>

              {/* Real-Time Meld Diagnostics */}
              <div className="pt-1 border-t border-slate-700/60 min-h-[22px] flex items-center">
                {validation ? (
                  <div
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      validation.isValid ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {validation.isValid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>
                          Valid {validation.type} (+{validation.points}p)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate" title={validation.error}>
                          {validation.error}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">Awaiting cards</span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* 4th Column: Unassigned / Draw Dock (Holding 11th card or unmelded cards) */}
        <div className="min-h-[140px] rounded-2xl p-2.5 sm:p-3 border-2 border-slate-700/80 bg-[#124444]/30 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-amber-300">Unassigned / 11th Card</span>
            <span className="text-[10px] font-mono text-slate-400 font-bold bg-[#0F3838] px-1.5 py-0.5 rounded">
              {unassignedCards.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 my-2 min-h-[82px] items-center">
            {unassignedCards.map(c => (
              <PlayingCard
                key={c.id}
                card={c}
                size="sm"
                isSelected={selectedCardId === c.id}
                onClick={() => onCardClick(c.id)}
              />
            ))}

            {unassignedCards.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-[11px] text-slate-400 italic py-4 text-center">
                No unassigned cards
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-slate-700/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Deadwood debt liability</span>
            {unassignedCards.length > 0 && (
              <span className="text-rose-400 font-bold">
                -{unassignedCards.reduce((sum, c) => sum + (c.rank === 1 ? 15 : c.rank >= 10 ? 10 : c.rank), 0)}p
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
