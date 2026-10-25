import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../../types/auth';

interface CloudConflictModalProps {
  isOpen: boolean;
  cloudProfile: UserProfile | null;
  localProfile: UserProfile | null;
  onResolve: (choice: 'cloud' | 'local', mergeChips: boolean) => Promise<void>;
  onCancel: () => void;
}

export const CloudConflictModal: React.FC<CloudConflictModalProps> = ({
  isOpen,
  cloudProfile,
  localProfile,
  onResolve,
  onCancel,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'cloud' | 'local'>('cloud');
  const [mergeChips, setMergeChips] = useState(true);
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen || !cloudProfile || !localProfile) return null;

  const handleConfirm = async () => {
    setIsResolving(true);
    try {
      await onResolve(selectedChoice, mergeChips);
    } finally {
      setIsResolving(false);
    }
  };

  const cloudWinRate =
    cloudProfile.stats?.gamesPlayed > 0
      ? Math.round((cloudProfile.stats.gamesWon / cloudProfile.stats.gamesPlayed) * 100)
      : 0;

  const localWinRate =
    localProfile.stats?.gamesPlayed > 0
      ? Math.round((localProfile.stats.gamesWon / localProfile.stats.gamesPlayed) * 100)
      : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-2xl rounded-3xl p-5 sm:p-7 relative overflow-hidden border border-[#3d2019] shadow-[0_30px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(200,75,49,0.15)] bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605]"
        >
          {/* Gold Corner Filigree Ornaments */}
          <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-40">
            <svg viewBox="0 0 64 64" fill="none" stroke="#e5c378">
              <path d="M0 0 L40 0 C40 20 20 40 0 40 Z" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-40 transform rotate-90">
            <svg viewBox="0 0 64 64" fill="none" stroke="#e5c378">
              <path d="M0 0 L40 0 C40 20 20 40 0 40 Z" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Centerpiece Header Icon & Title */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#c84b31]/30 to-[#e5c378]/20 border border-[#e5c378]/60 shadow-[0_0_20px_rgba(200,75,49,0.3)] mb-2.5 relative">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#e5c378]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16m-5 4l-3-3-3 3m3-3v8" />
              </svg>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#c84b31] text-[9px] font-black text-white font-mono uppercase shadow-md">
                Conflict
              </span>
            </div>

            <h2 className="font-cinzel font-black text-xl sm:text-2xl text-[#f7f0ea] tracking-tight">
              Cloud Account Connected
            </h2>
            <p className="font-thaana text-xs sm:text-sm text-[#e5c378] font-bold mt-0.5" dir="rtl">
              މި ގޫގަލް އެކައުންޓުގައި ކުރިން ރައްކާކުރެވިފައިވާ ޑޭޓާ ފެނިއްޖެ
            </p>
            <p className="text-xs text-[#f7f0ea]/70 max-w-md mx-auto mt-1 leading-relaxed">
              We found existing progress linked to{' '}
              <span className="text-[#e5c378] font-mono font-bold">
                {cloudProfile.email || 'your Google account'}
              </span>
              . Choose which profile you want to use on this device:
            </p>
          </div>

          {/* Side-by-Side Comparison Choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
            {/* Option 1: Cloud Profile (Google Backup) */}
            <div
              onClick={() => setSelectedChoice('cloud')}
              className={`rounded-2xl p-4 border-2 relative flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                selectedChoice === 'cloud'
                  ? 'border-[#e5c378] bg-gradient-to-br from-[#301a14]/95 to-[#170b09]/98 shadow-[0_0_25px_rgba(229,195,120,0.35)]'
                  : 'border-[#24120e] bg-[#120807]/70 opacity-75 hover:opacity-95 hover:border-[#4a2820]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black font-mono tracking-wider bg-[#e5c378]/20 border border-[#e5c378] text-[#e5c378] flex items-center gap-1 uppercase">
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Google Cloud Save
                </span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                    selectedChoice === 'cloud'
                      ? 'border-[#e5c378] bg-[#e5c378] text-[#0d0605]'
                      : 'border-[#522b22] bg-transparent text-transparent'
                  }`}
                >
                  ✓
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#301a14]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c84b31] to-[#170b09] border border-[#e5c378] flex items-center justify-center text-xl shadow-md">
                  👑
                </div>
                <div>
                  <div className="font-bold text-sm text-[#f7f0ea]">
                    {cloudProfile.displayName || 'Google Player'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#301a14] text-[#e5c378] font-black">
                      LVL {cloudProfile.level}
                    </span>
                    <span className="text-[10px] font-mono text-[#f7f0ea]/50">
                      {cloudProfile.friendCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>🪙</span> Coins Balance
                  </span>
                  <span className="font-mono font-black text-sm text-[#e5c378]">
                    {cloudProfile.coins.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>💎</span> Gems
                  </span>
                  <span className="font-mono font-bold text-xs text-[#e5c378]">
                    {cloudProfile.gems}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>🏆</span> Matches Won
                  </span>
                  <span className="font-mono font-bold text-xs text-[#f7f0ea]">
                    {cloudProfile.stats?.gamesWon || 0} / {cloudProfile.stats?.gamesPlayed || 0}{' '}
                    <span className="text-[#e5c378] text-[10px]">({cloudWinRate}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>⚡</span> Total Gins
                  </span>
                  <span className="font-mono font-bold text-xs text-[#f7f0ea]">
                    {cloudProfile.stats?.totalGins || 0}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2 text-[10px] text-[#e5c378] font-semibold text-center flex items-center justify-center gap-1">
                <span>✓</span> Recommended for returning players
              </div>
            </div>

            {/* Option 2: Local Profile (This Device) */}
            <div
              onClick={() => setSelectedChoice('local')}
              className={`rounded-2xl p-4 border-2 relative flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                selectedChoice === 'local'
                  ? 'border-[#e5c378] bg-gradient-to-br from-[#301a14]/95 to-[#170b09]/98 shadow-[0_0_25px_rgba(229,195,120,0.35)]'
                  : 'border-[#24120e] bg-[#120807]/70 opacity-75 hover:opacity-95 hover:border-[#4a2820]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black font-mono tracking-wider bg-[#301a14] border border-[#522b22] text-[#f7f0ea]/70 uppercase">
                  This Device (Guest)
                </span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                    selectedChoice === 'local'
                      ? 'border-[#e5c378] bg-[#e5c378] text-[#0d0605]'
                      : 'border-[#522b22] bg-transparent text-transparent'
                  }`}
                >
                  ✓
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#301a14]">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#301a14] to-[#0d0605] border border-[#522b22] flex items-center justify-center text-xl shadow-md">
                  👤
                </div>
                <div>
                  <div className="font-bold text-sm text-[#f7f0ea]">
                    {localProfile.displayName || 'Guest Player'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#301a14] text-[#f7f0ea]/70 font-black">
                      LVL {localProfile.level}
                    </span>
                    <span className="text-[10px] font-mono text-[#f7f0ea]/40">
                      {localProfile.friendCode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>🪙</span> Coins Balance
                  </span>
                  <span className="font-mono font-black text-sm text-[#f7f0ea]">
                    {localProfile.coins.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>💎</span> Gems
                  </span>
                  <span className="font-mono font-bold text-xs text-[#f7f0ea]/70">
                    {localProfile.gems}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>🏆</span> Matches Won
                  </span>
                  <span className="font-mono font-bold text-xs text-[#f7f0ea]/70">
                    {localProfile.stats?.gamesWon || 0} / {localProfile.stats?.gamesPlayed || 0}{' '}
                    <span className="text-[#f7f0ea]/40 text-[10px]">({localWinRate}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#f7f0ea]/60 flex items-center gap-1">
                    <span>⚡</span> Total Gins
                  </span>
                  <span className="font-mono font-bold text-xs text-[#f7f0ea]/70">
                    {localProfile.stats?.totalGins || 0}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2 text-[10px] text-[#f7f0ea]/50 text-center">
                Will overwrite cloud save with local guest progress
              </div>
            </div>
          </div>

          {/* Smart Chip Merge Callout */}
          <div className="mb-5 p-3 rounded-xl bg-[#170b09]/80 border border-[#301a14] flex items-start gap-2.5">
            <input
              type="checkbox"
              id="modal-check-smart-merge"
              checked={mergeChips}
              onChange={e => setMergeChips(e.target.checked)}
              className="mt-0.5 accent-[#e5c378] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="modal-check-smart-merge" className="text-xs text-[#f7f0ea]/80 cursor-pointer select-none leading-relaxed">
              <span className="font-bold text-[#e5c378]">Smart Chip Merge:</span> Don't lose recent guest earnings! Add any extra chips won locally to your cloud total so nothing is wasted.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#301a14]">
            <button
              onClick={onCancel}
              disabled={isResolving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#301a14] text-xs font-bold text-[#f7f0ea]/70 hover:text-white hover:bg-[#1f0d0a] transition cursor-pointer"
            >
              Cancel / Keep Playing as Guest
            </button>

            <button
              onClick={handleConfirm}
              disabled={isResolving}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-[#0d0605] font-black text-xs font-cinzel tracking-wider uppercase shadow-[0_0_20px_rgba(229,195,120,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>
                {isResolving
                  ? 'Saving...'
                  : selectedChoice === 'cloud'
                  ? 'Restore Cloud Save'
                  : 'Keep Local Save & Overwrite Cloud'}
              </span>
              <span>→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
