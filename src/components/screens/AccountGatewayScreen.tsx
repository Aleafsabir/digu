import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { Cloud, Users, Trophy, AlertCircle } from 'lucide-react';
import { JuicyButton } from '../shared/JuicyButton';

interface AccountGatewayScreenProps {
  onContinue: () => void;
}

export const AccountGatewayScreen: React.FC<AccountGatewayScreenProps> = ({ onContinue }) => {
  const {
    profile,
    loginAsGuest,
    loginWithGoogle,
    loginWithApple,
  } = useAuthStore();

  const [customGoogleEmail, setCustomGoogleEmail] = useState(profile.email || '');
  const [customGoogleName, setCustomGoogleName] = useState(profile.displayName || '');
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGuestLogin = () => {
    loginAsGuest();
    onContinue();
  };

  const handleGoogleQuick = async () => {
    setShowGoogleInput(true);
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customGoogleEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    setErrorMsg('');
    await loginWithGoogle(cleanEmail, customGoogleName.trim() || undefined);
    onContinue();
  };

  const handleAppleLogin = async () => {
    await loginWithApple();
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] flex flex-col items-center justify-center select-none overflow-y-auto p-4 font-sans-clean">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative bg-gradient-to-b from-[#031B11] to-[#02140D] border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-sm sm:max-w-md w-full text-center"
      >
        {/* Island Club Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#05D59A]/10 border border-[#05D59A]/30 text-[11px] font-black text-[#05D59A] tracking-wider uppercase mb-3">
          <span>🇲🇻</span>
          <span>Official Island Card Club</span>
        </div>

        {/* Title & Brand */}
        <h2 className="text-2xl font-black text-[#F1F5F9] tracking-tight flex items-center justify-center gap-2">
          <span>Welcome to</span>
          <span className="font-thaana text-2xl text-[#E5C378]">ހޮޅުއަށި</span>
        </h2>
        <p className="text-xs text-slate-300 mt-1 mb-6 leading-relaxed">
          Sign in to preserve your chips, sync trophies across devices, and challenge friends to live tables.
        </p>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showGoogleInput ? (
            <motion.div
              key="main-buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Google Button */}
              <button
                onClick={handleGoogleQuick}
                className="w-full py-3.5 px-4 rounded-2xl bg-white text-slate-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg hover:bg-slate-100 transition active:scale-[0.98] cursor-pointer border-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Apple Button */}
              <button
                onClick={handleAppleLogin}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0F172A] border border-slate-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-3 shadow hover:bg-slate-800 transition active:scale-[0.98] cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.8 1.1-1.92.98-3.04-.95.04-2.1.63-2.77 1.42-.59.68-1.12 1.79-.98 2.88 1.06.08 2.14-.49 2.77-1.26z"/>
                </svg>
                <span>Continue with Apple</span>
              </button>

              {/* Guest Button */}
              <button
                onClick={handleGuestLogin}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#05D59A]/15 border border-[#05D59A]/50 text-[#05D59A] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#05D59A]/25 transition active:scale-[0.98] cursor-pointer"
              >
                <span>🎭 Play as Guest</span>
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="google-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleGoogleSubmit}
              className="space-y-3 text-left"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Google Account Email:
                </label>
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-[#02140D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#05D59A]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Player Display Name:
                </label>
                <input
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="e.g. Ali_Mv"
                  className="w-full bg-[#02140D] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#05D59A]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoogleInput(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                >
                  Back
                </button>
                <JuicyButton
                  type="submit"
                  variant="emerald"
                  className="flex-1 py-2.5 text-xs font-black"
                >
                  Confirm & Enter
                </JuicyButton>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Feature Highlights Perks */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-slate-800 text-slate-400">
          <div className="flex flex-col items-center gap-1 text-[10px] font-bold">
            <Cloud className="w-4 h-4 text-[#05D59A]" />
            <span>Cloud Sync</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-[10px] font-bold">
            <Users className="w-4 h-4 text-[#38BDF8]" />
            <span>Play Friends</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-[10px] font-bold">
            <Trophy className="w-4 h-4 text-[#E5C378]" />
            <span>Leaderboards</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
