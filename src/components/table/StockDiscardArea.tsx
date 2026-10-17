import React from 'react';
import { motion } from 'framer-motion';
import { Card, GamePhase } from '../../core/models/types';
import { PlayingCard, CardBackVisual } from '../shared/PlayingCard';
import { ArrowDownToLine, Shuffle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

interface StockDiscardAreaProps {
  stockPile: Card[];
  discardPile: Card[];
  finishSlotCard?: Card | null;
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
  finishSlotCard,
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
  const isActionPhase = phase === 'AWAIT_ACTION' && isHumanTurn;
  const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  const activeDeck = useGameStore(state => state.activeDeck) || 'digu_emerald';
  const handAnalysis = useGameStore(state => state.handAnalysis);
  const canGin = handAnalysis.isGinReady || handAnalysis.isThousandRunReady;

  return (
    <div className="relative w-full max-w-4xl flex items-center justify-between sm:justify-around px-2 sm:px-6 my-auto select-none">
      
      {/* 1. LEFT ZONE: 3D Big Emerald GIN Pad (Inspired by Gin Rummy Plus) */}
      <div id="anchor-finish-slot" className="relative flex flex-col items-center z-20">
        <div className="text-[10px] sm:text-[11px] font-mono text-[#E5C378] uppercase font-black tracking-wider mb-1.5 flex items-center gap-1">
          <span>⚡</span>
          <span>KNOCK & GIN</span>
        </div>

        {finishSlotCard ? (
          /* Slammed Face-Down Card State - Smooth seamless handoff from flight overlay */
          <motion.div
            id="center-slam-slot"
            initial={{ scale: 1, rotate: -12, opacity: 1 }}
            animate={{ scale: 1, rotate: -10, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="relative w-28 h-28 sm:w-34 sm:h-34 md:w-38 md:h-38 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.95)] border-4 border-[#E5C378]"
          >
            <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-2xl overflow-hidden shadow-2xl rotate-12">
              <PlayingCard card={finishSlotCard} isFaceDown={true} size="table" isInteractive={false} />
            </div>
            <div className="absolute -top-3 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black text-[8px] sm:text-[9px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xl border border-yellow-300 font-sans-clean whitespace-nowrap animate-pulse">
              ⚡ GIN SLAMMED ⚡
            </div>
          </motion.div>
        ) : canGin && isActionPhase ? (
          /* Active Glowing GIN Pad (Tap or Drag target) */
          <motion.button
            id="center-slam-slot"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSlamFinish}
            className="btn-gin-pad gin-pad-glow w-28 h-28 sm:w-34 sm:h-34 md:w-38 md:h-38 rounded-full flex flex-col items-center justify-center cursor-pointer relative group select-none shadow-2xl"
            title="Tap to Gin or drag your finish card here!"
          >
            {/* Subtle Specular Arc */}
            <div className="absolute top-2 w-3/4 h-6 rounded-full bg-white/35 blur-[2px] pointer-events-none" />

            <span className="font-thaana text-sm sm:text-base text-emerald-950 font-black opacity-80 leading-none">
              ޑިގު
            </span>
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] leading-none my-0.5 sm:my-1">
              GIN
            </span>
            <span className="text-[7.5px] sm:text-[8.5px] font-mono text-emerald-950 font-extrabold uppercase bg-white/45 px-2 py-0.5 rounded-full shadow-sm">
              Tap or Drop
            </span>
          </motion.button>
        ) : (
          /* Dormant Pad (Eligible only when deadwood is 0) */
          <div
            id="center-slam-slot"
            className="btn-gin-pad-dormant w-28 h-28 sm:w-34 sm:h-34 md:w-38 md:h-38 rounded-full flex flex-col items-center justify-center pointer-events-none select-none relative"
            title="Forms melds with 0 deadwood to unlock Gin"
          >
            <span className="font-thaana text-xs sm:text-sm text-emerald-400/50 font-bold opacity-60 leading-none">
              ޑިގު
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-400/60 tracking-wider leading-none my-0.5">
              GIN
            </span>
            <span className="text-[7px] sm:text-[8px] font-mono text-slate-400/50 uppercase mt-0.5">
              0 Deadwood
            </span>
          </div>
        )}

        <span className="text-[9px] sm:text-[10px] text-emerald-300/80 font-bold mt-1.5 font-mono">
          {canGin && isActionPhase ? '⚡ READY TO WIN' : '0 DEADWOOD'}
        </span>
      </div>

      {/* 2. CENTER-RIGHT ZONE: Discard Pile & Stock Draw Pile */}
      <div className="flex items-center gap-5 sm:gap-8 md:gap-12 z-10">
        
        {/* Discard Pile with Green Landing Spotlight */}
        <div id="anchor-discard-pile" className="flex flex-col items-center">
          <div className="text-[10px] sm:text-[11px] font-mono text-emerald-400 uppercase font-bold tracking-wider mb-1.5">
            DISCARD
          </div>

          <div className="relative w-[78px] sm:w-[90px] md:w-[100px] h-[114px] sm:h-[132px] md:h-[148px]">
            {/* Green Landing Spotlight Beneath Card */}
            <div className="absolute -inset-2 bg-[#05D59A]/20 rounded-3xl blur-md pointer-events-none" />

            {topDiscard ? (
              <>
                {/* Underneath Layered Cards in Discard Stack */}
                {discardPile.length > 2 && (
                  <div className="absolute inset-0 rounded-2xl opacity-35 pointer-events-none rotate-3 translate-x-0.5 translate-y-0.5">
                    <PlayingCard card={discardPile[discardPile.length - 3]} size="table" isInteractive={false} />
                  </div>
                )}
                {discardPile.length > 1 ? (
                  <div className="absolute inset-0 rounded-2xl opacity-60 pointer-events-none -rotate-2 -translate-x-0.5">
                    <PlayingCard card={discardPile[discardPile.length - 2]} size="table" isInteractive={false} />
                  </div>
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-white/20 rounded-2xl bg-black/20 flex items-center justify-center text-[10px] text-neutral-400 font-bold pointer-events-none">
                    Discard
                  </div>
                )}

                {/* Draggable Top Discard Card */}
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
                  <PlayingCard card={topDiscard} size="table" isInteractive={false} />
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
          <span className="text-[10px] text-slate-400 font-mono mt-1.5">Normal Turn</span>
        </div>

        {/* Stock Draw Pile with 3D Stack Thickness */}
        <div id="anchor-stock-pile" className="flex flex-col items-center">
          <div className="text-[10px] sm:text-[11px] font-mono text-[#E5C378] uppercase font-bold tracking-wider mb-1.5">
            DRAW PILE
          </div>

          <div className="relative w-[78px] sm:w-[90px] md:w-[100px] h-[114px] sm:h-[132px] md:h-[148px]">
            {/* 3D Stack Depth Shadows */}
            <div className="absolute -top-1.5 -right-1.5 w-full h-full rounded-2xl bg-black/70 border-0 pointer-events-none" />
            <div className="absolute -top-0.5 -right-0.5 w-full h-full rounded-2xl bg-black/40 border-0 pointer-events-none" />

            {/* Stationary Base Deck */}
            <div
              onClick={isDrawPhase && stockPile.length === 0 && discardPile.length > 0 ? onInitiateReshuffle : undefined}
              className={`w-full h-full rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                isDrawPhase && stockPile.length === 0 && discardPile.length > 0
                  ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(5,213,154,0.5)] border border-[#05D59A]/60'
                  : ''
              }`}
            >
              <CardBackVisual deckId={activeDeck} />
              <div className="absolute bottom-1 bg-black/80 backdrop-blur-sm border-0 text-[#05D59A] font-mono text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow pointer-events-none">
                {stockPile.length}
              </div>
            </div>

            {/* Shuffle Prompt when stock is 0 */}
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

            {/* Draggable Single Top Card for Drawing */}
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
                  className="absolute bottom-1.5 bg-gradient-to-r from-slate-200 to-slate-400 text-stone-950 font-black text-[8.5px] px-2.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg pointer-events-none font-sans-clean"
                >
                  <ArrowDownToLine className="w-2.5 h-2.5" /> DRAW
                </motion.span>
              </motion.div>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1.5">Tap to Draw</span>
        </div>

      </div>

    </div>
  );
};
