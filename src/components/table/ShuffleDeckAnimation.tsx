import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardBackVisual } from '../shared/PlayingCard';
import { useGameStore } from '../../store/useGameStore';
import { playRiffleShuffleSound, playCardFlickSound } from '../../utils/audioEffects';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ShuffleDeckAnimationProps {
  onComplete: () => void;
}

export const ShuffleDeckAnimation: React.FC<ShuffleDeckAnimationProps> = ({ onComplete }) => {
  const activeDeck = useGameStore(state => state.activeDeck) || 'burgundy_gold';
  // Stages: 'split' -> 'riffle' -> 'cut' -> 'complete'
  const [stage, setStage] = useState<'split' | 'riffle' | 'cut' | 'complete'>('split');

  useEffect(() => {
    // Stage 1: Split deck & start riffle
    const t1 = setTimeout(() => {
      setStage('riffle');
      playRiffleShuffleSound();
      try {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      } catch {
        // Fallback for non-Capacitor web
      }
    }, 250);

    // Stage 2: Cut deck
    const t2 = setTimeout(() => {
      setStage('cut');
      playCardFlickSound();
      try {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      } catch {
        // Fallback
      }
    }, 850);

    // Stage 3: Complete
    const t3 = setTimeout(() => {
      setStage('complete');
      onComplete();
    }, 1250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="relative w-40 sm:w-48 h-24 sm:h-28 flex items-center justify-center select-none [perspective:1000px]">
      <AnimatePresence>
        {/* Left Packet */}
        <motion.div
          initial={{ x: 0, y: 0, rotateZ: 0 }}
          animate={
            stage === 'split'
              ? { x: -38, y: -4, rotateZ: -10, rotateY: 15 }
              : stage === 'riffle'
              ? { x: [-38, -6, 0], y: [-4, 2, 0], rotateZ: [-10, -2, 0], rotateY: [15, 0, 0] }
              : { x: 0, y: 0, rotateZ: 0, rotateY: 0 }
          }
          transition={{
            duration: stage === 'riffle' ? 0.6 : 0.25,
            ease: 'easeInOut',
          }}
          className="absolute w-13.5 sm:w-16 md:w-17 h-19.5 sm:h-22 md:h-24 rounded-2xl shadow-xl z-10"
        >
          <CardBackVisual deckId={activeDeck} />
          <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
        </motion.div>

        {/* Right Packet */}
        <motion.div
          initial={{ x: 0, y: 0, rotateZ: 0 }}
          animate={
            stage === 'split'
              ? { x: 38, y: -4, rotateZ: 10, rotateY: -15 }
              : stage === 'riffle'
              ? { x: [38, 6, 0], y: [-4, -2, 0], rotateZ: [10, 2, 0], rotateY: [-15, 0, 0] }
              : { x: 0, y: 0, rotateZ: 0, rotateY: 0 }
          }
          transition={{
            duration: stage === 'riffle' ? 0.6 : 0.25,
            ease: 'easeInOut',
          }}
          className="absolute w-13.5 sm:w-16 md:w-17 h-19.5 sm:h-22 md:h-24 rounded-2xl shadow-xl z-10"
        >
          <CardBackVisual deckId={activeDeck} />
          <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
        </motion.div>

        {/* Center Interleaved Riffle Flutter Cascades */}
        {stage === 'riffle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            {[...Array(6)].map((_, idx) => (
              <motion.div
                key={idx}
                animate={{
                  y: [-3, 3, -2, 0],
                  rotateZ: idx % 2 === 0 ? [-4, 3, 0] : [4, -3, 0],
                  scaleY: [0.96, 1.02, 1],
                }}
                transition={{
                  repeat: 2,
                  duration: 0.18,
                  delay: idx * 0.04,
                  ease: 'easeInOut',
                }}
                className="absolute w-12 sm:w-15 h-18 sm:h-21 rounded-xl bg-stone-900 border border-amber-400/40 opacity-70 shadow-sm"
              />
            ))}
          </motion.div>
        )}

        {/* Final Deck Cut Packet */}
        {stage === 'cut' && (
          <motion.div
            initial={{ x: 0, y: 0, rotateZ: 0 }}
            animate={{
              x: [0, 24, 0],
              y: [0, -18, 0],
              rotateZ: [0, 4, 0],
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute w-13.5 sm:w-16 md:w-17 h-19.5 sm:h-22 md:h-24 rounded-2xl shadow-2xl z-30"
          >
            <CardBackVisual deckId={activeDeck} />
            <div className="absolute inset-0 rounded-2xl border-2 border-[#05D59A]/60 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
