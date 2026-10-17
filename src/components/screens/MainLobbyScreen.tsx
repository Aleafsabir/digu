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
    <div className="relative w-full h-full flex flex-col justify-between bg-radial from-[#063824] via-[#02140D] to-[#010A06] p-3 sm:p-5 select-none overflow-hidden font-sans-clean">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between w-full pb-3 border-b border-slate-800/80 shrink-0">
        {/* Left: Profile Pill */}
        <div
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2.5 bg-[#02140D]/90 border border-[#05D59A]/30 px-2 py-1 rounded-full cursor-pointer hover:border-[#05D59A] transition shadow-md"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#05D59A] to-[#047857] flex items-center justify-center font-black text-xs text-slate-950 border border-slate-200">
            {currentAvatar.icon || profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col text-left pr-2">
            <span className="text-xs font-black text-white flex items-center gap-1 leading-tight">
              {profile.displayName}
              <small className="text-[10px] text-slate-400">▼</small>
            </span>
            <span className="text-[9px] font-black text-[#05D59A] tracking-wider">
              LVL {profile.level} • {profile.loginProvider.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Holhuashi Brand Header */}
        <div className="hidden sm:flex items-center gap-2.5 bg-[#02140D]/80 border border-slate-800 px-3 py-1 rounded-2xl shadow">
          <img
            src="/brand_assets/holhuashi_app_icon_v3.jpg"
            alt="Holhuashi Crest"
            className="w-6 h-6 rounded-lg object-cover border border-[#E5C378]/60 shadow-sm"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-thaana text-base font-black text-[#E5C378]">ހޮޅުއަށި</span>
            <span className="font-sans-clean font-black text-xs text-[#05D59A] tracking-wider border-l border-slate-700 pl-1.5">
              HOLHUASHI
            </span>
          </div>
        </div>

        {/* Right: Currency Chips & Actions */}
        <div className="flex items-center gap-2">
          {/* Currency Chips */}
          <div className="flex items-center gap-1.5 bg-[#02140D]/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-black text-slate-200 shadow">
            <RanDhadhuCoinIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{profile.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#02140D]/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-black text-slate-200 shadow">
            <LagoonGemIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-xs text-cyan-300">180</span>
          </div>

          {/* Social */}
          <button
            onClick={() => setFriendsModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#02140D]/90 border border-slate-700 text-slate-300 hover:text-white hover:border-[#05D59A] flex items-center justify-center relative cursor-pointer transition shadow"
            title="Friends & Social"
          >
            <Users className="w-4 h-4" />
            {onlineFriendsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#05D59A]" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl bg-[#02140D]/90 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center cursor-pointer transition shadow"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Switch Account */}
          <button
            onClick={onSwitchAccount}
            className="w-9 h-9 rounded-xl bg-[#02140D]/90 border border-slate-700 text-slate-300 hover:text-white hover:border-rose-500/50 flex items-center justify-center cursor-pointer transition shadow"
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
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0E2A1E] border border-[#05D59A] text-[#05D59A] px-4 py-1.5 rounded-full text-xs font-black shadow-lg"
        >
          {dailyBonusClaimedMsg}
        </motion.div>
      )}

      {/* Main Carousel Arena */}
      <main className="flex-1 flex flex-col items-center justify-center my-2 max-w-5xl w-full mx-auto">
        <div className="text-center mb-3">
          <span className="text-[11px] font-black tracking-widest text-[#05D59A] uppercase flex items-center justify-center gap-1.5">
            <span>🇲🇻</span>
            <span>Select Traditional Maldivian Game</span>
          </span>
        </div>

        {/* 3 Games Carousel Cards (Pure Vector / Zero Raster Backgrounds) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full px-2 max-w-4xl">
          {/* Card 1: DIGU (ޑިގު) - ACTIVE */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => onSelectGame('DIGU')}
            className="relative h-[320px] sm:h-[360px] rounded-3xl bg-gradient-to-b from-[#063824] via-[#031B11] to-[#010D08] border-2 border-[#05D59A] p-5 flex flex-col justify-between shadow-[0_0_35px_rgba(5,213,154,0.35)] cursor-pointer overflow-hidden group"
          >
            {/* Subtle background vector caustics */}
            <div className="absolute inset-0 bg-radial from-[#05D59A]/10 via-transparent to-black/60 pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#05D59A]/20 border border-[#05D59A] text-[10px] font-black text-[#05D59A] tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-[#05D59A] animate-pulse" />
                LIVE • PLAY NOW
              </span>
              <span className="text-[11px] font-bold text-slate-400">4P & 1v1</span>
            </div>

            {/* Center Emblem: Ornate Lacquer Medallion with Daviyani (ޑ) */}
            <div className="relative my-auto flex flex-col items-center z-10">
              <div className="relative w-24 h-24 sm:w-26 sm:h-26 flex items-center justify-center mb-2">
                {/* Backing fanned cards with glowing emerald aura */}
                <div className="absolute -left-3 top-2 w-10 h-15 rounded-lg bg-[#042618] border border-[#05D59A]/50 -rotate-12 shadow-md flex items-center justify-center opacity-70">
                  <span className="text-[10px] text-[#05D59A]">♠</span>
                </div>
                <div className="absolute -right-3 top-2 w-10 h-15 rounded-lg bg-[#042618] border border-[#E5C378]/50 rotate-12 shadow-md flex items-center justify-center opacity-70">
                  <span className="text-[10px] text-[#E5C378]">♥</span>
                </div>
                {/* Center Lacquer Shield */}
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-[#064e3b] via-[#042618] to-[#010A06] border-2 border-[#E5C378] flex items-center justify-center shadow-[0_0_25px_rgba(5,213,154,0.4)] relative z-10 group-hover:scale-105 transition-transform duration-300">
                  <div className="w-16 h-16 rounded-xl border border-[#05D59A]/60 flex items-center justify-center bg-[#02140D]/85">
                    <span className="font-thaana text-4xl sm:text-5xl font-black text-[#E5C378] drop-shadow-[0_2px_12px_rgba(229,195,120,0.8)]">
                      ޑ
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                DIGU
                <span className="font-thaana text-2xl text-[#E5C378]">ޑިގު</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed text-center">
                Classic Maldivian 10-card Gin Rummy. Form melds, build runs, and slam Gin to claim the pot!
              </p>
            </div>

            <div className="z-10 flex flex-col gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('DIGU');
                }}
                className="w-full py-3 rounded-xl bg-[#05D59A] hover:bg-[#00F5AE] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(5,213,154,0.45)] transition active:scale-95 cursor-pointer border-0"
              >
                <span>Enter Digu Lobby</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-bold text-[#05D59A]/80 text-center">
                🟢 1,420 Active Players at Tables
              </div>
            </div>
          </motion.div>

          {/* Card 2: DHIHAEH (ދިހައެއް) - COMING SOON */}
          <motion.div
            whileHover={{ y: -4 }}
            onClick={() =>
              setTeaserGame({
                title: 'Dhihaeh',
                thaana: 'ދިހައެއް',
                desc: 'Fast-paced Maldivian 10s counting and trick collection. Players compete to capture 10-point target cards, sweep the table, and outwit opponents across rapid rounds.',
                phase: 'Rules Drafting & Balancing Phase',
              })
            }
            className="relative h-[320px] sm:h-[360px] rounded-3xl bg-gradient-to-b from-[#1a0a14] via-[#0a1410] to-[#010A06] border-2 border-purple-900/60 p-5 flex flex-col justify-between shadow-lg cursor-pointer overflow-hidden group opacity-90 hover:opacity-100 hover:border-purple-400 transition"
          >
            <div className="absolute inset-0 bg-radial from-purple-900/10 via-transparent to-black/60 pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-700/60 text-[10px] font-bold text-purple-300 tracking-wider uppercase">
                <Lock className="w-3 h-3 text-purple-400" />
                COMING SOON
              </span>
              <span className="text-[11px] font-bold text-slate-400">4-Player</span>
            </div>

            {/* Center Emblem: Crimson & Amethyst Medallion with Dhaalu (ދި) */}
            <div className="relative my-auto flex flex-col items-center z-10">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-[#581c87] via-[#2e1065] to-[#02140D] border-2 border-[#E5C378]/80 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.3)] mb-2 relative group-hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 rounded-xl border border-purple-400/50 flex flex-col items-center justify-center bg-[#170524]/90">
                  <span className="font-thaana text-3xl sm:text-4xl font-black text-[#E5C378] drop-shadow-[0_2px_8px_rgba(229,195,120,0.6)]">
                    ދި
                  </span>
                  <span className="font-sans-clean text-[9px] font-black text-purple-300 tracking-wider -mt-1">
                    10s TRICK
                  </span>
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                DHIHAEH
                <span className="font-thaana text-2xl text-[#E5C378]">ދިހައެއް</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed text-center">
                10s counting & trick collection. Secure high-value cards and execute clean sweeps.
              </p>
            </div>

            <div className="z-10 flex flex-col gap-1.5">
              <button className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer">
                <span>Preview Rules & Teaser</span>
              </button>
              <div className="text-[10px] font-bold text-purple-400/70 text-center">
                Rules Drafting & In Development
              </div>
            </div>
          </motion.div>

          {/* Card 3: BONDI (ބޮނޑި) - COMING SOON */}
          <motion.div
            whileHover={{ y: -4 }}
            onClick={() =>
              setTeaserGame({
                title: 'Bondi',
                thaana: 'ބޮނޑި',
                desc: 'Strategic Maldivian card clustering and bundle management. Players build powerful card combinations and bluff their hand strength to force table folds.',
                phase: 'Rules Drafting & Concept Phase',
              })
            }
            className="relative h-[320px] sm:h-[360px] rounded-3xl bg-gradient-to-b from-[#0a1b2e] via-[#0a1410] to-[#010A06] border-2 border-blue-900/60 p-5 flex flex-col justify-between shadow-lg cursor-pointer overflow-hidden group opacity-90 hover:opacity-100 hover:border-blue-400 transition"
          >
            <div className="absolute inset-0 bg-radial from-blue-900/10 via-transparent to-black/60 pointer-events-none" />

            <div className="flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-700/60 text-[10px] font-bold text-blue-300 tracking-wider uppercase">
                <Lock className="w-3 h-3 text-blue-400" />
                COMING SOON
              </span>
              <span className="text-[11px] font-bold text-slate-400">2-6 Players</span>
            </div>

            {/* Center Emblem: Sapphire & Cyan Medallion with Baa (ބ) */}
            <div className="relative my-auto flex flex-col items-center z-10">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#0c2e4e] to-[#02140D] border-2 border-[#E5C378]/80 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.3)] mb-2 relative group-hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 rounded-xl border border-cyan-400/50 flex flex-col items-center justify-center bg-[#07192b]/90">
                  <span className="font-thaana text-3xl sm:text-4xl font-black text-[#E5C378] drop-shadow-[0_2px_8px_rgba(229,195,120,0.6)]">
                    ބ
                  </span>
                  <span className="font-sans-clean text-[9px] font-black text-cyan-300 tracking-wider -mt-1">
                    CLUSTER
                  </span>
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                BONDI
                <span className="font-thaana text-2xl text-[#E5C378]">ބޮނޑި</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed text-center">
                Strategic card clustering. Form secret bundles and dominate the table with tactical plays.
              </p>
            </div>

            <div className="z-10 flex flex-col gap-1.5">
              <button className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer">
                <span>Preview Rules & Teaser</span>
              </button>
              <div className="text-[10px] font-bold text-blue-400/70 text-center">
                Rules Drafting & In Development
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="flex items-center justify-between w-full pt-3 border-t border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDailyBonus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-[#05D59A] text-slate-200 text-xs font-bold transition shadow cursor-pointer"
          >
            <Gift className="w-4 h-4 text-[#E5C378]" />
            <span>Daily Free Bonus</span>
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>Game Guide</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-[#05D59A]" />
          <span>Maldives Central (14ms)</span>
          <span className="w-2 h-2 rounded-full bg-[#05D59A]" />
        </div>
      </footer>

      {/* Teaser Rules Modal */}
      <AnimatePresence>
        {teaserGame && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-b from-[#031B11] to-[#02140D] border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full text-slate-100 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setTeaserGame(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎴</span>
                <div>
                  <h3 className="text-lg font-black text-white">{teaserGame.title}</h3>
                  <span className="font-thaana text-sm text-[#E5C378]">
                    {teaserGame.thaana}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {teaserGame.desc}
              </p>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-4">
                <div className="text-[10px] font-black text-slate-400 uppercase">
                  Development Status:
                </div>
                <div className="text-xs font-bold text-[#05D59A] mt-0.5">
                  {teaserGame.phase}
                </div>
              </div>

              <button
                onClick={() => setTeaserGame(null)}
                className="w-full py-2.5 rounded-xl bg-[#05D59A] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
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
