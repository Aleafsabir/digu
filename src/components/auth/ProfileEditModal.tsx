import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { AVATAR_PRESETS } from '../../types/auth';
import { X, Check, Edit2, Trophy, Flame, Cloud, Sparkles, RefreshCw } from 'lucide-react';
import { JuicyButton } from '../shared/JuicyButton';

export const ProfileEditModal: React.FC = () => {
  const {
    profile,
    isProfileModalOpen,
    setProfileModalOpen,
    setDisplayName,
    setAvatar,
    setAuthModalOpen,
    syncWithCloud,
    isSyncing,
  } = useAuthStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);

  if (!isProfileModalOpen) return null;

  const currentAvatar =
    AVATAR_PRESETS.find(a => a.id === profile.avatarId) || AVATAR_PRESETS[0];

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setDisplayName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  const winRate =
    profile.stats.gamesPlayed > 0
      ? Math.round((profile.stats.gamesWon / profile.stats.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none font-sans-clean">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#301a14] rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(200,75,49,0.15)] max-w-lg w-full text-[#f7f0ea] relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={() => setProfileModalOpen(false)}
          className="absolute top-4 right-4 text-[#e5c378]/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer border-0"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Profile Hero Card */}
        <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-[#301a14] pb-4 mb-4">
          {/* Active Avatar Badge */}
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentAvatar.gradient} border border-[#301a14] flex items-center justify-center text-4xl shadow-xl`}
            >
              {currentAvatar.icon}
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFF0C8] via-[#E5C378] to-[#B48D36] text-[9px] font-black font-mono text-[#1A1202] shadow-md border border-[#FEF08A]">
              LVL {profile.level}
            </span>
          </div>

          {/* Name & Title */}
          <div className="flex-1 text-center sm:text-left">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <input
                  type="text"
                  maxLength={18}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  autoFocus
                  className="px-2.5 py-1 rounded-xl bg-[#0d0605] border border-[#301a14] focus:border-[#e5c378] text-sm font-bold text-[#f7f0ea] outline-none w-44"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-xl bg-[#c84b31] hover:bg-[#d65a3f] text-white font-bold transition border-0 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                <h2 className="text-lg font-black text-[#f7f0ea] font-serif-luxury">{profile.displayName}</h2>
                <button
                  onClick={() => {
                    setNameInput(profile.displayName);
                    setIsEditingName(true);
                  }}
                  className="text-[#e5c378]/60 hover:text-white p-1 rounded transition border-0 cursor-pointer"
                  title="Edit Nickname"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="text-xs text-[#e5c378] font-bold mb-2">
              {currentAvatar.title} • {profile.loginProvider} Account
            </div>

            {/* Level XP Bar */}
            <div className="w-full max-w-xs space-y-1 mx-auto sm:mx-0">
              <div className="flex justify-between text-[10px] text-[#f7f0ea]/70 font-bold font-mono">
                <span>XP {profile.xp}</span>
                <span>{profile.xpNextLevel} XP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0d0605] border border-[#301a14] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#c84b31] to-[#e5c378] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (profile.xp / profile.xpNextLevel) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Choose Avatar Gallery */}
        <div className="mb-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#e5c378] mb-2.5 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[#e5c378]" /> Choose Avatar Portrait
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_PRESETS.map(preset => {
              const isSelected = profile.avatarId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setAvatar(preset.id)}
                  className={`p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#301a14] border-2 border-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.35)] scale-102'
                      : 'bg-[#0d0605] border border-[#301a14] hover:border-[#3d2019] hover:bg-[#170b09] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.gradient} border border-[#301a14] flex items-center justify-center text-xl shadow mb-1`}
                  >
                    {preset.icon}
                  </div>
                  <span className={`text-[10px] font-bold truncate w-full text-center ${isSelected ? 'text-[#e5c378]' : 'text-[#f7f0ea]/70'}`}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Lifetime Career Records */}
        <div className="mb-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#e5c378] mb-2.5 flex items-center gap-1.5 font-mono">
            <Trophy className="w-3.5 h-3.5 text-[#e5c378]" /> Career Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-2xl bg-[#0d0605] border border-[#301a14] text-center shadow-md">
              <span className="text-[10px] font-bold text-[#f7f0ea]/50 uppercase">Matches</span>
              <div className="text-base font-black font-mono text-[#f7f0ea] mt-0.5">
                {profile.stats.gamesPlayed}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#0d0605] border border-[#301a14] text-center shadow-md">
              <span className="text-[10px] font-bold text-[#f7f0ea]/50 uppercase">Win Rate</span>
              <div className="text-base font-black font-mono text-[#e5c378] mt-0.5">
                {winRate}%
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#0d0605] border border-[#301a14] text-center shadow-md">
              <span className="text-[10px] font-bold text-[#f7f0ea]/50 uppercase">Gins Slammed</span>
              <div className="text-base font-black font-mono text-[#f7f0ea] mt-0.5">
                {profile.stats.totalGins}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#0d0605] border border-[#301a14] text-center shadow-md">
              <span className="text-[10px] font-bold text-[#f7f0ea]/50 uppercase">Best Streak</span>
              <div className="text-base font-black font-mono text-[#c84b31] mt-0.5 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{profile.stats.bestWinStreak}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Cloud Sync / Backup Banner */}
        <div className="p-3.5 rounded-2xl bg-[#0d0605] border border-[#301a14] flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#170b09] text-[#e5c378] flex items-center justify-center border border-[#301a14]">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#f7f0ea]">
                {profile.cloudSyncStatus === 'SYNCED' ? 'Cloud Synced' : 'Guest Account (Local Only)'}
              </span>
              <span className="text-[10px] text-[#f7f0ea]/60">
                {profile.cloudSyncStatus === 'SYNCED'
                  ? 'All chips and progress saved'
                  : 'Link Google or Phone to prevent data loss'}
              </span>
            </div>
          </div>

          {profile.cloudSyncStatus === 'SYNCED' ? (
            <button
              onClick={() => syncWithCloud()}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#f7f0ea] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 border-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          ) : (
            <JuicyButton
              variant="gold"
              size="sm"
              onClick={() => {
                setProfileModalOpen(false);
                setAuthModalOpen(true);
              }}
            >
              Backup Account
            </JuicyButton>
          )}
        </div>
      </motion.div>
    </div>
  );
};
