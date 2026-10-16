import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TableRules } from '../../core/models/types';
import { Shield, User, Users, HelpCircle, Settings, Award, Cloud, Sparkles, Info, X, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AVATAR_PRESETS } from '../../types/auth';
import { useGameStore } from '../../store/useGameStore';
import { useSocialStore } from '../../store/useSocialStore';

interface ModeSelectionScreenProps {
  onSelectMode: (mode: TableRules['mode']) => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenPrivateTable?: () => void;
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  onSelectMode,
  onOpenRules,
  onOpenSettings,
  onOpenPrivateTable,
}) => {
  const { profile, setProfileModalOpen, setAuthModalOpen } = useAuthStore();
  const { activeGame, setActiveGame } = useGameStore();
  const { friends, pendingRequests, setFriendsModalOpen } = useSocialStore();
  const hasOnlineFriends = friends.some(f => f.presenceStatus !== 'OFFLINE');
  const [showDhihaehInfo, setShowDhihaehInfo] = useState(false);
  const [selectedModeInfo, setSelectedModeInfo] = useState<{
    title: string;
    target: string;
    icon: React.ReactNode;
    specs: { icon: string; label: string }[];
  } | null>(null);

  const currentAvatar =
    AVATAR_PRESETS.find(a => a.id === profile.avatarId) || AVATAR_PRESETS[0];

  const diguModes = [
    {
      id: 'TEAM_4P' as TableRules['mode'],
      title: '4-Player Team Mode',
      subtitle: '2v2 Partnership',
      badge: '2v2 TEAM',
      badgeColor: 'bg-slate-200 text-stone-950 font-black',
      icon: <Shield className="w-9 h-9 text-slate-200" />,
      target: '1,000p',
      featured: true,
      specs: [
        { icon: '👥', label: '2v2 Partnership (N-S vs E-W)' },
        { icon: '🔄', label: '20-Card Backtracking Hand Merger' },
        { icon: '🎯', label: '1,000 Points Match Target' },
        { icon: '🏆', label: '+100 Gin Declaration Bonus' },
      ],
    },
    {
      id: 'SOLO_4P' as TableRules['mode'],
      title: '4-Player Cutthroat',
      subtitle: 'Solo Free-For-All',
      badge: 'SOLO 4P',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold',
      icon: <Users className="w-9 h-9 text-cyan-300" />,
      target: '1,000p',
      featured: false,
      specs: [
        { icon: '👤', label: '4-Player Free-For-All' },
        { icon: '⚡', label: 'First to Gin (4+3+3) Wins' },
        { icon: '🎯', label: '1,000 Points Match Target' },
        { icon: '💀', label: '-100 Zero Melds Penalty' },
      ],
    },
    {
      id: 'SOLO_2P' as TableRules['mode'],
      title: '2-Player Head-to-Head',
      subtitle: '1v1 Duel',
      badge: 'DUEL 1v1',
      badgeColor: 'bg-emerald-500/20 text-[#05D59A] border border-emerald-500/40 font-bold',
      icon: <User className="w-9 h-9 text-[#05D59A]" />,
      target: '500p',
      featured: false,
      specs: [
        { icon: '⚔️', label: '1v1 High Intensity Duel' },
        { icon: '🎴', label: '10 Cards Standard Hand' },
        { icon: '🎯', label: '500 Points Match Target' },
        { icon: '⚡', label: 'Fast Paced Round Pacing' },
      ],
    },
    {
      id: 'PRIVATE',
      title: 'Private Table',
      subtitle: 'Room Code',
      badge: 'MULTIPLAYER',
      badgeColor: 'bg-slate-800 text-slate-300 border border-slate-700 font-bold',
      icon: <Globe className="w-9 h-9 text-slate-300" />,
      target: 'Custom',
      featured: false,
      disabled: false,
      specs: [
        { icon: '🔑', label: '6-Digit Private Room Code' },
        { icon: '🌐', label: 'Host & Join with Friends' },
        { icon: '⚙️', label: 'Custom Target Scores' },
      ],
    },
  ];

  return (
    <div className="w-screen h-screen h-[100dvh] max-h-screen bg-gradient-to-b from-[#042618] via-[#021A10] to-[#010D08] text-[#FAF7F2] flex flex-col select-none overflow-hidden p-1.5 sm:p-3 font-sans-clean">
      {/* Top Lobby Header Bar (Safe Area Padding for Camera Cutout) */}
      <header
        className="w-full flex items-center justify-between gap-2 px-2 sm:px-4 py-1.5 shrink-0"
        style={{
          paddingLeft: 'max(10px, env(safe-area-inset-left))',
          paddingRight: 'max(10px, env(safe-area-inset-right))',
          paddingTop: 'max(4px, env(safe-area-inset-top))',
        }}
      >
        {/* Left: Player Profile Chip (Tap to Edit Profile & Avatars) */}
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2 bg-[#02140D]/90 hover:bg-slate-800/80 rounded-2xl px-2.5 sm:px-3 py-1 shadow-md border border-slate-700/80 backdrop-blur-xs transition active:scale-95 cursor-pointer text-left group"
          title="Profile & Avatars"
        >
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br ${currentAvatar.gradient} flex items-center justify-center text-xs sm:text-sm shadow group-hover:scale-105 transition-transform`}
          >
            {currentAvatar.icon}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
              {profile.displayName}
            </span>
            <span className="text-[10px] text-[#F1F5F9] font-bold flex items-center gap-1 font-mono">
              <Award className="w-3 h-3 text-slate-300" /> LVL {profile.level}
            </span>
          </div>
        </button>

        {/* Center: Brand Crest */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-300 to-slate-500 text-stone-950 font-black text-sm flex items-center justify-center shadow font-thaana">
            ތ
          </div>
          <span className="font-sans-clean font-black text-base tracking-tight text-[#FAF7F2]">
            Thaasbai: <span className="text-white">{activeGame}</span>
          </span>
        </div>

        {/* Right: Wallet Balance & Pure Icon Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Coins Wallet Pill */}
          <div className="flex items-center gap-1 bg-[#02140D]/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow">
            <span className="text-xs">🪙</span>
            <span className="font-mono text-xs font-black text-[#F1F5F9]">
              {profile.coins.toLocaleString()}
            </span>
          </div>

          {/* Gems Wallet Pill */}
          <div className="hidden xs:flex items-center gap-1 bg-[#02140D]/90 border border-slate-700/80 rounded-xl px-2 py-1 shadow">
            <span className="text-xs">💎</span>
            <span className="font-mono text-xs font-black text-cyan-300">
              {profile.gems}
            </span>
          </div>

          {/* Cloud Sync Status / Login Button (Compact) */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`p-1.5 rounded-xl text-[10px] font-bold transition shadow cursor-pointer border ${
              profile.cloudSyncStatus === 'SYNCED'
                ? 'bg-emerald-950/80 text-[#05D59A] border-emerald-800'
                : 'bg-slate-800 text-slate-300 border-slate-700 animate-pulse'
            }`}
            title={profile.cloudSyncStatus === 'SYNCED' ? 'Cloud Synced' : 'Tap to Backup Account'}
          >
            <Cloud className="w-4 h-4" />
          </button>

          {/* Quick Rules (Pure Icon) */}
          <button
            onClick={onOpenRules}
            className="p-1.5 rounded-xl bg-[#02140D]/90 hover:bg-slate-800 text-slate-300 transition shadow active:scale-95 cursor-pointer border border-slate-700"
            title="Rules Handbook"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Friends & Social (Pure Icon with Online Indicator & Badge) */}
          <button
            onClick={() => setFriendsModalOpen(true)}
            className="p-1.5 rounded-xl bg-[#02140D]/90 hover:bg-slate-800 text-slate-300 transition shadow active:scale-95 cursor-pointer border border-slate-700 relative"
            title="Friends & Social"
          >
            <Users className="w-4 h-4 text-slate-300" />
            {hasOnlineFriends && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#02140D]" />
            )}
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>

          {/* Settings (Pure Icon) */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-[#02140D]/90 hover:bg-slate-800 text-slate-300 transition shadow active:scale-95 cursor-pointer border border-slate-700"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* Main Mode Selection Area */}
      <main className="w-full flex-1 flex flex-col justify-center my-auto px-2 min-h-0">
        {/* Flagship Game Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4 shrink-0">
          <button
            onClick={() => setActiveGame('DIGU')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border ${
              activeGame === 'DIGU'
                ? 'bg-slate-200 text-stone-950 border-white shadow-xl scale-102'
                : 'bg-[#02140D]/90 hover:bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className="text-base">🎴</span>
            <span>DIGU (ދިގު)</span>
          </button>

          <button
            onClick={() => setActiveGame('DHIHAEH')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border ${
              activeGame === 'DHIHAEH'
                ? 'bg-slate-200 text-stone-950 border-white shadow-xl scale-102'
                : 'bg-[#02140D]/90 hover:bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className="text-base">🔟</span>
            <span>DHIHAEH (ދިހައެއް)</span>
            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase">
              Soon
            </span>
          </button>
        </div>

        {/* Content depending on Active Game */}
        {activeGame === 'DIGU' ? (
          <div className="w-full max-w-6xl mx-auto">
            {/* Digu Mode Cards Row (Clean, Icon-Driven, Single-Row in Landscape) */}
            <div className="grid grid-cols-2 landscape:grid-cols-4 md:grid-cols-4 gap-2 sm:gap-4 overflow-y-auto max-h-[72vh] sm:max-h-none py-1">
              {diguModes.map((mode, index) => {
                return (
                  <motion.div
                    key={mode.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    onClick={() => {
                      if (mode.id === 'PRIVATE') {
                        onOpenPrivateTable ? onOpenPrivateTable() : onSelectMode('TEAM_4P');
                      } else if (mode.id) {
                        onSelectMode(mode.id as TableRules['mode']);
                      }
                    }}
                    className={`relative rounded-2xl sm:rounded-3xl p-3 sm:p-5 landscape:p-2.5 flex flex-col justify-between transition-all select-none ${
                      mode.disabled
                        ? 'bg-[#02100A] opacity-50 cursor-not-allowed border border-slate-800'
                        : mode.featured
                        ? 'bg-[#031B11] border-2 border-slate-300 shadow-[0_15px_35px_rgba(255,255,255,0.12)] hover:scale-[1.02] cursor-pointer'
                        : 'bg-[#031710] hover:bg-[#031E15] border border-slate-800 shadow-xl hover:scale-[1.02] cursor-pointer'
                    }`}
                  >
                    {/* Top Row: Badge & Target Chip & Info Button */}
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span
                        className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow ${mode.badgeColor}`}
                      >
                        {mode.badge}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-200">
                          {mode.target}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedModeInfo({
                              title: mode.title,
                              target: mode.target,
                              icon: mode.icon,
                              specs: mode.specs,
                            });
                          }}
                          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Mode info"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Center Icon & Title */}
                    <div className="flex flex-col items-center text-center my-1.5 sm:my-3 landscape:my-1">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-2xl bg-[#02140D] border border-slate-700/60 flex items-center justify-center shadow-inner mb-2 sm:mb-2.5 landscape:mb-1">
                        {mode.icon}
                      </div>
                      <h3 className="font-black text-xs sm:text-base landscape:text-xs text-white leading-tight font-sans-clean">
                        {mode.title}
                      </h3>
                      <span className="text-[9px] sm:text-[10px] text-slate-300 font-bold mt-0.5">
                        {mode.subtitle}
                      </span>
                    </div>

                    {/* Select Play Button */}
                    <button
                      disabled={mode.disabled}
                      className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow ${
                        mode.disabled
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : mode.featured
                          ? 'btn-3d-platinum text-stone-950 active:scale-95'
                          : 'btn-3d-dark text-[#F1F5F9] active:scale-95'
                      }`}
                    >
                      {mode.disabled ? 'Coming Soon' : 'Play'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* DHIHAEH (Coming Soon) Showcase View */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto w-full bg-[#18110b] rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden my-auto border-0"
          >
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 text-amber-300 text-xs font-black uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>In Development</span>
            </div>

            {/* Icon Crest */}
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[#851e1e] via-[#661616] to-[#3b0b0b] text-amber-300 flex items-center justify-center shadow-2xl mb-3 text-2xl font-black font-thaana border-0">
              ދި
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white font-craft mb-1">
              Thaasbai: DHIHAEH (ދިހައެއް)
            </h2>
            <div className="text-xs text-amber-300 font-bold mb-4">
              Traditional Maldivian Trick-Taking Card Game
            </div>

            {/* Interactive Buttons */}
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setShowDhihaehInfo(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border-0"
              >
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Details</span>
              </button>

              <button
                onClick={() => setActiveGame('DIGU')}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-stone-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer uppercase tracking-wider border-0"
              >
                Play Digu
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Tap-to-View Mode Detail Info Modal (Borderless Minimal) */}
      {selectedModeInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="bg-[#12161a] rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xs sm:max-w-sm w-full text-center relative border-0">
            <button
              onClick={() => setSelectedModeInfo(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#1c2228] flex items-center justify-center mb-2 shadow border-0">
              {selectedModeInfo.icon}
            </div>

            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider mb-1 font-craft">
              {selectedModeInfo.title}
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 font-bold mb-3 block">
              🎯 Match Target: {selectedModeInfo.target}
            </span>

            {/* Visual Spec Rows */}
            <div className="space-y-1.5 mb-4 text-left">
              {selectedModeInfo.specs.map((spec, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-[#1a2027] rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 border-0 shadow-sm"
                >
                  <span className="text-sm shrink-0">{spec.icon}</span>
                  <span className="font-semibold text-[11px]">{spec.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedModeInfo(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-stone-950 font-black text-xs cursor-pointer uppercase tracking-wider active:scale-95 shadow-md border-0"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Dhihaeh Info Modal (Borderless Minimal) */}
      {showDhihaehInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="bg-[#12161a] rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xs sm:max-w-sm w-full text-center relative border-0">
            <button
              onClick={() => setShowDhihaehInfo(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#851e1e] to-[#3b0b0b] text-amber-300 flex items-center justify-center mb-2 shadow text-xl font-thaana font-black border-0">
              ދި
            </div>

            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider mb-3 font-craft">
              Thaasbai: Dhihaeh
            </h3>

            {/* Visual Spec Rows */}
            <div className="space-y-1.5 mb-4 text-left">
              <div className="flex items-center gap-2 bg-[#1a2027] rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 border-0 shadow-sm">
                <span className="text-sm shrink-0">🔟</span>
                <span className="font-semibold text-[11px]">Traditional Maldivian Trick-Taking</span>
              </div>
              <div className="flex items-center gap-2 bg-[#1a2027] rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 border-0 shadow-sm">
                <span className="text-sm shrink-0">⏳</span>
                <span className="font-semibold text-[11px]">Rules & AI Solver in Development</span>
              </div>
              <div className="flex items-center gap-2 bg-[#1a2027] rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 border-0 shadow-sm">
                <span className="text-sm shrink-0">🎴</span>
                <span className="font-semibold text-[11px]">Available Soon</span>
              </div>
            </div>

            <button
              onClick={() => setShowDhihaehInfo(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-stone-950 font-black text-xs cursor-pointer uppercase tracking-wider active:scale-95 shadow-md border-0"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
