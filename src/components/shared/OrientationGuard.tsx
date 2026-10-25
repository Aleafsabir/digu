import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { RotateCw, Maximize2 } from 'lucide-react';
import { JuicyButton } from './JuicyButton';

export const OrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check if device is held vertically on phone/tablet screens (< 1024px)
    return window.innerHeight > window.innerWidth && window.innerWidth < 1024;
  });

  useEffect(() => {
    // Attempt native Capacitor orientation lock to landscape
    const lockNativeOrientation = async () => {
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } catch {
        // Fallback for browsers
        try {
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation as any).lock('landscape');
          }
        } catch {
          // Browser security might require fullscreen or user gesture
        }
      }
    };

    lockNativeOrientation();

    const handleOrientationCheck = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 1024;
      setIsPortrait(portrait);
    };

    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationCheck);
    }

    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationCheck);
      }
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      await ScreenOrientation.lock({ orientation: 'landscape' });
    } catch {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch {
        // Ignore
      }
    }
  };

  return (
    <AnimatePresence>
      {isPortrait && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#170b09] via-[#0d0605] to-[#0d0605] flex flex-col items-center justify-center p-6 text-center select-none font-sans-clean"
        >
          {/* Glowing Maldivian Crest Badge */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#c84b31] via-[#170b09] to-[#0d0605] border-2 border-[#E5C378] flex items-center justify-center font-black font-thaana text-[#E5C378] text-4xl shadow-[0_0_25px_rgba(229,195,120,0.35)] mb-6">
            ޑ
          </div>

          {/* Animated Rotating Phone Illustration */}
          <div className="relative my-4 flex items-center justify-center w-36 h-36">
            <motion.div
              animate={{
                rotate: [0, 0, -90, -90, 0],
                scale: [1, 1, 1.08, 1.08, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: 'easeInOut',
                times: [0, 0.2, 0.5, 0.8, 1],
              }}
              className="w-16 h-28 rounded-2xl bg-[#0d0605] border border-[#301a14] shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-2"
            >
              <div className="w-5 h-1 bg-[#e5c378]/20 rounded-full" />
              <RotateCw className="w-6 h-6 text-[#e5c378] animate-spin opacity-80" />
              <div className="w-6 h-1 bg-[#e5c378]/20 rounded-full" />
            </motion.div>
          </div>

          {/* Heading and Instructions */}
          <h2 className="text-xl font-serif font-black text-[#f7f0ea] tracking-tight mt-2 mb-1">
            Please Rotate Your Device
          </h2>
          <p className="text-xs text-[#e5c378] font-bold mb-2 font-thaana">
            ވަށައިގެން އަނބުރާލައްވާ
          </p>
          <p className="text-xs text-[#f7f0ea]/70 max-w-xs leading-relaxed mb-6 font-medium">
            <strong>Holhuashi: Digu</strong> is designed exclusively for widescreen landscape play. Turn your device horizontally for the full stadium table experience.
          </p>

          {/* Quick Action Button for Mobile Browsers */}
          <JuicyButton
            variant="gold"
            size="md"
            onClick={handleRequestLandscape}
          >
            <Maximize2 className="w-4 h-4" />
            <span>Enter Fullscreen</span>
          </JuicyButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
