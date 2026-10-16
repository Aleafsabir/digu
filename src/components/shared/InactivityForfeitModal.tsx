import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, Clock } from 'lucide-react';
import { JuicyButton } from './JuicyButton';

interface InactivityForfeitModalProps {
  onReturnToLobby: () => void;
  tablePot?: number;
  tableBuyIn?: number;
}

export const InactivityForfeitModal: React.FC<InactivityForfeitModalProps> = ({
  onReturnToLobby,
  tablePot = 4000,
  tableBuyIn = 1000,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="bg-[#0B1512] border border-rose-500/30 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-sm w-full text-center relative overflow-hidden"
      >
        {/* Subtle top crimson glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-rose-500/10 blur-2xl pointer-events-none" />

        {/* Warning Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-rose-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-rose-300 uppercase tracking-wider mb-2">
          Match Forfeited
        </h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/20 text-[11px] font-bold text-rose-300 mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Inactivity Timeout (3/2 Away Turns)</span>
        </div>

        {/* Description */}
        <p className="text-xs text-neutral-300 leading-relaxed mb-5">
          You were away for 3 consecutive turns. As per tournament rules, 2 away turns are auto-played before the match is automatically forfeited to the opposing side.
        </p>

        {/* Summary Details */}
        <div className="bg-[#121F1B] rounded-2xl p-3.5 mb-6 text-xs space-y-2 border border-white/[0.04]">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Match Outcome</span>
            <span className="font-bold text-rose-400 uppercase tracking-wider">Opponent Victory</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Table Buy-In</span>
            <span className="font-mono font-bold text-neutral-300">{tableBuyIn} Coins</span>
          </div>
          <div className="flex justify-between items-center border-t border-white/[0.05] pt-2">
            <span className="text-neutral-400">Awarded Table Pot</span>
            <span className="font-mono font-bold text-amber-400">{tablePot} Coins</span>
          </div>
        </div>

        {/* Return to Lobby CTA */}
        <JuicyButton
          variant="vermilion"
          onClick={onReturnToLobby}
          className="w-full flex items-center justify-center gap-2 py-3.5 font-bold uppercase tracking-wider shadow-lg"
        >
          <Home className="w-4 h-4" />
          <span>Return to Lobby</span>
        </JuicyButton>
      </motion.div>
    </div>
  );
};
