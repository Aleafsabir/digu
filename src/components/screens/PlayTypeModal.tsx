import React from 'react';
import { motion } from 'framer-motion';
import { TableRules, PlayType } from '../../core/models/types';
import { Bot, Globe, ChevronLeft, Shield, Users, User } from 'lucide-react';
import { JuicyButton } from '../shared/JuicyButton';

interface PlayTypeModalProps {
  mode: TableRules['mode'];
  onSelectPlayType: (playType: PlayType) => void;
  onBack: () => void;
}

export const PlayTypeModal: React.FC<PlayTypeModalProps> = ({
  mode,
  onSelectPlayType,
  onBack,
}) => {
  const getModeInfo = () => {
    switch (mode) {
      case 'TEAM_4P':
        return {
          title: '4-Player Team Mode (2v2)',
          icon: <Shield className="w-4 h-4 text-slate-300" />,
        };
      case 'SOLO_4P':
        return {
          title: '4-Player Cutthroat (Solo)',
          icon: <Users className="w-4 h-4 text-cyan-300" />,
        };
      case 'SOLO_2P':
        return {
          title: '2-Player Head-to-Head',
          icon: <User className="w-4 h-4 text-[#05D59A]" />,
        };
      default:
        return {
          title: 'Holhuashi: Digu',
          icon: <Shield className="w-4 h-4 text-[#05D59A]" />,
        };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto font-sans-clean">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-xl w-full text-slate-100 relative my-auto max-h-[95dvh] flex flex-col justify-between border-2 border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5 mb-3.5 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            {modeInfo.icon}
            <h3 className="font-black text-xs sm:text-sm text-white uppercase tracking-wider">
              {modeInfo.title}
            </h3>
          </div>
          <div className="w-16" />
        </div>

        {/* 2 Choice Cards: VS AI vs Online */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-auto">
          {/* Option 1: VS AI */}
          <div
            onClick={() => onSelectPlayType('VS_AI')}
            className="group relative rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#063824] via-[#031B11] to-[#010D08] border-2 border-[#05D59A] shadow-[0_0_25px_rgba(5,213,154,0.3)] hover:scale-[1.02] cursor-pointer transition active:scale-[0.98] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#05D59A] text-slate-950 shadow-[0_0_10px_rgba(5,213,154,0.4)]">
                RECOMMENDED
              </span>
              <span className="text-[9px] font-bold text-[#05D59A]">INSTANT</span>
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#05D59A] to-[#047857] text-slate-950 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform font-black">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-xs sm:text-sm text-white leading-tight">
                  Play VS AI
                </span>
                <span className="text-[10px] text-slate-300 font-semibold">
                  Autonomous Bots
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 my-3">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300">
                ⚡ Instant
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300">
                🤖 3 AI Bots
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300">
                📴 Offline
              </span>
            </div>

            <JuicyButton
              variant="emerald"
              size="md"
              onClick={e => {
                e.stopPropagation();
                onSelectPlayType('VS_AI');
              }}
              className="w-full mt-1"
            >
              Play VS AI
            </JuicyButton>
          </div>

          {/* Option 2: Online Multiplayer */}
          <div
            onClick={() => onSelectPlayType('ONLINE')}
            className="group relative rounded-2xl p-4 sm:p-5 bg-[#031710] border border-slate-800 shadow-xl hover:scale-[1.02] cursor-pointer transition active:scale-[0.98] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shadow">
                MULTIPLAYER
              </span>
              <span className="text-[9px] font-bold text-cyan-300">ONLINE</span>
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-[#05D59A] flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-xs sm:text-sm text-white leading-tight">
                  Play Online
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Matchmaking & Rooms
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 my-3">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300">
                🌐 Matchmaking
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300">
                🔑 Room Code
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300">
                👥 2–4 Players
              </span>
            </div>

            <button
              onClick={e => {
                e.stopPropagation();
                onSelectPlayType('ONLINE');
              }}
              className="btn-3d-dark w-full mt-1 py-2.5 rounded-2xl text-xs uppercase tracking-wider cursor-pointer font-black"
            >
              Play Online
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
