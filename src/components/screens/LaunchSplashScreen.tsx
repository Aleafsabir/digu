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
      className="fixed inset-0 z-40 bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden p-4 font-sans-clean"
    >
      {/* Outer Royal Lacquer Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-[36px] bg-gradient-to-b from-[#1c0c09] to-[#0d0605] border-2 border-[#301a14] shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(200,75,49,0.2)] max-w-md w-full text-center"
      >
        {/* Holhuashi 3D Master App Icon Badge */}
        <motion.div
          initial={{ rotate: -10, scale: 0.85 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 220 }}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 shadow-[0_0_40px_rgba(200,75,49,0.35)] flex items-center justify-center mb-5 border-2 border-[#e5c378]/80 group"
        >
          <img
            src="/brand_assets/holhuashi_app_icon_v3.jpg"
            alt="Holhuashi Master App Icon"
            className="w-full h-full object-cover rounded-[22px] shadow-2xl"
          />

          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-[#c84b31] to-[#e5c378] text-[#0d0605] flex items-center justify-center shadow-lg border border-[#e5c378]/60">
            <Sparkles className="w-4 h-4 text-[#0d0605]" />
          </div>
        </motion.div>

        {/* Brand Title with Dhivehi Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-2xl sm:text-3xl font-black tracking-tight text-[#f7f0ea] drop-shadow-md flex items-center justify-center gap-2.5 font-serif-luxury"
        >
          <span className="font-thaana text-3xl sm:text-4xl text-[#e5c378]">ހޮޅުއަށި</span>
          <span className="text-[#e5c378] text-xl sm:text-2xl font-black tracking-wider border-l-2 border-[#301a14] pl-2.5">
            HOLHUASHI
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-[11px] sm:text-xs text-[#f7f0ea]/70 tracking-wider mt-1 font-semibold uppercase font-mono"
        >
          Maldivian Traditional Card Games Hub
        </motion.p>

        {/* Dynamic Progress Bar */}
        <div className="w-full max-w-xs mt-6">
          <div className="w-full h-2 bg-[#0d0605] rounded-full border border-[#301a14] overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] rounded-full shadow-[0_0_12px_rgba(200,75,49,0.5)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-[#f7f0ea]/70 mt-2 px-1 font-mono">
            <span className="text-[#e5c378] flex items-center gap-1">
              <Wifi className="w-3 h-3 text-[#e5c378] inline animate-pulse" />
              {statusText}
            </span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Maldivian Card Proverb Tip Box */}
        <div className="mt-5 p-2.5 rounded-xl bg-[#0d0605]/90 border border-[#301a14] max-w-xs w-full text-center">
          <p className="font-thaana text-xs text-[#e5c378] mb-0.5">
            "ތާސް ކުޅުމަކީ ހުނަރާއި ހިކުމަތުގެ ކުޅިވަރެކެވެ."
          </p>
          <p className="text-[10px] text-[#f7f0ea]/70">
            Form melds early & keep deadwood low before opponents slam Gin!
          </p>
        </div>

        {/* Tap to continue prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ delay: 0.8, duration: 1.8, repeat: Infinity }}
          className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#e5c378] font-extrabold uppercase tracking-widest font-mono"
        >
          <span>Tap to Enter</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </motion.div>
    </div>
  );
};
