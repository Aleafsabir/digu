import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';

interface LaunchSplashScreenProps {
  onFinish: () => void;
}

export const LaunchSplashScreen: React.FC<LaunchSplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-40 bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden p-4 font-sans-clean"
    >
      {/* Outer Tournoi Contemporary Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-[36px] bg-gradient-to-b from-[#031B11] to-[#010D08] border-2 border-slate-700 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-md w-full text-center"
      >
        {/* Lacquer Medallion in Titanium & Platinum */}
        <motion.div
          initial={{ rotate: -15, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 200 }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-1 shadow-2xl flex items-center justify-center mb-5 border border-slate-600"
        >
          <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-[#02140D] to-[#010D08] border border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <span className="font-thaana text-4xl sm:text-5xl font-black text-[#F1F5F9] tracking-tighter drop-shadow">
              ތ
            </span>
          </div>

          <div
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full btn-3d-platinum text-slate-950 flex items-center justify-center shadow-md border-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </motion.div>

        {/* Brand Title with Dhivehi Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl sm:text-4xl font-black tracking-tight text-[#F1F5F9] drop-shadow-md flex items-center justify-center gap-2.5"
        >
          <span className="font-thaana">ތާސްބައި</span>
          <span className="text-[#05D59A] text-2xl sm:text-3xl font-black tracking-wider border-l-2 border-slate-700 pl-2.5">
            DIGU
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-xs sm:text-sm text-slate-300 tracking-wide mt-2 font-medium"
        >
          Contemporary Maldivian 10-Card Rummy
        </motion.p>

        {/* Tap to continue prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ delay: 0.8, duration: 1.8, repeat: Infinity }}
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#05D59A] font-extrabold uppercase tracking-widest"
        >
          <span>Tap to Enter Lobby</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </motion.div>
    </div>
  );
};
