import React, { useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Card, PlayerState } from '../../core/models/types';
import { HandAnalysis } from '../../store/useGameStore';
import { PlayingCard, MeldColor, MeldHighlight, RANK_LABELS } from '../shared/PlayingCard';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import {
  ArrowDownToLine,
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
  onSlamFinish,
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
    // Double tap/click to instantly discard or Gin Slam during action phase
    if (isActionPhase && lastClickTimeRef.current.id === cardId && now - lastClickTimeRef.current.time < 380) {
      lastClickTimeRef.current = { id: '', time: 0 };
      if (canGin && onSlamFinish) {
        onSlamFinish();
      } else {
        onDiscardCard(cardId);
      }
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
              ? 'bg-gradient-to-r from-[#05D59A] to-[#047857] text-slate-950 border-[#00F5AE] shadow-[0_0_15px_rgba(5,213,154,0.45)]'
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

        {/* Deadwood Meter Pill (Gin Rummy Plus style: DEADWOOD 0 / 10 • ⚡ GIN READY) */}
        <div
          className={`px-3 sm:px-4 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 sm:gap-2 transition-all border ${
            handAnalysis.deadwoodPoints === 0
              ? 'bg-[#010D08]/95 border-emerald-500/80 shadow-[0_0_15px_rgba(5,213,154,0.4)]'
              : 'bg-[#02140D]/95 border-slate-700/80'
          }`}
          title={`Deadwood: ${handAnalysis.deadwoodPoints} points`}
        >
          <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
            DEADWOOD
          </span>
          <span
            className={`text-xs sm:text-sm font-black font-mono px-2 py-0.5 rounded leading-none ${
              handAnalysis.deadwoodPoints === 0
                ? 'bg-emerald-950 border border-emerald-700 text-[#05D59A] drop-shadow-[0_0_8px_#05D59A]'
                : 'bg-slate-900 border border-slate-700 text-slate-200'
            }`}
          >
            {handAnalysis.deadwoodPoints} / 10
          </span>
          {canGin && (
            <span className="text-[9px] font-black uppercase text-[#E5C378] tracking-wider animate-pulse flex items-center gap-0.5">
              <span>⚡</span>
              <span>GIN READY</span>
            </span>
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
              ? 'bg-gradient-to-r from-[#05D59A] to-[#047857] text-slate-950 border-[#00F5AE] shadow-[0_0_15px_rgba(5,213,154,0.45)]'
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
          <div className="flex items-center gap-1 bg-[#02140D]/90 backdrop-blur-md border border-[#05D59A]/30 rounded-full px-2 py-0.5 shadow-md">
            <button
              onClick={handleMoveLeft}
              disabled={selectedIndex === 0}
              className={`p-1 rounded-full text-[10px] font-black transition active:scale-95 border-0 ${
                selectedIndex > 0
                  ? 'bg-[#05D59A] text-slate-950 cursor-pointer hover:bg-[#00F5AE]'
                  : 'text-neutral-600 cursor-not-allowed opacity-30'
              }`}
              title="Shift Left"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[9px] font-mono text-[#05D59A] px-0.5 font-bold">
              {selectedIndex + 1}/{handCards.length}
            </span>
            <button
              onClick={handleMoveRight}
              disabled={selectedIndex === handCards.length - 1}
              className={`p-1 rounded-full text-[10px] font-black transition active:scale-95 border-0 ${
                selectedIndex < handCards.length - 1
                  ? 'bg-[#05D59A] text-slate-950 cursor-pointer hover:bg-[#00F5AE]'
                  : 'text-neutral-600 cursor-not-allowed opacity-30'
              }`}
              title="Shift Right"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Discard Selected Button (Only shown when a card is explicitly selected during action phase and not Gin ready) */}
        {isActionPhase && selectedCardId && !canGin && (
          <button
            onClick={onDiscardSelected}
            className="flex items-center gap-1.5 py-1 px-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black text-[10px] sm:text-xs uppercase shadow-md active:scale-95 cursor-pointer"
          >
            <ArrowDownToLine className="w-3 h-3 text-[#05D59A]" />
            <span>DISCARD</span>
          </button>
        )}
      </div>

      {/* Main Fanned Hand with Overlapping Jumbo Cards */}
      <div
        id="anchor-seat-0"
        className="relative w-full overflow-visible py-0 px-2 flex items-end justify-center min-h-[110px] sm:min-h-[128px] md:min-h-[148px] touch-none -mb-3 sm:-mb-5 md:-mb-6 transition-all duration-300"
      >
        {/* Dedicated landing anchor for the 11th drawn card slot on the far right */}
        <div
          id="anchor-seat-0-draw-slot"
          className="absolute right-3 sm:right-6 md:right-10 bottom-0 w-[84px] sm:w-[96px] md:w-[108px] h-[126px] sm:h-[144px] md:h-[162px] pointer-events-none"
        />

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
          className="flex items-end -space-x-5.5 sm:-space-x-7 md:-space-x-9 px-3 sm:px-6 pb-0"
        >
          {handCards.map((card, index) => {
            const isSelected = selectedCardId === card.id;
            const isDrawn11th = is11Cards && index === handCards.length - 1;
            const meldHighlight = meldMap.get(card.id);
            const isAceStranded = card.rank === 1 && !meldHighlight;
            const isHidden = card.id === hiddenCardId;
            const isGinFinishCard =
              isActionPhase && (handAnalysis.validGinFinishCardIds || []).includes(card.id);

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
                  isDrawn11th ? 'ml-4 sm:ml-7' : ''
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

                {/* Golden Gin Finish Card Badge */}
                {isGinFinishCard && !isHidden && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[8px] sm:text-[9px] uppercase shadow-[0_0_15px_rgba(245,158,11,0.7)] border border-white flex items-center gap-0.5 whitespace-nowrap z-50 animate-bounce pointer-events-none">
                    <span>⚡</span>
                    <span>GIN</span>
                  </div>
                )}

                {/* Circular Meld Badge (Rank/Tag) matching screenshot */}
                {meldHighlight && !isGinFinishCard && !isHidden && (
                  <div
                    className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-4.5 h-4.5 sm:w-5 sm:h-5 text-[9px] sm:text-[10px] rounded-full border-2 border-white font-black flex items-center justify-center text-black shadow-lg z-40 pointer-events-none ${
                      meldHighlight.color === 'cyan'
                        ? 'bg-cyan-400'
                        : meldHighlight.color === 'emerald'
                        ? 'bg-[#05D59A]'
                        : meldHighlight.color === 'amber'
                        ? 'bg-amber-400'
                        : 'bg-purple-400'
                    }`}
                  >
                    {RANK_LABELS[card.rank]}
                  </div>
                )}

                {/* 11th Drawn Card Tag (if not already labeled as GIN finish card) */}
                {isDrawn11th && !isGinFinishCard && !isHidden && (
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
                    size="hand"
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
