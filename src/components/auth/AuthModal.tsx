import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { X, ShieldCheck, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { JuicyButton } from '../shared/JuicyButton';

export const AuthModal: React.FC = () => {
  const {
    profile,
    isAuthModalOpen,
    setAuthModalOpen,
    loginAsGuest,
    loginWithGoogle,
    loginWithPhone,
    loginWithApple,
    isSyncing,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'methods' | 'phone_otp' | 'google'>('methods');
  const [googleEmail, setGoogleEmail] = useState(profile.email || '');
  const [googleName, setGoogleName] = useState(profile.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'number' | 'verify'>('number');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 7) {
      setErrorMsg('Please enter a valid 7-digit Maldivian phone number (e.g., 7xxxxxx or 9xxxxxx)');
      return;
    }
    setErrorMsg('');
    setPhoneStep('verify');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      setErrorMsg('Please enter the 4-digit verification code.');
      return;
    }
    setErrorMsg('');
    await loginWithPhone(phoneNumber);
    setPhoneStep('number');
    setActiveTab('methods');
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    setErrorMsg('');
    await loginWithGoogle(cleanEmail, googleName.trim() || undefined);
    setActiveTab('methods');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none font-sans-clean">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-slate-700 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-sm sm:max-w-md w-full text-slate-100 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer border-0"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Crest */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-r from-[#05D59A] to-[#047857] text-[#02140D] flex items-center justify-center shadow-lg mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-[#F1F5F9] tracking-tight">
            Player Account & Cloud Backup
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Save your chips, level progress, and career stats across devices
          </p>
        </div>

        {/* Active Account Status Pill */}
        <div className="mb-4 p-3 rounded-2xl bg-[#02140D] border border-slate-800 flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#05D59A] animate-pulse" />
            <span className="font-bold text-slate-300">
              Current: <strong className="text-[#F1F5F9]">{profile.displayName}</strong>
            </span>
          </div>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#05D59A]/20 text-[#05D59A] border border-[#05D59A]/40">
            {profile.loginProvider}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'methods' && (
            <motion.div
              key="methods"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2.5"
            >
              {/* Google Sign In */}
              <button
                onClick={() => {
                  setErrorMsg('');
                  setActiveTab('google');
                }}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-stone-900 font-bold text-xs flex items-center justify-center gap-3 shadow transition-all active:scale-98 cursor-pointer disabled:opacity-50 border-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Maldivian Phone Login (+960) */}
              <button
                onClick={() => {
                  setActiveTab('phone_otp');
                  setPhoneStep('number');
                }}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Phone className="w-4 h-4 text-[#05D59A]" />
                <span>Maldives Mobile (+960) OTP</span>
              </button>

              {/* Apple Sign In */}
              <button
                onClick={() => loginWithApple()}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 rounded-xl bg-black/60 hover:bg-black/80 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.73-7.97-12.14-14.68-6.19-9.5-11.16-20.73-14.92-33.68-3.76-12.95-5.64-24.93-5.64-35.94 0-14.07 3.53-25.79 10.59-35.15 7.06-9.36 15.82-14.15 26.28-14.38 4.7.12 10.02 1.39 15.96 3.82 5.94 2.43 9.77 3.7 11.49 3.82 1.95-.24 5.92-1.57 11.91-3.99 5.99-2.43 11.05-3.58 15.18-3.46 11.39.73 20.67 4.96 27.84 12.69-10.22 6.18-15.22 14.8-15 25.86.23 8.7 3.59 16.03 10.08 21.99 6.49 5.95 14.31 9.38 23.46 10.29-2.33 6.94-5.26 14.28-8.79 22.02zM119.22 33.15c0-6.79 2.45-13.33 7.36-19.61 4.91-6.28 11.08-10.74 18.52-13.38.74 7.02-1.39 13.73-6.39 20.12-5 6.4-11.45 10.69-19.49 12.87z" />
                </svg>
                <span>Continue with Apple</span>
              </button>

              {/* Play as Guest Button */}
              <button
                onClick={loginAsGuest}
                className="w-full py-2 rounded-xl bg-transparent hover:bg-white/5 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer mt-2 border-0"
              >
                <span>Continue as Guest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {activeTab === 'phone_otp' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3"
            >
              {phoneStep === 'number' ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    Enter Maldivian Phone Number:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-xl bg-[#010D08] border border-slate-700 text-xs font-mono font-bold text-[#F1F5F9]">
                      +960
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="7XXXXXX or 9XXXXXX"
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-xl bg-[#010D08] border border-slate-700 focus:ring-1 focus:ring-slate-400 text-[#F1F5F9] font-mono text-sm outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('methods')}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition border-0 cursor-pointer"
                    >
                      Back
                    </button>
                    <JuicyButton
                      variant="emerald"
                      size="sm"
                      type="submit"
                      className="flex-1"
                    >
                      Send OTP Code
                    </JuicyButton>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="text-xs text-slate-300">
                    Enter 4-digit code sent to <strong className="text-[#05D59A]">+960 {phoneNumber}</strong>:
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="• • • •"
                    autoFocus
                    className="w-full text-center tracking-widest text-lg font-mono px-3 py-2.5 rounded-xl bg-[#010D08] border border-slate-700 focus:ring-1 focus:ring-slate-400 text-[#05D59A] outline-none"
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep('number')}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition border-0 cursor-pointer"
                    >
                      Change Number
                    </button>
                    <JuicyButton
                      variant="emerald"
                      size="sm"
                      type="submit"
                      disabled={isSyncing}
                      className="flex-1"
                    >
                      {isSyncing ? 'Verifying...' : 'Verify & Sign In'}
                    </JuicyButton>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {activeTab === 'google' && (
            <motion.div
              key="google"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setActiveTab('methods');
                  }}
                  className="text-slate-400 hover:text-white py-1 px-2 rounded-lg hover:bg-white/10 transition cursor-pointer border-0"
                >
                  ← Back
                </button>
                <span>Connect Google Account</span>
              </div>

              <form onSubmit={handleGoogleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    required
                    className="w-full bg-[#010D08] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Player Display Name
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={e => setGoogleName(e.target.value)}
                    placeholder={profile.displayName}
                    className="w-full bg-[#010D08] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition"
                  />
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Links your profile and progress (chips, stats, custom decks) to your Google account.
                </p>

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-stone-900 font-black text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer disabled:opacity-50 border-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isSyncing ? 'Connecting...' : 'Link Google Account'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
