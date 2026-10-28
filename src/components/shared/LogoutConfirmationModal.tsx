import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AVATAR_PRESETS } from '../../types/auth';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
}) => {
  const profile = useAuthStore(state => state.profile);
  const isGuest = profile.loginProvider === 'GUEST';
  const avatar = AVATAR_PRESETS.find(a => a.id === profile.avatarId) || AVATAR_PRESETS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#e5c378] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(229,195,120,0.25)] text-center relative overflow-hidden text-[#f7f0ea]"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Amber Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-[#e5c378]/10 blur-2xl pointer-events-none" />

            {/* Logout Icon Badge */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#1b0e0c] border border-[#c84b31] flex items-center justify-center text-[#ff8a80] mb-3 shadow-[0_0_20px_rgba(200,75,49,0.3)]">
              <LogOut className="w-6 h-6" />
            </div>

            {/* Cultural Dhivehi Heading */}
            <div className="font-thaana text-lg text-[#e5c378] mb-1 font-bold">
              އެކައުންޓުން ވަކިވުން
            </div>

            {/* English Title */}
            <h2 className="text-xl font-serif-luxury font-black text-white tracking-wide mb-2">
              Sign Out &amp; Switch Account?
            </h2>

            {/* Context-Aware Reassurance / Warning */}
            <p className="text-xs text-[#f7f0ea]/75 leading-relaxed mb-4">
              {isGuest ? (
                <span>
                  You are currently playing as a <strong className="text-[#e5c378]">Guest</strong>. Your coins and stats remain stored on this device, but logging into a different account will switch active local profile.
                </span>
              ) : (
                <span>
                  Are you sure you want to log out? Your level, achievements, and coin balance are safely synced to your cloud account.
                </span>
              )}
            </p>

            {/* Account Card Preview */}
            <div className="bg-[#0e0706] border border-[#301a14] rounded-2xl p-3 mb-5 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#24110d] border border-[#e5c378]/60 flex items-center justify-center text-xl shrink-0">
                  {avatar.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white truncate max-w-[150px]">
                    {profile.displayName || 'Islander'}
                  </div>
                  <div className="text-[10px] text-[#f7f0ea]/60 font-mono truncate">
                    {profile.email || `Level ${profile.level} • ${profile.coins.toLocaleString()} Coins`}
                  </div>
                </div>
              </div>

              {isGuest ? (
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Guest</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Synced</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#170b09] border border-[#301a14] hover:border-[#e5c378] text-xs font-bold text-[#f7f0ea]/80 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] to-[#8f2d1b] border border-[#e5c378] text-xs font-black text-white uppercase tracking-wider shadow-[0_4px_14px_rgba(200,75,49,0.4)] hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
