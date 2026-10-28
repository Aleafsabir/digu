import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocialStore } from '../../store/useSocialStore';
import { TableRules, PlayType } from '@game/core';
import { DhihaehVariant } from '../../core/dhihaeh/dhihaehTypes';
import { BondiVariant } from '../../core/bondi/bondiTypes';
import {
  Users,
  Settings,
  Gift,
  LogOut,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Bot,
  Globe,
  Key,
  X,
  Sparkles,
} from 'lucide-react';
import { AVATAR_PRESETS, AvatarPreset } from '../../types/auth';
import { LogoutConfirmationModal } from '../shared/LogoutConfirmationModal';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { playCardFlickSound } from '../../utils/audioEffects';

interface MainLobbyScreenProps {
  onStartDiguMatch?: (mode: TableRules['mode'], playType: PlayType) => void;
  onStartDhihaehMatch?: (variant: DhihaehVariant, targetScore: number) => void;
  onStartBondiMatch?: (variant: BondiVariant, playerCount: number) => void;
  onOpenPrivateTable?: (game: 'DIGU' | 'DHIHAEH' | 'BONDI') => void;
  onSelectGame?: (game: 'DIGU' | 'DHIHAEH' | 'BONDI') => void;
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
  onStartDiguMatch,
  onStartDhihaehMatch,
  onStartBondiMatch,
  onOpenPrivateTable,
  onSelectGame,
  onOpenSettings,
  onOpenRules,
  onSwitchAccount,
}) => {
  const { profile, claimDailyBonus, setProfileModalOpen } = useAuthStore();
  const { setFriendsModalOpen, friends } = useSocialStore();

  // Active Game Carousel State
  const [activeGameIdx, setActiveGameIdx] = useState<number>(() => {
    const saved = localStorage.getItem('holhuashi_last_game');
    if (saved === 'DHIHAEH') return 1;
    if (saved === 'BONDI') return 2;
    return 0; // Default: Digu
  });

  // Game-Specific Configurations (Persisted)
  const [diguMode, setDiguMode] = useState<TableRules['mode']>(() => {
    return (localStorage.getItem('holhuashi_digu_mode') as TableRules['mode']) || 'TEAM_4P';
  });
  const [dhihaehVariant, setDhihaehVariant] = useState<DhihaehVariant>(() => {
    return (localStorage.getItem('holhuashi_dhihaeh_variant') as DhihaehVariant) || 'DYNAMIC_CUT';
  });
  const [dhihaehTarget, setDhihaehTarget] = useState<number>(7);

  const [bondiVariant, setBondiVariant] = useState<BondiVariant>(() => {
    return (localStorage.getItem('holhuashi_bondi_variant') as BondiVariant) || 'SUIT_BONDI';
  });
  const [bondiPlayers, setBondiPlayers] = useState<number>(() => {
    const p = parseInt(localStorage.getItem('holhuashi_bondi_players') || '4', 10);
    return isNaN(p) ? 4 : p;
  });

  // Opponent Type (VS AI vs Online Multiplayer)
  const [opponentType, setOpponentType] = useState<PlayType>(() => {
    return (localStorage.getItem('holhuashi_opponent_type') as PlayType) || 'VS_AI';
  });

  // Bottom Sheet Drawer Visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dailyBonusClaimedMsg, setDailyBonusClaimedMsg] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // Carousel Games Metadata
  const gamesList = [
    {
      id: 'DIGU' as const,
      title: 'DIGU',
      thaana: 'ޑިގު',
      tag: 'ROYAL RUMMY',
      thaanaLetter: 'ޑ',
      desc: 'Authentic 1000-point runs, Ace-restricted melds, and 20-card backtracking partnerships. The crown jewel of Maldivian card games.',
      players: '4 Players (2v2)',
      duration: '~6 mins',
      activeTables: '860 Tables',
      accentColor: '#c84b31',
      ringColor: '#e5c378',
    },
    {
      id: 'DHIHAEH' as const,
      title: 'DHIHAEH',
      thaana: 'ދިހައެއް',
      tag: 'TRICK TAKING',
      thaanaLetter: 'ދ',
      desc: 'Dynamic cut trump declarations, hunting the four objective 10-cards, and achieving the elusive 1,000-point Haasbagga sweep.',
      players: '4 Players (2v2)',
      duration: '~8 mins',
      activeTables: '410 Tables',
      accentColor: '#0284c7',
      ringColor: '#38bdf8',
    },
    {
      id: 'BONDI' as const,
      title: 'BONDI',
      thaana: 'ބޮނޑި',
      tag: 'CUTTHROAT SHEDDING',
      thaanaLetter: 'ބ',
      desc: 'Card shedding with brutal penalties. Ace of Spades leads, mass suit dump on void turns, and last player standing is The Bondi.',
      players: '2 to 6 Players',
      duration: '~5 mins',
      activeTables: '280 Tables',
      accentColor: '#059669',
      ringColor: '#34d399',
    },
  ];

  const currentGame = gamesList[activeGameIdx];

  const cyclePrev = () => {
    const nextIdx = (activeGameIdx - 1 + gamesList.length) % gamesList.length;
    setActiveGameIdx(nextIdx);
    localStorage.setItem('holhuashi_last_game', gamesList[nextIdx].id);
    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    playCardFlickSound();
  };

  const cycleNext = () => {
    const nextIdx = (activeGameIdx + 1) % gamesList.length;
    setActiveGameIdx(nextIdx);
    localStorage.setItem('holhuashi_last_game', gamesList[nextIdx].id);
    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    playCardFlickSound();
  };

  // 1-Tap Play Now Execution
  const handle1TapPlayNow = () => {
    if (currentGame.id === 'DIGU') {
      if (onStartDiguMatch) {
        onStartDiguMatch(diguMode, opponentType);
      } else if (onSelectGame) {
        onSelectGame('DIGU');
      }
    } else if (currentGame.id === 'DHIHAEH') {
      if (onStartDhihaehMatch) {
        onStartDhihaehMatch(dhihaehVariant, dhihaehTarget);
      } else if (onSelectGame) {
        onSelectGame('DHIHAEH');
      }
    } else if (currentGame.id === 'BONDI') {
      if (onStartBondiMatch) {
        onStartBondiMatch(bondiVariant, bondiPlayers);
      } else if (onSelectGame) {
        onSelectGame('BONDI');
      }
    }
  };

  // Mode Capsule Label Construction
  const getCapsuleLabel = () => {
    if (currentGame.id === 'DIGU') {
      const modeLabel =
        diguMode === 'TEAM_4P'
          ? '2v2 Partnership'
          : diguMode === 'SOLO_4P'
          ? '4P Cutthroat'
          : '1v1 Duel';
      return {
        icon: diguMode === 'TEAM_4P' ? '👥' : diguMode === 'SOLO_4P' ? '⚔️' : '⚡',
        title: modeLabel,
        opp: opponentType === 'VS_AI' ? 'VS AI' : 'Live P2P',
      };
    } else if (currentGame.id === 'DHIHAEH') {
      return {
        icon: '✂️',
        title: dhihaehVariant === 'DYNAMIC_CUT' ? 'Dynamic Cut' : 'Hidden Reserve',
        opp: `${dhihaehTarget} Pts`,
      };
    } else {
      return {
        icon: '🎴',
        title: `${bondiPlayers}P • ${bondiVariant === 'SUIT_BONDI' ? 'Suit Dump' : 'Single Card'}`,
        opp: 'Shedding',
      };
    }
  };

  const capsuleInfo = getCapsuleLabel();

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-radial from-[#24110d] via-[#170b09] to-[#080202] p-2 sm:p-4 select-none overflow-hidden font-sans-clean text-[#f7f0ea]">
      {/* Background Vector Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0e09] via-[#120604] to-[#080202] pointer-events-none opacity-90">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5c378_1px,transparent_1px)] [background-size:24px_24px]" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] rounded-full blur-3xl pointer-events-none transition-colors duration-700"
          style={{ backgroundColor: `${currentGame.accentColor}25` }}
        />
      </div>

      {/* TOP HEADER BAR */}
      <header
        className="relative z-30 flex items-center justify-between w-full pb-2 border-b border-[#301a14]/70 shrink-0"
        style={{
          paddingTop: 'max(6px, env(safe-area-inset-top))',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {/* Left: Profile Pill */}
        <div
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2 bg-[#170b09]/90 border border-[#301a14] px-2 py-1 rounded-full cursor-pointer hover:border-[#e5c378] transition shadow-md group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c84b31] to-[#8f2d1b] flex items-center justify-center font-black text-xs text-white border border-[#e5c378]/60 shadow group-hover:scale-105 transition-transform">
            {currentAvatar.icon || profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col text-left pr-1.5">
            <span className="text-xs font-black text-[#f7f0ea] flex items-center gap-1 leading-tight font-serif-luxury">
              {profile.displayName}
              <small className="text-[10px] text-[#e5c378]/70">▼</small>
            </span>
            <span className="text-[9px] font-black text-[#e5c378] tracking-wider font-mono">
              LVL {profile.level} • {profile.loginProvider.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Holhuashi Brand Title */}
        <div className="hidden sm:flex items-center gap-2.5 bg-[#170b09]/90 border border-[#301a14] px-3.5 py-1 rounded-2xl shadow">
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

        {/* Right: Wallets & Auxiliary Icons */}
        <div className="flex items-center gap-2">
          {/* Gold Coin Wallet */}
          <div className="flex items-center gap-1.5 bg-[#0d0605] border border-[#301a14] px-2.5 py-1 rounded-full text-xs font-black text-[#e5c378] shadow">
            <RanDhadhuCoinIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{profile.coins.toLocaleString()}</span>
          </div>

          {/* Gem Wallet */}
          <div className="flex items-center gap-1.5 bg-[#0d0605] border border-[#301a14] px-2.5 py-1 rounded-full text-xs font-black text-[#c84b31] shadow">
            <LagoonGemIcon className="w-3.5 h-3.5" />
            <span className="font-mono text-xs text-[#c84b31]">180</span>
          </div>

          {/* Daily Bonus Claim Button */}
          <button
            onClick={handleDailyBonus}
            className="w-8 h-8 rounded-xl bg-[#170b09] border border-[#301a14] text-[#e5c378] hover:border-[#e5c378] flex items-center justify-center cursor-pointer transition shadow"
            title="Claim Daily Bonus"
          >
            <Gift className="w-4 h-4" />
          </button>

          {/* Social Friends */}
          <button
            onClick={() => setFriendsModalOpen(true)}
            className="w-8 h-8 rounded-xl bg-[#170b09] border border-[#301a14] text-[#f7f0ea]/80 hover:text-white hover:border-[#e5c378] flex items-center justify-center relative cursor-pointer transition shadow"
            title="Friends & Social"
          >
            <Users className="w-4 h-4" />
            {onlineFriendsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10b981]" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-xl bg-[#170b09] border border-[#301a14] text-[#f7f0ea]/80 hover:text-white hover:border-[#e5c378] flex items-center justify-center cursor-pointer transition shadow"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Sign Out */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-8 h-8 rounded-xl bg-[#170b09] border border-[#301a14] text-[#f7f0ea]/80 hover:text-white hover:border-[#c84b31] flex items-center justify-center cursor-pointer transition shadow"
            title="Switch Account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Daily Bonus Toast */}
      {dailyBonusClaimedMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-[#24110d] border border-[#e5c378] text-[#e5c378] px-4 py-1.5 rounded-full text-xs font-black shadow-lg"
        >
          {dailyBonusClaimedMsg}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 1: HERO GAME SHOWCASE CAROUSEL (Center Stage)                      */}
      {/* ========================================================================= */}
      <main className="relative z-20 flex-1 flex items-center justify-between gap-3 max-w-5xl mx-auto w-full my-auto py-1">
        {/* Left Arrow */}
        <button
          onClick={cyclePrev}
          className="w-9 h-14 sm:w-11 sm:h-16 rounded-2xl bg-[#170b09]/80 border border-[#301a14] hover:border-[#e5c378] text-white flex items-center justify-center text-lg shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
          title="Previous Game"
        >
          <ChevronLeft className="w-6 h-6 text-[#e5c378]" />
        </button>

        {/* Center Hero Card with Horizontal Swipe/Drag Gesture Support */}
        <motion.div
          key={currentGame.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_e, info) => {
            const swipeThreshold = 40;
            const velocityThreshold = 300;
            if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
              cycleNext();
            } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
              cyclePrev();
            }
          }}
          className="flex-1 flex flex-col md:flex-row items-center justify-center gap-5 sm:gap-8 px-2 max-w-3xl cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {/* Medallion & Artwork */}
          <div className="relative flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsDrawerOpen(true)}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl p-3 shadow-2xl flex flex-col items-center justify-center relative group cursor-pointer border-2"
              style={{
                borderColor: currentGame.ringColor,
                background: `linear-gradient(135deg, ${currentGame.accentColor}dd 0%, #0d0605 100%)`,
                boxShadow: `0 12px 35px rgba(0,0,0,0.8), 0 0 25px ${currentGame.accentColor}40`,
              }}
            >
              <span
                className="font-thaana text-5xl sm:text-6xl font-black drop-shadow-md"
                style={{ color: currentGame.ringColor }}
              >
                {currentGame.thaanaLetter}
              </span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/90 uppercase mt-0.5">
                {currentGame.tag}
              </span>
              <div className="absolute -top-2 -right-2 bg-[#e5c378] text-[#0a0403] text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow">
                LIVE
              </div>
            </motion.div>

            {/* Carousel Dots & Swipe Hint */}
            <div className="flex items-center gap-1.5 mt-2.5">
              {gamesList.map((g, idx) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGameIdx(idx);
                    localStorage.setItem('holhuashi_last_game', g.id);
                  }}
                  className={`transition-all rounded-full cursor-pointer ${
                    idx === activeGameIdx
                      ? 'w-4 h-1.5 bg-[#e5c378]'
                      : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <div className="text-[9px] font-mono text-white/40 tracking-wider uppercase mt-1 hidden sm:block">
              Swipe ↔ or arrows
            </div>
          </div>

          {/* Narrative & Metrics */}
          <div className="flex flex-col text-center md:text-left max-w-md pointer-events-none sm:pointer-events-auto">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <h1 className="font-serif-luxury font-black text-2xl sm:text-3xl text-white tracking-wide">
                {currentGame.title}
              </h1>
              <span
                className="font-thaana text-2xl font-black"
                style={{ color: currentGame.ringColor }}
              >
                {currentGame.thaana}
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-relaxed">
              {currentGame.desc}
            </p>

            {/* Fast Metric Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2.5">
              <div className="bg-[#140806] border border-[#301a14] px-2.5 py-0.5 rounded-lg text-[10px] font-mono text-[#e5c378] flex items-center gap-1">
                <span>👥</span> <span>{currentGame.players}</span>
              </div>
              <div className="bg-[#140806] border border-[#301a14] px-2.5 py-0.5 rounded-lg text-[10px] font-mono text-white/70 flex items-center gap-1">
                <span>⏱️</span> <span>{currentGame.duration}</span>
              </div>
              <div className="bg-[#140806] border border-[#301a14] px-2.5 py-0.5 rounded-lg text-[10px] font-mono text-[#10b981] flex items-center gap-1">
                <span>🟢</span> <span>{currentGame.activeTables}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Arrow */}
        <button
          onClick={cycleNext}
          className="w-9 h-14 sm:w-11 sm:h-16 rounded-2xl bg-[#170b09]/80 border border-[#301a14] hover:border-[#e5c378] text-white flex items-center justify-center text-lg shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
          title="Next Game"
        >
          <ChevronRight className="w-6 h-6 text-[#e5c378]" />
        </button>
      </main>

      {/* ========================================================================= */}
      {/* BOTTOM THUMB-ZONE BAR (1-Tap PLAY NOW & Attached Capsule)                 */}
      {/* ========================================================================= */}
      <footer
        className="relative z-30 flex items-center justify-between gap-3 max-w-5xl mx-auto w-full pt-2 border-t border-[#301a14]/60 shrink-0"
        style={{
          paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {/* Left Auxiliary Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onOpenRules()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#140806] border border-[#301a14] hover:border-[#e5c378]/50 text-white/80 hover:text-white text-xs font-bold transition cursor-pointer shadow"
          >
            <HelpCircle className="w-4 h-4 text-[#e5c378]" />
            <span className="font-serif-luxury text-[11px] hidden sm:inline">Rules</span>
          </button>

          <button
            onClick={() => {
              if (onOpenPrivateTable) {
                onOpenPrivateTable(currentGame.id);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#140806] border border-[#301a14] hover:border-[#a855f7]/50 text-white/80 hover:text-white text-xs font-bold transition cursor-pointer shadow"
          >
            <Key className="w-4 h-4 text-[#c084fc]" />
            <span className="font-serif-luxury text-[11px] hidden sm:inline">Private</span>
          </button>
        </div>

        {/* Right Thumb Zone: Mode Capsule + Big 1-Tap PLAY NOW CTA */}
        <div className="flex items-center gap-2">
          {/* Interactive Mode Capsule (Opens In-Place Drawer) */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col text-left px-3.5 py-1.5 rounded-2xl bg-[#170b09] border border-[#e5c378]/60 hover:border-[#e5c378] text-white shadow-lg cursor-pointer transition-all hover:bg-[#20100d] group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-[#e5c378] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <span>FORMAT</span>
                <span className="text-[8px] bg-[#e5c378]/20 px-1 py-0.2 rounded text-[#e5c378]">
                  CHANGE ▾
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm">{capsuleInfo.icon}</span>
              <span className="font-serif-luxury font-black text-xs sm:text-sm text-white">
                {capsuleInfo.title}
              </span>
              <span className="text-[10px] text-[#10b981] font-mono font-bold">
                • {capsuleInfo.opp}
              </span>
            </div>
          </button>

          {/* Primary 1-Tap PLAY NOW Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handle1TapPlayNow}
            className="px-6 sm:px-9 py-3 rounded-2xl bg-gradient-to-r from-[#c84b31] via-[#d65a31] to-[#c84b31] text-white font-serif-luxury font-black text-sm sm:text-base tracking-wider shadow-[0_0_25px_rgba(200,75,49,0.5)] border border-[#fca5a5]/40 flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>PLAY NOW</span>
          </motion.button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* IN-PLACE MODE CONFIGURATION BOTTOM DRAWER (No screen hops!)              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Bottom Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-3xl bg-[#140806] border-t-2 border-[#e5c378] rounded-t-3xl p-4 sm:p-6 shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar"
              style={{
                boxShadow: '0 -15px 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(229,195,120,0.3)',
              }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#301a14]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black uppercase text-[#e5c378] tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>CONFIGURE {currentGame.title} FORMAT</span>
                  </span>
                  <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] px-2 py-0.5 rounded font-mono font-bold">
                    0 Extra Screens
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-7 h-7 rounded-full bg-[#1c0c09] text-white/70 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Format Options Grid */}
              <div className="py-4">
                {/* DIGU MODES */}
                {currentGame.id === 'DIGU' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 2v2 Partnership */}
                    <div
                      onClick={() => {
                        setDiguMode('TEAM_4P');
                        localStorage.setItem('holhuashi_digu_mode', 'TEAM_4P');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        diguMode === 'TEAM_4P'
                          ? 'bg-[#260e0a] border-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.3)] ring-1 ring-[#e5c378]'
                          : 'bg-[#170b09] border-[#301a14] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">👥</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e5c378] text-[#0a0403]">
                          RECOMMENDED
                        </span>
                      </div>
                      <div className="font-serif-luxury font-black text-sm text-white mt-1.5">
                        2v2 Partnership
                      </div>
                      <div className="text-[10px] text-white/60 mt-0.5">
                        Cooperative melds with teammate. Rush to 1000 pts.
                      </div>
                    </div>

                    {/* 4P Cutthroat */}
                    <div
                      onClick={() => {
                        setDiguMode('SOLO_4P');
                        localStorage.setItem('holhuashi_digu_mode', 'SOLO_4P');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        diguMode === 'SOLO_4P'
                          ? 'bg-[#260e0a] border-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.3)] ring-1 ring-[#e5c378]'
                          : 'bg-[#170b09] border-[#301a14] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">⚔️</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-white/60">
                          SOLO
                        </span>
                      </div>
                      <div className="font-serif-luxury font-black text-sm text-white mt-1.5">
                        4P Cutthroat
                      </div>
                      <div className="text-[10px] text-white/60 mt-0.5">
                        Every player for themselves. Defend your deadwood.
                      </div>
                    </div>

                    {/* 1v1 Duel */}
                    <div
                      onClick={() => {
                        setDiguMode('SOLO_2P');
                        localStorage.setItem('holhuashi_digu_mode', 'SOLO_2P');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        diguMode === 'SOLO_2P'
                          ? 'bg-[#260e0a] border-[#e5c378] shadow-[0_0_15px_rgba(229,195,120,0.3)] ring-1 ring-[#e5c378]'
                          : 'bg-[#170b09] border-[#301a14] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">⚡</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-white/60">
                          RAPID
                        </span>
                      </div>
                      <div className="font-serif-luxury font-black text-sm text-white mt-1.5">
                        1v1 Head-to-Head
                      </div>
                      <div className="text-[10px] text-white/60 mt-0.5">
                        Fast 2-player duel. 500 points target score.
                      </div>
                    </div>
                  </div>
                )}

                {/* DHIHAEH MODES */}
                {currentGame.id === 'DHIHAEH' && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Dynamic Cut */}
                      <div
                        onClick={() => {
                          setDhihaehVariant('DYNAMIC_CUT');
                          localStorage.setItem('holhuashi_dhihaeh_variant', 'DYNAMIC_CUT');
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          dhihaehVariant === 'DYNAMIC_CUT'
                            ? 'bg-[#0c2333] border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-1 ring-[#38bdf8]'
                            : 'bg-[#170b09] border-[#301a14] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">✂️</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#38bdf8] text-[#0a0403]">
                            DEFAULT
                          </span>
                        </div>
                        <div className="font-serif-luxury font-black text-sm text-white mt-1.5">
                          Variant A: Dynamic Cut
                        </div>
                        <div className="text-[10px] text-white/60 mt-0.5">
                          Play starts with no trump. First player void in led suit cuts to set Trump.
                        </div>
                      </div>

                      {/* Blind Reserve */}
                      <div
                        onClick={() => {
                          setDhihaehVariant('BLIND_RESERVE');
                          localStorage.setItem('holhuashi_dhihaeh_variant', 'BLIND_RESERVE');
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          dhihaehVariant === 'BLIND_RESERVE'
                            ? 'bg-[#0c2333] border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-1 ring-[#38bdf8]'
                            : 'bg-[#170b09] border-[#301a14] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">🃏</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">
                            BLIND
                          </span>
                        </div>
                        <div className="font-serif-luxury font-black text-sm text-white mt-1.5">
                          Variant B: Hidden Card
                        </div>
                        <div className="text-[10px] text-white/60 mt-0.5">
                          Opening player isolates 1 blind card face-down, revealed on first void.
                        </div>
                      </div>
                    </div>

                    {/* Target Score Toggle */}
                    <div className="flex items-center justify-between bg-[#0a0403] border border-[#301a14] p-2.5 rounded-2xl">
                      <span className="text-xs font-mono text-white/70">Victory Target:</span>
                      <div className="flex items-center gap-1 bg-[#170b09] p-1 rounded-xl border border-[#301a14]">
                        <button
                          onClick={() => setDhihaehTarget(7)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            dhihaehTarget === 7
                              ? 'bg-[#0284c7] text-white shadow'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          7 Points (First to 7)
                        </button>
                        <button
                          onClick={() => setDhihaehTarget(13)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            dhihaehTarget === 13
                              ? 'bg-[#0284c7] text-white shadow'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          13 Points (Grand Match)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* BONDI MODES */}
                {currentGame.id === 'BONDI' && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[4, 3, 5, 2].map((pCount) => (
                        <div
                          key={pCount}
                          onClick={() => {
                            setBondiPlayers(pCount);
                            localStorage.setItem('holhuashi_bondi_players', String(pCount));
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            bondiPlayers === pCount
                              ? 'bg-[#092b1e] border-[#34d399] shadow-[0_0_15px_rgba(52,211,153,0.3)] ring-1 ring-[#34d399]'
                              : 'bg-[#170b09] border-[#301a14] opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base">{pCount === 2 ? '⚔️' : '👥'}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-white/60">
                              {pCount === 4 ? 'POPULAR' : `${pCount}P`}
                            </span>
                          </div>
                          <div className="font-serif-luxury font-black text-sm text-white mt-1.5">
                            {pCount} Players
                          </div>
                          <div className="text-[10px] text-white/60 mt-0.5">
                            {pCount === 4
                              ? '13 cards each'
                              : pCount === 3
                              ? '17-18 cards each'
                              : pCount === 2
                              ? '26 cards duel'
                              : '10-11 cards'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Penalty Variant Toggle */}
                    <div className="flex items-center justify-between bg-[#0a0403] border border-[#301a14] p-2.5 rounded-2xl">
                      <span className="text-xs font-mono text-white/70">Penalty Rule:</span>
                      <div className="flex items-center gap-1 bg-[#170b09] p-1 rounded-xl border border-[#301a14]">
                        <button
                          onClick={() => {
                            setBondiVariant('SUIT_BONDI');
                            localStorage.setItem('holhuashi_bondi_variant', 'SUIT_BONDI');
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            bondiVariant === 'SUIT_BONDI'
                              ? 'bg-[#059669] text-white shadow'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          Suit Bondi (Full-Suit Dump)
                        </button>
                        <button
                          onClick={() => {
                            setBondiVariant('STANDARD');
                            localStorage.setItem('holhuashi_bondi_variant', 'STANDARD');
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            bondiVariant === 'STANDARD'
                              ? 'bg-[#059669] text-white shadow'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          Standard (Single Card)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Opponent Selector & Bottom CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#301a14]/70">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-white/70">Opponent:</span>
                  <div className="flex items-center bg-[#080202] p-1 rounded-xl border border-[#301a14]">
                    <button
                      onClick={() => {
                        setOpponentType('VS_AI');
                        localStorage.setItem('holhuashi_opponent_type', 'VS_AI');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        opponentType === 'VS_AI'
                          ? 'bg-[#c84b31] text-white shadow'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Smart Bots (Offline)</span>
                    </button>
                    <button
                      onClick={() => {
                        setOpponentType('ONLINE');
                        localStorage.setItem('holhuashi_opponent_type', 'ONLINE');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        opponentType === 'ONLINE'
                          ? 'bg-[#c84b31] text-white shadow'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Live P2P Lobby</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handle1TapPlayNow();
                  }}
                  className="px-6 py-2 rounded-xl bg-[#e5c378] hover:bg-[#fde68a] text-[#0a0403] font-serif-luxury font-black text-xs tracking-wider transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-[#0a0403]" />
                  <span>APPLY & PLAY NOW ➔</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirmLogout={() => {
          setShowLogoutConfirm(false);
          onSwitchAccount();
        }}
      />
    </div>
  );
};
