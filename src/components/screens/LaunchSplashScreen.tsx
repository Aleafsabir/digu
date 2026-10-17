import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight, Wifi } from 'lucide-react';

interface LaunchSplashScreenProps {
  onFinish: () => void;
}

export const LaunchSplashScreen: React.FC<LaunchSplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Connecting to Holhuashi servers...');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          setStatusText('Ready!');
          setTimeout(() => {
            onFinish();
          }, 350);
          return 100;
        }

        if (next === 35) {
          setStatusText('Preloading card decks & audio...');
        } else if (next === 70) {
          setStatusText('Syncing player profile...');
        }
        return next;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-40 bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden p-4 font-sans-clean"
    >
      {/* Outer Tournoi Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-[36px] bg-gradient-to-b from-[#031B11] to-[#010D08] border-2 border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-md w-full text-center"
      >
        {/* Holhuashi 3D Master App Icon Badge (The Single Project Raster Asset) */}
        <motion.div
          initial={{ rotate: -10, scale: 0.85 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 220 }}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 shadow-[0_0_40px_rgba(5,213,154,0.35)] flex items-center justify-center mb-5 border-2 border-[#E5C378]/80 group"
        >
          <img
            src="/brand_assets/holhuashi_app_icon_v3.jpg"
            alt="Holhuashi Master App Icon"
            className="w-full h-full object-cover rounded-[22px] shadow-2xl"
          />

          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#E5C378] text-slate-950 flex items-center justify-center shadow-lg border border-amber-200">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
        </motion.div>

        {/* Brand Title with Dhivehi Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-2xl sm:text-3xl font-black tracking-tight text-[#F1F5F9] drop-shadow-md flex items-center justify-center gap-2.5"
        >
          <span className="font-thaana text-3xl sm:text-4xl text-[#E5C378]">ހޮޅުއަށި</span>
          <span className="text-[#05D59A] text-xl sm:text-2xl font-black tracking-wider border-l-2 border-slate-700 pl-2.5">
            HOLHUASHI
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-[11px] sm:text-xs text-slate-400 tracking-wider mt-1 font-semibold uppercase"
        >
          Maldivian Traditional Card Games Hub
        </motion.p>

        {/* Dynamic Progress Bar */}
        <div className="w-full max-w-xs mt-6">
          <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-700 overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-[#05D59A] to-[#E5C378] rounded-full shadow-[0_0_12px_rgba(5,213,154,0.5)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2 px-1">
            <span className="text-[#05D59A] flex items-center gap-1">
              <Wifi className="w-3 h-3 text-[#05D59A] inline animate-pulse" />
              {statusText}
            </span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Maldivian Card Proverb Tip Box */}
        <div className="mt-5 p-2.5 rounded-xl bg-[#02140D]/80 border border-[#E5C378]/30 max-w-xs w-full text-center">
          <p className="font-thaana text-xs text-[#E5C378] mb-0.5">
            "ތާސް ކުޅުމަކީ ހުނަރާއި ހިކުމަތުގެ ކުޅިވަރެކެވެ."
          </p>
          <p className="text-[10px] text-slate-400">
            Form melds early & keep deadwood low before opponents slam Gin!
          </p>
        </div>

        {/* Tap to continue prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ delay: 0.8, duration: 1.8, repeat: Infinity }}
          className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#05D59A] font-extrabold uppercase tracking-widest"
        >
          <span>Tap to Enter</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </motion.div>
    </div>
  );
};
