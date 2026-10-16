import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '../../store/useSocialStore';
import { useGameStore } from '../../store/useGameStore';
import { AVATAR_PRESETS } from '../../types/auth';
import { X, Check } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const MatchInviteToast: React.FC = () => {
  const { incomingInvitation, acceptInvitation, declineInvitation } = useSocialStore();
  const { confirmAndStartMatch, updatePendingRules } = useGameStore();
  const [secondsRemaining, setSecondsRemaining] = useState(20);

  useEffect(() => {
    if (!incomingInvitation) return;

    // Haptic buzz on invite arrival
    try {
      if (useGameStore.getState().hapticsEnabled) {
        Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch {}

    setSecondsRemaining(20);
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          declineInvitation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingInvitation, declineInvitation]);

  if (!incomingInvitation) return null;

  const avatar =
    AVATAR_PRESETS.find(a => a.id === incomingInvitation.senderAvatarId) || AVATAR_PRESETS[0];

  const handleAccept = () => {
    const invite = acceptInvitation();
    if (invite) {
      updatePendingRules({
        mode: invite.mode,
        buyIn: invite.stakeBuyIn,
        targetScore: invite.targetScore,
        roomCode: invite.roomCode,
        playType: 'ONLINE',
      });
      confirmAndStartMatch();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-3 select-none font-sans-clean pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -25, scale: 0.95 }}
          className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-emerald-500/80 rounded-2xl p-3 shadow-[0_15px_40px_rgba(0,0,0,0.9)] text-slate-100 flex flex-col gap-2 relative overflow-hidden"
        >
          {/* Top Progress Countdown Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(secondsRemaining / 20) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* Sender Hero */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatar.gradient} border border-slate-600 flex items-center justify-center text-lg shadow shrink-0`}
              >
                {avatar.icon}
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-white truncate">
                    {incomingInvitation.senderName}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                    Invite
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {incomingInvitation.mode.replace('_', ' ')} • #{incomingInvitation.roomCode}
                </div>
              </div>
            </div>

            {/* Close / Decline icon button */}
            <button
              onClick={declineInvitation}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details & Actions */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-950/80">
            <div className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
              <span>🪙 {incomingInvitation.stakeBuyIn.toLocaleString()}</span>
              <span>•</span>
              <span className="text-slate-400">{secondsRemaining}s</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={declineInvitation}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-3 py-1 rounded-xl btn-3d-platinum text-slate-950 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Join</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
