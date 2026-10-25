import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocialStore } from '../../store/useSocialStore';
import {
  Users,
  Settings,
  Gift,
  Wifi,
  ChevronRight,
  Lock,
  LogOut,
  HelpCircle,
  Bell,
  X,
} from 'lucide-react';
import { AVATAR_PRESETS, AvatarPreset } from '../../types/auth';

interface MainLobbyScreenProps {
  onSelectGame: (game: 'DIGU' | 'DHIHAEH' | 'BONDI') => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onSwitchAccount: () => void;
}

// Pure SVG In-Game Currency Icons
const RanDhadhuCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="url(#coin-gold-grad)" stroke="#FDE68A" strokeWidth="1" />
    <circle cx="12" cy="12" r="7.5" stroke="#92400E" strokeWidth="0.75" strokeDasharray="1.5 1" opacity="0.7" />
    <circle cx="12" cy="12" r="6" fill="#F59E0B" opacity="0.3" />
    <path d="M12 7 C10 9, 10 15, 12 17 C14 15, 14 9, 12 7 Z" fill="#FEF3C7" stroke="#92400E" strokeWidth="0.5" />
    <line x1="12" y1="8" x2="12" y2="16" stroke="#92400E" strokeWidth="0.5" />
    <defs>
      <linearGradient id="coin-gold-grad" x1="2" y1="2" x2="22" y2="22">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="45%" stopColor="#E5C378" />
        <stop offset="100%" stopColor="#B48D36" />
      </linearGradient>
    </defs>
  </svg>
);

const LagoonGemIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <polygon points="12,2 21,9 12,22 3,9" fill="url(#gem-cyan-grad)" stroke="#A5F3FC" strokeWidth="1" />
    <polygon points="12,2 17,9 12,22 7,9" fill="#22D3EE" opacity="0.5" />
    <line x1="3" y1="9" x2="21" y2="9" stroke="#E0F2FE" strokeWidth="0.75" />
    <defs>
      <linearGradient id="gem-cyan-grad" x1="12" y1="2" x2="12" y2="22">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="50%" stopColor="#06B6D4" />
        <stop offset="100%" stopColor="#0891B2" />
      </linearGradient>
    </defs>
  </svg>
);

export const MainLobbyScreen: React.FC<MainLobbyScreenProps> = ({
  onSelectGame,
  onOpenSettings,
  onOpenRules,
  onSwitchAccount,
}) => {
  const { profile, claimDailyBonus, setProfileModalOpen } = useAuthStore();
  const { setFriendsModalOpen, friends } = useSocialStore();

  const [teaserGame, setTeaserGame] = useState<{
    title: string;
    thaana: string;
    desc: string;
    phase: string;
  } | null>(null);
  const [dailyBonusClaimedMsg, setDailyBonusClaimedMsg] = useState<string | null>(null);

  const currentAvatar: AvatarPreset =
    AVATAR_PRESETS.find((a: AvatarPreset) => a.id === profile.avatarId) || AVATAR_PRESETS[0];

  const onlineFriendsCount = friends.filter((f) => f.presenceStatus !== 'OFFLINE').length;

  const handleDailyBonus = () => {
    const res = claimDailyBonus();
    if (res.success) {
      setDailyBonusClaimedMsg(`Claimed +${res.bonusAmount} Free Coins!`);
    } else {
      setDailyBonusClaimedMsg(res.message || 'Already claimed today!');
    }
    setTimeout(() => setDailyBonusClaimedMsg(null), 3500);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-radial from-[#24110d] via-[#170b09] to-[#0d0605] p-3 sm:p-5 select-none overflow-hidden font-sans-clean text-[#f7f0ea]">
      {/* Top Header Bar with Safe Area Top Clearance */}
      <header
        className="flex items-center justify-between w-full pb-2 border-b border-[#301a14] shrink-0"
        style={{
          paddingTop: 'max(6px, env(safe-area-inset-top))',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {/* Left: Profile Pill */}
        <div
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2.5 bg-[#170b09]/90 border border-[#301a14] px-2 py-1 rounded-full cursor-pointer hover:border-[#e5c378] transition shadow-md"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c84b31] to-[#8f2d1b] flex items-center justify-center font-black text-xs text-white border border-[#e5c378]/60">
            {currentAvatar.icon || profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col text-left pr-2">
            <span className="text-xs font-black text-[#f7f0ea] flex items-center gap-1 leading-tight font-serif-luxury">
              {profile.displayName}
              <small className="text-[10px] text-[#e5c378]/70">▼</small>
            </span>
            <span className="text-[9px] font-black text-[#e5c378] tracking-wider font-mono">
              LVL {profile.level} • {profile.loginProvider.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Holhuashi Brand Header */}
        <div className="hidden sm:flex items-center gap-2.5 bg-[#170b09]/90 border border-[#301a14] px-3 py-1 rounded-2xl shadow">
          <img
            src="/brand_assets/holhuashi_app_icon_v3.jpg"
            alt="Holhuashi Crest"
            className="w-6 h-6 rounded-lg object-cover border border-[#e5c378]/60 shadow-sm"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-thaana text-base font-black text-[#e5c378]">ހޮޅުއަށި</span>
            <span className="font-serif-luxury font-black text-xs text-[#f7f0ea] tracking-wider border-l border-[#301a14] pl-1.5">
              HOLHUASHI
            </span>
          </div>
        </div>

        {/* Right: Currency Chips & Actions */}
        <div className="flex items-center gap-2">
          {/* Currency Chips */}
          <div className="flex items-center gap-1.5 bg-[#0d0605] border border-[#301a14] px-2.5 py-1 rounded-full text-xs font-black text-[#e5c378] shadow">
            <RanDhadhuCoinIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{profile.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0d0605] border border-[#301a14] px-2.5 py-1 rounded-full text-xs font-black text-[#c84b31] shadow">
            <LagoonGemIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-xs text-[#c84b31]">180</span>
          </div>

          {/* Social */}
          <button
            onClick={() => setFriendsModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#170b09] border border-[#301a14] text-[#f7f0ea]/80 hover:text-white hover:border-[#e5c378] flex items-center justify-center relative cursor-pointer transition shadow"
            title="Friends & Social"
          >
            <Users className="w-4 h-4" />
            {onlineFriendsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e5c378]" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl bg-[#170b09] border border-[#301a14] text-[#f7f0ea]/80 hover:text-white hover:border-[#e5c378] flex items-center justify-center cursor-pointer transition shadow"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Switch Account */}
          <button
            onClick={onSwitchAccount}
            className="w-9 h-9 rounded-xl bg-[#170b09] border border-[#301a14] text-[#f7f0ea]/80 hover:text-white hover:border-[#c84b31] flex items-center justify-center cursor-pointer transition shadow"
            title="Switch Account / Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Daily Bonus Notification Banner */}
      {dailyBonusClaimedMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#24110d] border border-[#e5c378] text-[#e5c378] px-4 py-1.5 rounded-full text-xs font-black shadow-lg"
        >
          {dailyBonusClaimedMsg}
        </motion.div>
      )}

      {/* Main Carousel Arena */}
      <main className="flex-1 flex flex-col items-center justify-center my-2 max-w-5xl w-full mx-auto">
        <div className="text-center mb-3">
          <span className="text-[11px] font-black tracking-widest text-[#e5c378] uppercase flex items-center justify-center gap-1.5 font-mono">
            <span>🇲🇻</span>
            <span>Select Traditional Maldivian Game</span>
          </span>
        </div>

        {/* 3 Games Carousel Cards (Fluid Height Clamped to Viewport Height) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 w-full px-2 max-w-4xl">
          {/* Card 1: DIGU (ޑިގު) - ACTIVE */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => onSelectGame('DIGU')}
            className="relative h-[clamp(210px,52dvh,245px)] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#c84b31] p-3 sm:p-4 flex flex-col justify-between shadow-[0_0_35px_rgba(200,75,49,0.35)] cursor-pointer overflow-hidden group hover:border-[#e5c378] transition"
          >
            {/* Subtle background vector caustics */}
            <div className="absolute inset-0 bg-radial from-[#c84b31]/10 via-transparent to-black/60 pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#c84b31]/30 border border-[#e5c378]/60 text-[9px] font-black text-[#e5c378] tracking-wider uppercase font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e5c378] animate-pulse" />
                LIVE • PLAY NOW
              </span>
              <span className="text-[10px] font-bold text-[#f7f0ea]/60 font-mono">4P & 1v1</span>
            </div>

            {/* Center Emblem: Ornate Lacquer Medallion with Daviyani (ޑ) */}
            <div className="relative my-auto flex flex-col items-center z-10">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-1">
                {/* Backing fanned cards with glowing lacquer aura */}
                <div className="absolute -left-2 top-1 w-7 h-11 rounded-md bg-[#301a14] border border-[#c84b31]/50 -rotate-12 shadow flex items-center justify-center opacity-70">
                  <span className="text-[8px] text-[#f7f0ea]">♠</span>
                </div>
                <div className="absolute -right-2 top-1 w-7 h-11 rounded-md bg-[#301a14] border border-[#e5c378]/50 rotate-12 shadow flex items-center justify-center opacity-70">
                  <span className="text-[8px] text-[#e5c378]">♥</span>
                </div>
                {/* Center Lacquer Shield */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#3d2019] via-[#24110d] to-[#0d0605] border-2 border-[#e5c378] flex items-center justify-center shadow-[0_0_20px_rgba(200,75,49,0.4)] relative z-10 group-hover:scale-105 transition-transform duration-300">
                  <div className="w-10 h-10 rounded-lg border border-[#c84b31]/60 flex items-center justify-center bg-[#170b09]/90">
                    <span className="font-thaana text-2xl sm:text-3xl font-black text-[#e5c378] drop-shadow-[0_2px_8px_rgba(229,195,120,0.8)]">
                      ޑ
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-serif-luxury">
                DIGU
                <span className="font-thaana text-lg text-[#e5c378]">ޑިގު</span>
              </h3>
              <p className="text-[10px] text-[#f7f0ea]/70 mt-0.5 line-clamp-1 leading-snug text-center">
                Classic 10-card Gin Rummy. Form runs, build sets, and slam Gin!
              </p>
            </div>

            <div className="z-10 flex flex-col gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('DIGU');
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] hover:brightness-110 text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(200,75,49,0.45)] transition active:scale-95 cursor-pointer border-0"
              >
                <span>Enter Digu Lobby</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="text-[9px] font-bold text-[#e5c378]/80 text-center font-mono">
                🟡 1,420 Active Players
              </div>
            </div>
          </motion.div>

          {/* Card 2: DHIHAEH (ދިހައެއް) - COMING SOON */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() =>
              setTeaserGame({
                title: 'Dhihaeh',
                thaana: 'ދިހައެއް',
                desc: 'Fast-paced Maldivian 10s counting and trick collection. Players compete to capture 10-point target cards, sweep the table, and outwit opponents across rapid rounds.',
                phase: 'Rules Drafting & Balancing Phase',
              })
            }
            className="relative h-[clamp(210px,52dvh,245px)] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1a0a14] via-[#0a1410] to-[#010A06] border-2 border-purple-900/60 p-3 sm:p-4 flex flex-col justify-between shadow-lg cursor-pointer overflow-hidden group opacity-90 hover:opacity-100 hover:border-purple-400 transition"
          >
            <div className="absolute inset-0 bg-radial from-purple-900/10 via-transparent to-black/60 pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-700/60 text-[9px] font-bold text-purple-300 tracking-wider uppercase">
                <Lock className="w-2.5 h-2.5 text-purple-400" />
                COMING SOON
              </span>
              <span className="text-[10px] font-bold text-slate-400">4-Player</span>
            </div>

            {/* Center Emblem: Crimson & Amethyst Medallion with Dhaalu (ދި) */}
            <div className="relative my-auto flex flex-col items-center z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#581c87] via-[#2e1065] to-[#0d0605] border-2 border-[#E5C378]/80 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] mb-1 relative group-hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg border border-purple-400/50 flex flex-col items-center justify-center bg-[#170524]/90">
                  <span className="font-thaana text-2xl sm:text-3xl font-black text-[#E5C378] drop-shadow-[0_2px_8px_rgba(229,195,120,0.6)]">
                    ދި
                  </span>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                DHIHAEH
                <span className="font-thaana text-lg text-[#E5C378]">ދިހައެއް</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-snug text-center">
                10s counting & trick collection. Secure target cards.
              </p>
            </div>

            <div className="z-10 flex flex-col gap-1">
              <button className="w-full py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 border border-slate-700 transition cursor-pointer">
                <span>Preview Rules</span>
              </button>
              <div className="text-[9px] font-bold text-purple-400/70 text-center">
                Rules Drafting Phase
              </div>
            </div>
          </motion.div>

          {/* Card 3: BONDI (ބޮނޑި) - COMING SOON */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() =>
              setTeaserGame({
                title: 'Bondi',
                thaana: 'ބޮނޑި',
                desc: 'Strategic Maldivian card clustering and bundle management. Players build powerful card combinations and bluff their hand strength to force table folds.',
                phase: 'Rules Drafting & Concept Phase',
              })
            }
            className="relative h-[clamp(210px,52dvh,245px)] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#121c2b] via-[#100b0a] to-[#0d0605] border-2 border-blue-900/60 p-3 sm:p-4 flex flex-col justify-between shadow-lg cursor-pointer overflow-hidden group opacity-90 hover:opacity-100 hover:border-blue-400 transition"
          >
            <div className="absolute inset-0 bg-radial from-blue-900/10 via-transparent to-black/60 pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-700/60 text-[9px] font-bold text-blue-300 tracking-wider uppercase">
                <Lock className="w-2.5 h-2.5 text-blue-400" />
                COMING SOON
              </span>
              <span className="text-[10px] font-bold text-[#f7f0ea]/70">2-6 Players</span>
            </div>

            {/* Center Emblem: Sapphire & Cyan Medallion with Baa (ބ) */}
            <div className="relative my-auto flex flex-col items-center z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#0c2e4e] to-[#0d0605] border-2 border-[#E5C378]/80 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-1 relative group-hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-lg border border-cyan-400/50 flex flex-col items-center justify-center bg-[#07192b]/90">
                  <span className="font-thaana text-2xl sm:text-3xl font-black text-[#E5C378] drop-shadow-[0_2px_8px_rgba(229,195,120,0.6)]">
                    ބ
                  </span>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                BONDI
                <span className="font-thaana text-lg text-[#E5C378]">ބޮނޑި</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-snug text-center">
                Strategic card clustering & bluffing tactics.
              </p>
            </div>

            <div className="z-10 flex flex-col gap-1">
              <button className="w-full py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 border border-slate-700 transition cursor-pointer">
                <span>Preview Rules</span>
              </button>
              <div className="text-[9px] font-bold text-blue-400/70 text-center">
                Concept Balancing Phase
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer Navigation Bar with Safe Area Bottom Clearance */}
      <footer
        className="flex items-center justify-between w-full pt-2 border-t border-slate-800/80 shrink-0"
        style={{
          paddingBottom: 'max(8px, calc(env(safe-area-inset-bottom) + 4px))',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleDailyBonus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#301a14] border border-[#e5c378]/40 hover:border-[#e5c378] text-[#e5c378] text-xs font-bold transition shadow cursor-pointer font-mono"
          >
            <Gift className="w-4 h-4 text-[#e5c378]" />
            <span>Daily Free Bonus</span>
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#170b09] border border-[#301a14] hover:border-[#e5c378] text-[#f7f0ea]/80 text-xs font-bold transition shadow cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#e5c378]" />
            <span>Game Guide</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-[#f7f0ea]/60 font-mono">
          <Wifi className="w-3.5 h-3.5 text-[#e5c378]" />
          <span>Maldives Central (14ms)</span>
          <span className="w-2 h-2 rounded-full bg-[#e5c378]" />
        </div>
      </footer>

      {/* Teaser Rules Modal */}
      <AnimatePresence>
        {teaserGame && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-b from-[#24110d] via-[#170b09] to-[#0d0605] border-2 border-[#301a14] rounded-3xl p-6 max-w-sm w-full text-[#f7f0ea] shadow-2xl relative text-left"
            >
              <button
                onClick={() => setTeaserGame(null)}
                className="absolute top-4 right-4 text-[#e5c378]/60 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎴</span>
                <div>
                  <h3 className="text-lg font-black text-white font-serif-luxury">{teaserGame.title}</h3>
                  <span className="font-thaana text-sm text-[#e5c378]">
                    {teaserGame.thaana}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#f7f0ea]/70 leading-relaxed mb-4">
                {teaserGame.desc}
              </p>

              <div className="bg-[#0d0605] border border-[#301a14] rounded-xl p-3 mb-4">
                <div className="text-[10px] font-black text-[#f7f0ea]/50 uppercase font-mono">
                  Development Status:
                </div>
                <div className="text-xs font-bold text-[#e5c378] mt-0.5 font-mono">
                  {teaserGame.phase}
                </div>
              </div>

              <button
                onClick={() => setTeaserGame(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#d65a3f] to-[#c84b31] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md border-0 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Notify Me When Playable</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
