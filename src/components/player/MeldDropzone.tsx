import React from 'react';
import { motion } from 'framer-motion';
import { Card, MeldValidationResult } from '../../core/models/types';
import { PlayingCard } from '../shared/PlayingCard';
import { CheckCircle2, AlertCircle, Sparkles, Trash2 } from 'lucide-react';

interface MeldDropzoneProps {
  stagedMelds: [Card[], Card[], Card[]];
  slotValidations: [MeldValidationResult | null, MeldValidationResult | null, MeldValidationResult | null];
  selectedCardId: string | null;
  onSlotClick: (slotIndex: 0 | 1 | 2) => void;
  onUnstageCard: (cardId: string, slotIndex: 0 | 1 | 2) => void;
  onAutoArrange: () => void;
  onClearSlots: () => void;
}

const SLOTS_CONFIG = [
  { label: 'Slot 1 (4-Card Meld)', max: 4, index: 0 as const },
  { label: 'Slot 2 (3-Card Meld)', max: 3, index: 1 as const },
  { label: 'Slot 3 (3-Card Meld)', max: 3, index: 2 as const },
];

export const MeldDropzone: React.FC<MeldDropzoneProps> = ({
  stagedMelds,
  slotValidations,
  selectedCardId,
  onSlotClick,
  onUnstageCard,
  onAutoArrange,
  onClearSlots,
}) => {
  return (
    <div className="mt-4 pt-4 border-t-2 border-[#D4AF37]/30">
      {/* Dropzone Controls Header */}
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-[#D4AF37] uppercase tracking-wider">
            4 + 3 + 3 Meld Dropzones
          </span>
          <span className="text-[11px] text-slate-300 hidden sm:inline">
            (Gin requires One 4-Card Meld + Two 3-Card Melds, 0 Deadwood)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAutoArrange}
            className="flex items-center gap-1 text-xs font-bold text-[#2C1B10] bg-[#D4AF37] hover:bg-[#c49f2e] px-3 py-1.5 rounded-xl transition shadow active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Arrange
          </button>
          <button
            onClick={onClearSlots}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-[#2C1B10] px-3 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* 3 Dropzone Slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SLOTS_CONFIG.map(({ label, max, index }) => {
          const cardsInSlot = stagedMelds[index];
          const validation = slotValidations[index];

          return (
            <motion.div
              key={index}
              layout
              onClick={() => onSlotClick(index)}
              className={`min-h-[120px] rounded-2xl p-3 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                validation?.isValid
                  ? 'bg-[#170b09] border-[#e5c378] ring-2 ring-[#e5c378]/30 shadow-lg'
                  : validation && !validation.isValid
                  ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 shadow-rose-950/40 shadow-lg'
                  : selectedCardId
                  ? 'bg-[#170b09]/90 border-dashed border-[#e5c378] hover:bg-[#170b09] shadow-md ring-2 ring-[#e5c378]/30'
                  : 'bg-[#0d0605] border-dashed border-[#301a14] hover:border-[#e5c378]/50'
              }`}
            >
              {/* Slot Header */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#f7f0ea]">{label}</span>
                <span className="text-[10px] font-mono text-[#e5c378]/70">
                  {cardsInSlot.length} / {max} Cards
                </span>
              </div>

              {/* Cards Inside Slot */}
              <div className="flex flex-wrap gap-1.5 my-2 min-h-[64px] items-center">
                {cardsInSlot.map(c => (
                  <div
                    key={c.id}
                    onClick={e => {
                      e.stopPropagation();
                      onUnstageCard(c.id, index);
                    }}
                    title="Click card to return back to hand"
                  >
                    <PlayingCard
                      card={c}
                      size="sm"
                      className="cursor-pointer hover:scale-105 transition-transform shadow-md"
                    />
                  </div>
                ))}

                {cardsInSlot.length === 0 && (
                  <span className="text-xs text-[#f7f0ea]/40 italic">
                    {selectedCardId ? 'Click to place selected card here' : 'Dropzone empty'}
                  </span>
                )}
              </div>

              {/* Real-Time Meld Diagnostics */}
              {validation && (
                <div
                  className={`text-[10px] font-bold flex items-center gap-1.5 pt-1 border-t border-[#301a14] ${
                    validation.isValid ? 'text-[#e5c378]' : 'text-rose-300'
                  }`}
                >
                  {validation.isValid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#e5c378] shrink-0" />
                      <span>
                        Valid {validation.type} (+{validation.points} pts)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate" title={validation.error}>
                        {validation.error}
                      </span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
