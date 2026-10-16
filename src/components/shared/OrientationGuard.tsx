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
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] flex flex-col items-center justify-center p-6 text-center select-none font-sans-clean"
        >
          {/* Glowing Maldivian Crest Badge */}
          <div className="w-14 h-14 rounded-2xl btn-3d-platinum flex items-center justify-center font-black text-slate-950 text-3xl shadow-xl mb-6">
            ތ
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
              className="w-16 h-28 rounded-2xl bg-[#02140D] border border-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-2"
            >
              <div className="w-5 h-1 bg-white/20 rounded-full" />
              <RotateCw className="w-6 h-6 text-[#05D59A] animate-spin opacity-80" />
              <div className="w-6 h-1 bg-white/10 rounded-full" />
            </motion.div>
          </div>

          {/* Heading and Instructions */}
          <h2 className="text-xl font-black text-[#F1F5F9] tracking-tight mt-2 mb-1">
            Please Rotate Your Device
          </h2>
          <p className="text-xs text-[#05D59A] font-bold mb-2">
            ވަށައިގެން އަނބުރާލައްވާ
          </p>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-6 font-medium">
            <strong>Thaasbai: Digu</strong> is designed exclusively for widescreen landscape play. Turn your device horizontally for the full stadium table experience.
          </p>

          {/* Quick Action Button for Mobile Browsers */}
          <JuicyButton
            variant="platinum"
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
