import React, { useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Card, PlayerState } from '../../core/models/types';
import { HandAnalysis } from '../../store/useGameStore';
import { PlayingCard, MeldColor, MeldHighlight } from '../shared/PlayingCard';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface GinRummyHandProps {
  player?: PlayerState;
  handCards: Card[];
  selectedCardId: string | null;
  sortMode: 'CUSTOM' | 'RANK' | 'SUIT' | 'MELDS' | 'RUNS' | 'SETS';
  handAnalysis: HandAnalysis;
  isActionPhase: boolean;
  onCardClick: (cardId: string, forceSelect?: boolean) => void;
  onReorderHand: (newCards: Card[]) => void;
  onSortHand: (mode: 'RANK' | 'SUIT' | 'MELDS' | 'RUNS' | 'SETS') => void;
  onMoveCard?: (fromIndex: number, toIndex: number) => void;
  onDiscardCard: (cardId: string, fromPoint?: { x: number; y: number }) => void;
  onDiscardSelected: () => void;
  onSlamFinish?: () => void;
  hiddenCardId?: string | null;
  draggedDrawIndex?: number | null;
}

const MELD_COLORS: MeldColor[] = ['cyan', 'emerald', 'amber', 'purple'];

export const GinRummyHand: React.FC<GinRummyHandProps> = ({
  handCards,
  selectedCardId,
  sortMode,
  handAnalysis,
  isActionPhase,
  onCardClick,
  onReorderHand,
  onSortHand,
  onMoveCard,
  onDiscardCard,
  onDiscardSelected,
  onSlamFinish: _onSlamFinish,
  hiddenCardId,
  draggedDrawIndex,
}) => {
  const is11Cards = handCards.length === 11;
  const canGin = handAnalysis.isGinReady || handAnalysis.isThousandRunReady;
  const isDraggingRef = useRef(false);
  const [isDraggingUp, setIsDraggingUp] = useState(false);
  const lastClickTimeRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const { remainingSeconds, isHumanTurn } = useTurnTimer();
  const timerRadius = 9;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference - (remainingSeconds / 30) * timerCircumference;
  const timerColor =
    remainingSeconds > 12 ? '#05D59A' : remainingSeconds > 6 ? '#F59E0B' : '#EF4444';

  const selectedIndex = selectedCardId ? handCards.findIndex(c => c.id === selectedCardId) : -1;

  const handleMoveLeft = () => {
    if (selectedIndex > 0 && onMoveCard) {
      onMoveCard(selectedIndex, selectedIndex - 1);
    }
  };

  const handleMoveRight = () => {
    if (selectedIndex >= 0 && selectedIndex < handCards.length - 1 && onMoveCard) {
      onMoveCard(selectedIndex, selectedIndex + 1);
    }
  };

  const handleCardClick = (cardId: string) => {
    if (isDraggingRef.current) return;
    const now = Date.now();
    // Double tap/click to instantly discard during action phase
    if (isActionPhase && lastClickTimeRef.current.id === cardId && now - lastClickTimeRef.current.time < 380) {
      lastClickTimeRef.current = { id: '', time: 0 };
      onDiscardCard(cardId);
      return;
    }
    lastClickTimeRef.current = { id: cardId, time: now };
    onCardClick(cardId);
  };

  // Map each card to its meld group index & color
  const meldMap = new Map<string, MeldHighlight>();
  handAnalysis.melds.forEach((meldGroup, meldIdx) => {
    const color = MELD_COLORS[meldIdx % MELD_COLORS.length];
    meldGroup.cards.forEach(c => {
      meldMap.set(c.id, {
        meldIndex: meldIdx,
        color,
        type: meldGroup.type,
      });
    });
  });

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center select-none z-20">
      {/* Floating Over-Hand HUD (Small Icons, Zero Bottom Bar Clutter) */}
      <div className="relative z-30 flex items-center justify-center gap-2 sm:gap-3 mb-1">
        {/* Sort by Runs Icon Button */}
        <button
          onClick={() => onSortHand('RUNS')}
          className={`relative p-1 sm:p-1.5 rounded-xl transition-all shadow-md active:scale-90 cursor-pointer border ${
            sortMode === 'RUNS' || sortMode === 'SUIT'
              ? 'bg-slate-200 text-stone-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
              : 'bg-[#02140D]/90 hover:bg-slate-800 text-slate-400 border-slate-800 backdrop-blur-md'
          }`}
          title="Sort by Runs"
        >
          <div className="relative w-8 h-6 sm:w-9 sm:h-7 flex items-center justify-center pointer-events-none">
            <div className="absolute left-0 bottom-0 w-4 sm:w-4.5 h-5 sm:h-6 bg-white rounded-[2px] border border-stone-300 shadow-sm -rotate-12 flex flex-col justify-between p-0.5">
              <span className="text-[6px] font-black text-stone-900 leading-none">A</span>
              <span className="text-[5px] text-stone-900 leading-none self-end">♠</span>
            </div>
            <div className="absolute left-2 sm:left-2.5 bottom-0.5 w-4 sm:w-4.5 h-5 sm:h-6 bg-white rounded-[2px] border border-stone-300 shadow-sm rotate-0 flex flex-col justify-between p-0.5 z-10">
              <span className="text-[6px] font-black text-stone-900 leading-none">2</span>
              <span className="text-[5px] text-stone-900 leading-none self-end">♠</span>
            </div>
            <div className="absolute right-0 bottom-0 w-4 sm:w-4.5 h-5 sm:h-6 bg-white rounded-[2px] border border-stone-300 shadow-sm rotate-12 flex flex-col justify-between p-0.5 z-20">
              <span className="text-[6px] font-black text-stone-900 leading-none">3</span>
              <span className="text-[5px] text-stone-900 leading-none self-end">♠</span>
            </div>
          </div>
        </button>

        {/* Compact Deadwood Poker-Chip Badge */}
        <div
          className={`px-3.5 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-all border ${
            handAnalysis.deadwoodPoints === 0
              ? 'bg-[#02140D]/95 border-emerald-600/70 shadow-[0_0_12px_#05D59A]'
              : 'bg-[#02140D]/95 border-slate-700/80'
          }`}
          title={`Deadwood: ${handAnalysis.deadwoodPoints}`}
        >
          <span className="text-[9px] font-black uppercase text-slate-400 font-sans-clean">DEADWOOD:</span>
          <span
            className={`text-xs sm:text-sm font-black font-mono leading-none ${
              handAnalysis.deadwoodPoints === 0
                ? 'text-[#05D59A] drop-shadow-[0_0_8px_#05D59A]'
                : 'text-slate-200'
            }`}
          >
            {handAnalysis.deadwoodPoints}
          </span>
          {canGin && (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#05D59A] animate-spin" />
          )}
        </div>

        {/* 30-Second Turn Countdown Ring */}
        {isHumanTurn && (
          <div
            className={`px-2.5 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-all border ${
              remainingSeconds <= 6
                ? 'bg-rose-950/80 border-rose-500/80 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-[#02140D]/95 border-slate-700/80'
            }`}
            title={`Your Turn: ${remainingSeconds}s remaining`}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5 -rotate-90">
                <circle
                  cx="10"
                  cy="10"
                  r={timerRadius}
                  className="stroke-slate-800"
                  strokeWidth="2.5"
                  fill="none"
                />
                <circle
                  cx="10"
                  cy="10"
                  r={timerRadius}
                  stroke={timerColor}
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray={timerCircumference}
                  strokeDashoffset={timerOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span
                className={`absolute font-mono text-[8px] font-black ${
                  remainingSeconds <= 6 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {remainingSeconds}
              </span>
            </div>
            <span className="text-[9px] font-black uppercase text-slate-400 font-sans-clean hidden sm:inline">
              TURN
            </span>
          </div>
        )}

        {/* Sort by Sets Icon Button */}
        <button
          onClick={() => onSortHand('SETS')}
          className={`relative p-1 sm:p-1.5 rounded-xl transition-all shadow-md active:scale-90 cursor-pointer border ${
            sortMode === 'SETS'
              ? 'bg-slate-200 text-stone-950 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
              : 'bg-[#02140D]/90 hover:bg-slate-800 text-slate-400 border-slate-800 backdrop-blur-md'
          }`}
          title="Sort by Sets"
        >
          <div className="relative w-8 h-6 sm:w-9 sm:h-7 flex items-center justify-center pointer-events-none">
            <div className="absolute left-0 bottom-0 w-4 sm:w-4.5 h-5 sm:h-6 bg-white rounded-[2px] border border-stone-300 shadow-sm -rotate-12 flex flex-col justify-between p-0.5">
              <span className="text-[6px] font-black text-stone-900 leading-none">7</span>
              <span className="text-[5px] text-stone-900 leading-none self-end">♠</span>
            </div>
            <div className="absolute left-2 sm:left-2.5 bottom-0.5 w-4 sm:w-4.5 h-5 sm:h-6 bg-white rounded-[2px] border border-stone-300 shadow-sm rotate-0 flex flex-col justify-between p-0.5 z-10">
              <span className="text-[6px] font-black text-[#DC2626] leading-none">7</span>
              <span className="text-[5px] text-[#DC2626] leading-none self-end">♥</span>
            </div>
            <div className="absolute right-0 bottom-0 w-4 sm:w-4.5 h-5 sm:h-6 bg-white rounded-[2px] border border-stone-300 shadow-sm rotate-12 flex flex-col justify-between p-0.5 z-20">
              <span className="text-[6px] font-black text-[#DC2626] leading-none">7</span>
              <span className="text-[5px] text-[#DC2626] leading-none self-end">♦</span>
            </div>
          </div>
        </button>

        {/* Selected Card Shift Nudge Controls */}
        {selectedCardId && selectedIndex >= 0 && (
          <div className="flex items-center gap-1 bg-[#02140D]/90 backdrop-blur-md border border-slate-700 rounded-full px-2 py-0.5 shadow-md">
            <button
              onClick={handleMoveLeft}
              disabled={selectedIndex === 0}
              className={`p-1 rounded-full text-[10px] font-black transition active:scale-95 border-0 ${
                selectedIndex > 0
                  ? 'bg-slate-200 text-stone-950 cursor-pointer hover:bg-white'
                  : 'text-neutral-600 cursor-not-allowed opacity-30'
              }`}
              title="Shift Left"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[9px] font-mono text-neutral-300 px-0.5">
              {selectedIndex + 1}/{handCards.length}
            </span>
            <button
              onClick={handleMoveRight}
              disabled={selectedIndex === handCards.length - 1}
              className={`p-1 rounded-full text-[10px] font-black transition active:scale-95 border-0 ${
                selectedIndex < handCards.length - 1
                  ? 'bg-slate-200 text-stone-950 cursor-pointer hover:bg-white'
                  : 'text-neutral-600 cursor-not-allowed opacity-30'
              }`}
              title="Shift Right"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Selected Card Discard Action Trigger */}
        {isActionPhase && selectedCardId && (
          <button
            onClick={onDiscardSelected}
            className="flex items-center gap-1 py-1 px-3.5 rounded-full btn-3d-vermilion text-white font-black text-[10px] uppercase shadow-lg active:scale-95 cursor-pointer"
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>DISCARD</span>
          </button>
        )}
      </div>

      {/* Main Fanned Hand with Overlapping Cards & Circular Meld Rings */}
      <div id="anchor-seat-0" className="relative w-full overflow-visible py-1 px-2 flex items-end justify-center min-h-[96px] sm:min-h-[115px] touch-none">
        {/* Dedicated landing anchor for the 11th drawn card slot on the far right */}
        <div id="anchor-seat-0-draw-slot" className="absolute right-4 sm:right-10 bottom-2 w-16 h-22 pointer-events-none" />

        {/* Release to Discard Floating Indicator */}
        {isDraggingUp && isActionPhase && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-[#02140D]/95 border-2 border-[#05D59A] text-[#05D59A] px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(5,213,154,0.45)] flex items-center gap-1.5 pointer-events-none animate-bounce">
            <ArrowDownToLine className="w-3.5 h-3.5 rotate-180" />
            <span>Release to Discard</span>
          </div>
        )}

        <Reorder.Group
          axis="x"
          values={handCards}
          onReorder={onReorderHand}
          className="flex items-end -space-x-5 sm:-space-x-7 md:-space-x-8 px-4 pb-0.5"
        >
          {handCards.map((card, index) => {
            const isSelected = selectedCardId === card.id;
            const isDrawn11th = is11Cards && index === handCards.length - 1;
            const meldHighlight = meldMap.get(card.id);
            const isAceStranded = card.rank === 1 && !meldHighlight;
            const isHidden = card.id === hiddenCardId;

            // Natural radial fan angle (-7deg to +8deg)
            const midIndex = (handCards.length - 1) / 2;
            const fanAngle = isDrawn11th ? 4.5 : isSelected ? 0 : (index - midIndex) * 1.5;

            return (
              <Reorder.Item
                key={card.id}
                id={`card-anchor-${card.id}`}
                value={card}
                drag={!isHidden}
                animate={{
                  rotate: isSelected ? 0 : fanAngle,
                }}
                transition={{ type: 'spring', stiffness: 440, damping: 28 }}
                onDragStart={() => {
                  if (isHidden) return;
                  isDraggingRef.current = true;
                  onCardClick(card.id, true);
                }}
                onDrag={(_, info) => {
                  if (isActionPhase && !isHidden) {
                    const isUp = info.offset.y < -50;
                    if (isUp !== isDraggingUp) {
                      setIsDraggingUp(isUp);
                    }
                  }
                }}
                onDragEnd={(_, info) => {
                  setIsDraggingUp(false);
                  setTimeout(() => {
                    isDraggingRef.current = false;
                  }, 100);

                  // Intentional upward drag to discard:
                  // Must be offset.y < -85 or dragged well above the hand line
                  const isIntentionalDiscard =
                    info.offset.y < -85 || info.point.y < window.innerHeight * 0.65;
                  if (isActionPhase && isIntentionalDiscard && !isHidden) {
                    onDiscardCard(card.id, { x: info.point.x, y: info.point.y });
                  }
                }}
                whileHover={
                  isHidden
                    ? undefined
                    : {
                        rotate: 0,
                        y: -8,
                        scale: 1.04,
                        transition: { duration: 0.12 },
                      }
                }
                whileDrag={
                  isHidden
                    ? undefined
                    : {
                        rotate: 0,
                        scale: 1.1,
                        zIndex: 90,
                        boxShadow: '0 25px 35px rgba(0, 0, 0, 0.85)',
                      }
                }
                className={`relative cursor-grab active:cursor-grabbing touch-none select-none ${
                  isDrawn11th ? 'ml-5 sm:ml-8' : ''
                } ${isHidden ? 'opacity-0 pointer-events-none invisible' : ''}`}
                style={{ zIndex: isSelected ? 40 : index }}
              >
                {/* Drag insertion guide beacon on left edge of target slot */}
                {draggedDrawIndex === index && (
                  <div className="absolute -left-2 top-1 bottom-1 w-2 bg-[#05D59A] rounded-full shadow-[0_0_18px_#05D59A] z-50 border border-white/60 animate-pulse pointer-events-none" />
                )}

                {/* Drag insertion guide beacon on right edge if inserting at the very end */}
                {draggedDrawIndex === handCards.length && index === handCards.length - 1 && (
                  <div className="absolute -right-2 top-1 bottom-1 w-2 bg-[#05D59A] rounded-full shadow-[0_0_18px_#05D59A] z-50 border border-white/60 animate-pulse pointer-events-none" />
                )}

                {/* 11th Drawn Card Tag */}
                {isDrawn11th && !isHidden && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-200 to-slate-400 text-stone-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap z-50 pointer-events-none border border-white/60">
                    11TH
                  </div>
                )}

                <div
                  onClick={e => {
                    e.stopPropagation();
                    if (!isHidden) {
                      handleCardClick(card.id);
                    }
                  }}
                >
                  <PlayingCard
                    card={card}
                    size="md"
                    isSelected={isSelected}
                    isAceStranded={isAceStranded}
                    meldHighlight={meldHighlight}
                    className="shadow-2xl"
                  />
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>
    </div>
  );
};
