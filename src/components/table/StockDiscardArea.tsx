import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const activeDeck = useGameStore(state => state.activeDeck) || 'royal_lacquer';
  const handAnalysis = useGameStore(state => state.handAnalysis);
  const canGin = handAnalysis.isGinReady || handAnalysis.isThousandRunReady;

  return (
    <div className="relative w-full max-w-4xl flex items-center justify-center gap-6 sm:gap-10 md:gap-14 my-auto select-none">
      
      {/* Dynamic 3D GIN Button - Manifests ONLY when ready to Gin! */}
      <AnimatePresence>
        {canGin && isActionPhase && !finishSlotCard && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, x: -20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.3, opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 24 }}
            className="flex flex-col items-center z-30"
          >
            <span className="text-[9px] sm:text-[10px] font-mono text-[#E5C378] font-black uppercase tracking-wider mb-1 animate-pulse">
              ⚡ KNOCK &amp; GIN
            </span>
            <button
              onClick={onSlamFinish}
              className="w-22 h-22 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center relative cursor-pointer shadow-[0_0_40px_rgba(200,75,49,0.9)] border-3 border-[#E5C378] active:scale-95 transition-transform"
              style={{
                background: 'radial-gradient(circle at 40% 30%, #e56040 0%, #c84b31 55%, #7a1d0d 100%)',
              }}
              title="Tap to slam Gin!"
            >
              <div className="absolute top-1.5 w-3/4 h-5 rounded-full bg-white/40 blur-[1px] pointer-events-none" />
              <span className="font-thaana text-sm text-[#0d0605] font-black leading-none">ޑިގު</span>
              <span className="font-serif-luxury text-xl sm:text-2xl font-black text-[#f7f0ea] leading-none my-0.5 drop-shadow-md">
                GIN
              </span>
              <span className="text-[7.5px] font-mono text-[#0d0605] font-black uppercase bg-[#e5c378] px-2 rounded-full">
                TAP SLAM
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discard Pile */}
      <div id="anchor-discard-pile" className="flex flex-col items-center z-10">
        <div className="text-[10px] sm:text-[11px] font-mono text-[#c84b31] uppercase font-bold tracking-wider mb-1.5">
          DISCARD
        </div>

        <div className="relative w-[clamp(42px,13dvh,76px)] h-[clamp(62px,19dvh,110px)]">
          {topDiscard ? (
            <>
              {discardPile.length > 2 && (
                <div className="absolute inset-0 rounded-[10px] opacity-35 pointer-events-none rotate-3 translate-x-0.5 translate-y-0.5">
                  <PlayingCard card={discardPile[discardPile.length - 3]} size="table" isInteractive={false} />
                </div>
              )}
              {discardPile.length > 1 && (
                <div className="absolute inset-0 rounded-[10px] opacity-60 pointer-events-none -rotate-2 -translate-x-0.5">
                  <PlayingCard card={discardPile[discardPile.length - 2]} size="table" isInteractive={false} />
                </div>
              )}

              {/* Top Draggable Discard Card */}
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
                whileHover={isDrawPhase ? { scale: 1.04 } : undefined}
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
                className={`absolute inset-0 rounded-[10px] touch-none select-none transition-transform ${
                  isDrawPhase
                    ? 'cursor-grab active:cursor-grabbing shadow-[0_0_20px_rgba(229,195,120,0.4)] z-20'
                    : isActionPhase && onDiscardSelected
                    ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,75,49,0.5)] z-20'
                    : 'cursor-default z-10'
                }`}
              >
                <PlayingCard card={topDiscard} size="table" isInteractive={false} />
                {isDrawPhase && (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                    className="absolute top-1 right-1 bg-black/90 text-[#e5c378] border border-[#e5c378]/60 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-lg pointer-events-none font-sans"
                  >
                    TAKE
                  </motion.div>
                )}
              </motion.div>
            </>
          ) : (
            <div
              onClick={isActionPhase && onDiscardSelected ? onDiscardSelected : undefined}
              className={`w-full h-full border border-dashed border-[#e5c378]/30 rounded-[10px] flex flex-col items-center justify-center text-[#f7f0ea]/50 bg-black/20 font-mono text-[9px] ${
                isActionPhase && onDiscardSelected ? 'cursor-pointer hover:border-[#c84b31]' : ''
              }`}
            >
              Discard
            </div>
          )}
        </div>
      </div>

      {/* Stock Draw Pile */}
      <div id="anchor-stock-pile" className="flex flex-col items-center z-10">
        <div className="text-[10px] sm:text-[11px] font-mono text-[#e5c378] uppercase font-bold tracking-wider mb-1.5">
          DRAW PILE
        </div>

        <div className="relative w-[clamp(42px,13dvh,76px)] h-[clamp(62px,19dvh,110px)]">
          {/* 3D Stack Depth Shadows */}
          <div className="absolute -top-1.5 -right-1.5 w-full h-full rounded-[10px] bg-black/70 pointer-events-none" />
          <div className="absolute -top-0.5 -right-0.5 w-full h-full rounded-[10px] bg-black/40 pointer-events-none" />

          {/* Stationary Base Deck */}
          <div
            onClick={isDrawPhase && stockPile.length === 0 && discardPile.length > 0 ? onInitiateReshuffle : undefined}
            className={`w-full h-full rounded-[10px] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all ${
              isDrawPhase && stockPile.length === 0 && discardPile.length > 0
                ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(229,195,120,0.5)] border border-[#e5c378]/60'
                : ''
            }`}
          >
            <CardBackVisual deckId={activeDeck} />
            <div className="absolute bottom-1 bg-[#0d0605]/95 text-[#e5c378] font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow pointer-events-none border border-[#301a14]">
              {stockPile.length}
            </div>
          </div>

          {/* Shuffle Prompt when stock is 0 */}
          {isDrawPhase && stockPile.length === 0 && discardPile.length > 0 && (
            <motion.div
              animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              onClick={onInitiateReshuffle}
              className="absolute -top-3.5 inset-x-0 mx-auto w-max z-30 bg-gradient-to-r from-[#c84b31] to-[#e5c378] text-[#0d0605] font-black text-[8px] sm:text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_4px_14px_rgba(200,75,49,0.6)] border border-[#e5c378] flex items-center gap-1 cursor-pointer hover:brightness-110 active:scale-95 transition-all select-none"
            >
              <Shuffle className="w-2.5 h-2.5" />
              <span>TAP TO SHUFFLE</span>
            </motion.div>
          )}

          {/* Draggable Top Card for Drawing */}
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
              whileHover={{ scale: 1.04 }}
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
              className="absolute inset-0 rounded-[10px] shadow-[0_0_24px_rgba(229,195,120,0.35)] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none z-20"
            >
              <CardBackVisual deckId={activeDeck} />
              <motion.span
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className="absolute bottom-1.5 bg-[#e5c378] text-[#0d0605] font-black text-[8.5px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg pointer-events-none font-sans"
              >
                <ArrowDownToLine className="w-2.5 h-2.5" /> DRAW
              </motion.span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Organically Slammed Face-Down Finish Card Target (No empty placeholder box!) */}
      <div id="anchor-finish-slot" className="absolute -right-24 sm:-right-32 top-0 pointer-events-none">
        {finishSlotCard && (
          <motion.div
            initial={{ scale: 0.6, rotate: 12, opacity: 0 }}
            animate={{ scale: 1, rotate: 6, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-[78px] sm:w-[90px] md:w-[100px] h-[114px] sm:h-[132px] md:h-[148px] rounded-[10px] shadow-[0_0_40px_rgba(200,75,49,0.95)] border-2 border-[#e5c378] overflow-hidden"
          >
            <PlayingCard card={finishSlotCard} isFaceDown={true} size="table" isInteractive={false} />
          </motion.div>
        )}
      </div>

    </div>
  );
};
