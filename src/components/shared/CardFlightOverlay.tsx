import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationStore, CardFlightRequest } from '../../store/useAnimationStore';
import { PlayingCard } from './PlayingCard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface AnchorCoords {
  x: number;
  y: number;
}

function getAnchorCenter(anchorId: string): AnchorCoords {
  const el = document.getElementById(anchorId);
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  // Sensible default fallbacks if DOM element not yet mounted
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (anchorId) {
    case 'anchor-stock-pile':
      return { x: vw * 0.58, y: vh * 0.45 };
    case 'anchor-discard-pile':
      return { x: vw * 0.42, y: vh * 0.45 };
    case 'anchor-seat-0-draw-slot':
      return { x: vw * 0.72, y: vh * 0.86 };
    case 'anchor-seat-0':
      return { x: vw * 0.5, y: vh * 0.85 };
    case 'anchor-seat-1':
      return { x: vw * 0.25, y: vh * 0.15 };
    case 'anchor-seat-2':
      return { x: vw * 0.5, y: vh * 0.15 };
    case 'anchor-seat-3':
      return { x: vw * 0.75, y: vh * 0.15 };
    default:
      return { x: vw * 0.5, y: vh * 0.5 };
  }
}

export const CardFlightOverlay: React.FC = () => {
  const activeFlights = useAnimationStore(state => state.activeFlights);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none [perspective:1200px]">
      <AnimatePresence>
        {activeFlights.map((flight: CardFlightRequest) => {
          const fromCenter =
            flight.fromPoint || getAnchorCenter(flight.fromAnchor || 'anchor-seat-0');
          const toCenter =
            flight.toPoint || getAnchorCenter(flight.toAnchor || 'anchor-seat-0-draw-slot');

          // Card dimensions approximate offset to center the card on the coordinates
          const cardHalfW = 32;
          const cardHalfH = 44;

          const startX = fromCenter.x - cardHalfW;
          const startY = fromCenter.y - cardHalfH;
          const endX = toCenter.x - cardHalfW;
          const endY = toCenter.y - cardHalfH;

          // Calculate parabolic arc mid-air apex (higher, more pronounced arc)
          const midX = (startX + endX) / 2;
          const midY = Math.min(startY, endY) - 55;

          const landingRotate =
            flight.rotation !== undefined ? flight.rotation : Math.random() * 6 - 3;

          const isFlipping = Boolean(flight.flipToFaceUp);

          return (
            <motion.div
              key={flight.id}
              initial={{
                x: startX,
                y: startY,
                scale: 0.94,
                rotate: flight.isFaceDown ? 3 : -2,
                opacity: 0.95,
              }}
              animate={{
                x: [startX, midX, endX],
                y: [startY, midY, endY],
                scale: [0.94, 1.15, 1.0],
                rotate: [flight.isFaceDown ? 3 : -2, (landingRotate / 2), landingRotate],
                opacity: [0.95, 1, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: (flight.durationMs || 480) / 1000,
                ease: [0.22, 1, 0.36, 1], // natural physical cubic bezier glide with soft cushion
                times: [0, 0.52, 1],
              }}
              onAnimationComplete={() => {
                try {
                  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                } catch {
                  // Ignore on web
                }
                flight.onComplete?.();
              }}
              className="absolute left-0 top-0 pointer-events-none z-50 drop-shadow-[0_22px_35px_rgba(0,0,0,0.85)]"
            >
              {isFlipping ? (
                /* Hardware-accelerated 3D Mid-Air Card Flip */
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d]"
                  initial={{ rotateY: 180 }}
                  animate={{ rotateY: 0 }}
                  transition={{
                    duration: (flight.durationMs || 320) / 1000,
                    ease: [0.2, 0.8, 0.3, 1],
                  }}
                >
                  {/* Front Face (Visible at rotateY <= 90deg) */}
                  <div className="w-full h-full [backface-visibility:hidden]">
                    <PlayingCard
                      card={flight.card}
                      isFaceDown={false}
                      size="md"
                      isInteractive={false}
                    />
                  </div>
                  {/* Back Face (Visible at rotateY > 90deg) */}
                  <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <PlayingCard
                      card={flight.card}
                      isFaceDown={true}
                      size="md"
                      isInteractive={false}
                    />
                  </div>
                </motion.div>
              ) : (
                <PlayingCard
                  card={flight.card}
                  isFaceDown={flight.isFaceDown && !flight.flipToFaceUp}
                  size="md"
                  isInteractive={false}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
