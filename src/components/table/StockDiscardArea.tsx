import React from 'react';
import { motion } from 'framer-motion';
import { Card, GamePhase } from '../../core/models/types';
import { PlayingCard, CardBackVisual } from '../shared/PlayingCard';
import { ArrowDownToLine, Shuffle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

interface StockDiscardAreaProps {
  stockPile: Card[];
  discardPile: Card[];
  phase: GamePhase;
  isHumanTurn?: boolean;
  onDrawStock: (dropPoint?: { x: number; y: number }) => void;
  onDrawDiscard: (dropPoint?: { x: number; y: number }) => void;
  onDiscardSelected?: () => void;
  onSlamFinish?: () => void;
  onDragDrawHover?: (point: { x: number; y: number } | null) => void;
  onInitiateReshuffle?: () => void;
}

export const StockDiscardArea: React.FC<StockDiscardAreaProps> = ({
  stockPile,
  discardPile,
  phase,
  isHumanTurn = true,
  onDrawStock,
  onDrawDiscard,
  onDiscardSelected,
  onSlamFinish,
  onDragDrawHover,
  onInitiateReshuffle,
}) => {
  const isDrawPhase = phase === 'AWAIT_DRAW' && isHumanTurn;
  const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  const activeDeck = useGameStore(state => state.activeDeck) || 'burgundy_gold';
  const handAnalysis = useGameStore(state => state.handAnalysis);
  const canGin = handAnalysis.isGinReady || handAnalysis.isThousandRunReady;
  const isActionPhase = phase === 'AWAIT_ACTION' && isHumanTurn;

  return (
    <div className="relative flex justify-center items-center gap-4 sm:gap-8 my-1 select-none">
      {/* Dynamic Turn Action Spotlight Ring when drawing is active */}
      {isDrawPhase && (
        <div className="absolute inset-x-2 -inset-y-2 bg-[#05D59A]/15 rounded-full blur-xl pointer-events-none animate-pulse" />
      )}

      {/* 1. Discard Pile (Naturally angled) */}
      <div id="anchor-discard-pile" className="flex flex-col items-center z-10">
        <div className="relative w-15 sm:w-17 h-21 sm:h-24">
          {topDiscard ? (
            <>
              {/* Layered Underneath Cards in Discard Stack (Organic Realistic Tilt) */}
              {discardPile.length > 2 && (
                <div className="absolute inset-0 rounded-2xl opacity-35 pointer-events-none rotate-3 translate-x-0.5 translate-y-0.5">
                  <PlayingCard card={discardPile[discardPile.length - 3]} size="md" isInteractive={false} />
                </div>
              )}
              {discardPile.length > 1 ? (
                <div className="absolute inset-0 rounded-2xl opacity-60 pointer-events-none -rotate-2 -translate-x-0.5">
                  <PlayingCard card={discardPile[discardPile.length - 2]} size="md" isInteractive={false} />
                </div>
              ) : (
                /* Stationary Base Felt Slot */
                <div className="w-full h-full border-2 border-dashed border-white/20 rounded-2xl bg-black/20 flex items-center justify-center text-[10px] text-neutral-400 font-bold pointer-events-none">
                  Discard
                </div>
              )}

              {/* Draggable Single Top Card */}
              <motion.div
                key={`discard-top-card-${topDiscard.id}`}
                drag={isDrawPhase}
                dragSnapToOrigin
                dragElastic={0.25}
                whileDrag={{
                  scale: 1.12,
                  rotate: -1,
                  zIndex: 100,
                  boxShadow: '0 25px 35px rgba(0,0,0,0.7)',
                }}
                whileHover={isDrawPhase ? { scale: 1.04, rotate: -2 } : undefined}
                whileTap={isDrawPhase ? { scale: 0.97 } : undefined}
                onClick={
                  isDrawPhase
                    ? () => onDrawDiscard()
                    : isActionPhase && onDiscardSelected
                    ? onDiscardSelected
                    : undefined
                }
                onDrag={(_, info) => {
                  if (isDrawPhase) {
                    onDragDrawHover?.({ x: info.point.x, y: info.point.y });
                  }
                }}
                onDragEnd={(_, info) => {
                  onDragDrawHover?.(null);
                  if (info.offset.y > 45 || info.point.y > window.innerHeight * 0.45) {
                    onDrawDiscard({ x: info.point.x, y: info.point.y });
                  }
                }}
                className={`absolute inset-0 rounded-2xl touch-none select-none transition-transform ${
                  isDrawPhase
                    ? 'cursor-grab active:cursor-grabbing shadow-[0_0_20px_rgba(255,255,255,0.4)] border-0 z-20 rotate-0'
                    : isActionPhase && onDiscardSelected
                    ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.4)] border-0 z-20 rotate-0'
                    : 'cursor-default z-10 rotate-0'
                }`}
              >
                <PlayingCard card={topDiscard} size="md" isInteractive={false} />
                {isDrawPhase && (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                    className="absolute top-1 right-1 bg-black/90 text-[#F1F5F9] border border-slate-400/60 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-lg pointer-events-none font-sans-clean"
                  >
                    TAKE
                  </motion.div>
                )}
              </motion.div>
            </>
          ) : (
            <div
              onClick={isActionPhase && onDiscardSelected ? onDiscardSelected : undefined}
              className={`w-full h-full border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-neutral-400 bg-black/20 font-mono text-[9px] ${
                isActionPhase && onDiscardSelected ? 'cursor-pointer hover:border-slate-400/50' : ''
              }`}
            >
              Discard
            </div>
          )}
        </div>
      </div>

      {/* 2. Stock Deck with 3D Stack Thickness & Active Deck Back */}
      <div id="anchor-stock-pile" className="flex flex-col items-center z-10">
        <div className="relative w-15 sm:w-17 h-21 sm:h-24">
          {/* 3D Deck thickness layered shadows */}
          <div className="absolute -top-1.5 -right-1.5 w-full h-full rounded-2xl bg-black/70 border-0 pointer-events-none" />
          <div className="absolute -top-0.5 -right-0.5 w-full h-full rounded-2xl bg-black/40 border-0 pointer-events-none" />

          {/* Stationary Base Deck showing Active Deck Back Pattern */}
          <div
            onClick={isDrawPhase && stockPile.length === 0 && discardPile.length > 0 ? onInitiateReshuffle : undefined}
            className={`w-full h-full rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all ${
              isDrawPhase && stockPile.length === 0 && discardPile.length > 0
                ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(5,213,154,0.5)] border border-[#05D59A]/60'
                : ''
            }`}
          >
            <CardBackVisual deckId={activeDeck} />
            <div className="absolute bottom-1 bg-black/80 backdrop-blur-sm border-0 text-[#05D59A] font-mono text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full shadow pointer-events-none">
              {stockPile.length}
            </div>
          </div>

          {/* Bouncing TAP TO SHUFFLE Badge when Draw Pile is 0 */}
          {isDrawPhase && stockPile.length === 0 && discardPile.length > 0 && (
            <motion.div
              animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              onClick={onInitiateReshuffle}
              className="absolute -top-3.5 inset-x-0 mx-auto w-max z-30 bg-gradient-to-r from-emerald-400 via-[#05D59A] to-emerald-500 text-stone-950 font-sans-clean font-black text-[8px] sm:text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_4px_14px_rgba(5,213,154,0.6)] border border-white flex items-center gap-1 cursor-pointer hover:brightness-110 active:scale-95 transition-all select-none"
            >
              <Shuffle className="w-2.5 h-2.5" />
              <span>TAP TO SHUFFLE</span>
            </motion.div>
          )}

          {/* Draggable Single Top Card */}
          {isDrawPhase && stockPile.length > 0 && (
            <motion.div
              key={`stock-draw-card-${stockPile.length}`}
              drag
              dragSnapToOrigin
              dragElastic={0.25}
              whileDrag={{
                scale: 1.12,
                rotate: 3,
                zIndex: 100,
                boxShadow: '0 25px 35px rgba(0,0,0,0.8)',
              }}
              whileHover={{ scale: 1.04, rotate: 2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onDrawStock()}
              onDrag={(_, info) => {
                if (isDrawPhase) {
                  onDragDrawHover?.({ x: info.point.x, y: info.point.y });
                }
              }}
              onDragEnd={(_, info) => {
                onDragDrawHover?.(null);
                if (info.offset.y > 45 || info.point.y > window.innerHeight * 0.45) {
                  onDrawStock({ x: info.point.x, y: info.point.y });
                }
              }}
              className="absolute inset-0 rounded-2xl shadow-[0_0_24px_rgba(255,255,255,0.4)] border-0 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none z-20"
            >
              <CardBackVisual deckId={activeDeck} />
              <motion.span
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className="absolute bottom-1.5 bg-gradient-to-r from-slate-200 to-slate-400 text-stone-950 font-black text-[8px] px-2 py-0.2 rounded-full flex items-center gap-0.5 shadow-lg pointer-events-none font-sans-clean"
              >
                <ArrowDownToLine className="w-2.5 h-2.5" /> DRAW
              </motion.span>
            </motion.div>
          )}
        </div>
      </div>

      {/* 3. Center Table Slam Gin Trigger: Appears in this exact tabletop slot ONLY when ready for Gin */}
      {canGin && isActionPhase && onSlamFinish && (
        <motion.div
          id="center-slam-slot"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className="flex flex-col items-center justify-center z-30 ml-2 sm:ml-4"
        >
          <div className="relative flex flex-col items-center">
            <div className="absolute inset-0 bg-red-600/40 rounded-2xl blur-lg animate-pulse pointer-events-none" />
            <button
              onClick={onSlamFinish}
              className="btn-3d-vermilion relative w-20 sm:w-24 h-21 sm:h-24 rounded-2xl font-sans-clean font-black text-xs sm:text-sm tracking-wider uppercase flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xl hover:scale-105 active:scale-95 transition-transform p-2 text-center"
            >
              <span className="text-xl sm:text-2xl animate-bounce">⚡</span>
              <span className="leading-tight font-black">
                SLAM<br />GIN!
              </span>
            </button>
            <span className="text-[8px] font-bold uppercase text-slate-200 mt-1 bg-black/80 px-2 py-0.5 rounded-full border border-slate-600 font-sans-clean text-center whitespace-nowrap">
              0 Deadwood
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
