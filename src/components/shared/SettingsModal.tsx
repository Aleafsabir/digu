import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { THEME_CONFIGS } from '../../theme/themeConfig';
import { DECK_DESIGNS } from '../../config/deckConfig';
import { AVATAR_PRESETS } from '../../types/auth';
import {
  Settings as SettingsIcon,
  X,
  Palette,
  Volume2,
  VolumeX,
  Smartphone,
  UserCheck,
  Cloud,
  RefreshCw,
  Edit2,
  Layers,
  Check,
  Server,
  RotateCcw,
  Wifi,
} from 'lucide-react';
import {
  getBackendBaseUrl,
  setBackendBaseUrl,
  resetBackendBaseUrl,
  isNativeMobile,
} from '../../config/networkConfig';
import { SocialService } from '../../services/socialService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appearance' | 'system' | 'account';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance',
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'system' | 'account'>(initialTab);

  const {
    visualTheme,
    setVisualTheme,
    activeDeck,
    setActiveDeck,
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    setHapticsEnabled,
  } = useGameStore();

  const {
    profile,
    loginWithGoogle,
    syncWithCloud,
    isSyncing,
    setProfileModalOpen,
    setAuthModalOpen,
  } = useAuthStore();

  const [serverUrlInput, setServerUrlInput] = useState<string>(() => getBackendBaseUrl());
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [serverSavedMsg, setServerSavedMsg] = useState<string | null>(null);

  const handleTestConnection = async (targetUrl?: string) => {
    const url = (targetUrl ?? serverUrlInput).trim().replace(/\/+$/, '');
    setPingStatus('testing');
    setPingLatency(null);
    const start = performance.now();
    try {
      const res = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const end = performance.now();
      if (res.ok) {
        setPingStatus('online');
        setPingLatency(Math.round(end - start));
      } else {
        setPingStatus('offline');
      }
    } catch {
      setPingStatus('offline');
    }
  };

  const handleSaveServer = () => {
    const clean = serverUrlInput.trim().replace(/\/+$/, '');
    setBackendBaseUrl(clean);
    setServerSavedMsg('Saved & Connected');
    setTimeout(() => setServerSavedMsg(null), 3000);
    if (profile?.id) {
      SocialService.connectWebSocket(
        profile.id,
        profile.displayName,
        profile.avatarId,
        profile.friendCode,
        profile.level
      );
    }
    handleTestConnection(clean);
  };

  const handleResetServer = () => {
    resetBackendBaseUrl();
    const defaultUrl = getBackendBaseUrl();
    setServerUrlInput(defaultUrl);
    setServerSavedMsg('Reset to Default');
    setTimeout(() => setServerSavedMsg(null), 3000);
    if (profile?.id) {
      SocialService.connectWebSocket(
        profile.id,
        profile.displayName,
        profile.avatarId,
        profile.friendCode,
        profile.level
      );
    }
    handleTestConnection(defaultUrl);
  };

  if (!isOpen) return null;

  const currentTheme = THEME_CONFIGS[visualTheme || 'tournoi'];
  const currentAvatar =
    AVATAR_PRESETS.find(a => a.id === profile.avatarId) || AVATAR_PRESETS[0];

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto font-sans-clean"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-gradient-to-b from-[#02140D] via-[#031B11] to-[#010D08] border-2 border-slate-700 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-lg sm:max-w-xl w-full my-auto max-h-[92dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-emerald-950 pb-2.5 mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg btn-3d-platinum text-slate-950 flex items-center justify-center shadow">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm sm:text-base text-slate-100 uppercase tracking-wider">
                Settings
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#010D08] border border-slate-800/80 mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'appearance'
                  ? 'btn-3d-platinum text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'system'
                  ? 'btn-3d-platinum text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>System</span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'account'
                  ? 'btn-3d-platinum text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Account</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain pr-0.5 sm:pr-1 space-y-3">
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-3">
                {/* Deck Artwork Section */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" /> Deck Back Artwork
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                      {DECK_DESIGNS[activeDeck || 'burgundy_gold'].name}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {(['burgundy_gold', 'sapphire_lattice', 'maldivian_lacquer'] as const).map(dKey => {
                      const dCfg = DECK_DESIGNS[dKey];
                      const isSelected = (activeDeck || 'burgundy_gold') === dKey;
                      return (
                        <button
                          key={dKey}
                          onClick={() => setActiveDeck(dKey)}
                          className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                            isSelected
                              ? 'bg-slate-200 text-stone-950 border-white font-black shadow-md'
                              : 'bg-[#010D08] hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black">{dCfg.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 font-bold">
                              {dCfg.badge}
                            </span>
                          </div>
                          <p className="text-[10px] opacity-75 line-clamp-2">{dCfg.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Table Theme Section */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-emerald-400" /> Table Atmosphere & Visual Theme
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                      {currentTheme.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {(['tournoi', 'sultan', 'holhuashi', 'risograph', 'nocturne', 'swiss'] as const).map(tKey => {
                      const t = THEME_CONFIGS[tKey];
                      const isSelected = (visualTheme || 'tournoi') === tKey;
                      return (
                        <button
                          key={tKey}
                          onClick={() => setVisualTheme(tKey)}
                          className={`p-2 sm:p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-slate-200 text-stone-950 border-white font-black shadow-md'
                              : 'bg-[#010D08] hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                        >
                          <div className="text-xs font-black leading-tight flex items-center justify-between">
                            <span className="truncate">{t.name}</span>
                            <span className="text-[8px] opacity-75 shrink-0 ml-1">{t.badge}</span>
                          </div>
                          <div className="text-[9.5px] opacity-75 truncate mt-1">{t.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SYSTEM TAB */}
            {activeTab === 'system' && (
              <div className="space-y-2.5 text-xs">
                {/* Sound Effects Toggle */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#010D08] border border-slate-800 flex items-center justify-center text-emerald-400">
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100">Sound Effects</div>
                      <div className="text-[10px] text-slate-400">Synthesized card snaps & riffle shuffle audio</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      soundEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Haptic Feedback Toggle */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#010D08] border border-slate-800 flex items-center justify-center text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100">Haptics & Vibration</div>
                      <div className="text-[10px] text-slate-400">Tactile physical clicks on card actions and wins</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setHapticsEnabled(!hapticsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hapticsEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Server & Cloud Multiplayer Connection */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#010D08] border border-slate-800 flex items-center justify-center text-emerald-400">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Server & Multiplayer Endpoint</span>
                          {pingStatus === 'online' && (
                            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {pingLatency ? `${pingLatency}ms` : 'Online'}
                            </span>
                          )}
                          {pingStatus === 'offline' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono">
                              Offline
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isNativeMobile() ? 'Native Android Shell' : 'Web Browser Client'} • Real-Time Sync
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestConnection()}
                      disabled={pingStatus === 'testing'}
                      className="px-2.5 py-1 rounded-xl bg-[#010D08] hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                    >
                      <Wifi className={`w-3 h-3 ${pingStatus === 'testing' ? 'animate-pulse text-amber-400' : 'text-emerald-400'}`} />
                      <span>{pingStatus === 'testing' ? 'Pinging...' : 'Test Ping'}</span>
                    </button>
                  </div>

                  {/* URL Input and Action Row */}
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={serverUrlInput}
                        onChange={e => setServerUrlInput(e.target.value)}
                        placeholder="https://your-server.com or http://192.168.1.x:8080"
                        className="flex-1 bg-[#010D08] border border-slate-800 focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-200 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={handleSaveServer}
                        className="btn-3d-platinum px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-950 cursor-pointer shadow hover:brightness-105 active:scale-95 transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleResetServer}
                        title="Reset to default server"
                        className="p-1.5 rounded-xl bg-[#010D08] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {serverSavedMsg && (
                      <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{serverSavedMsg}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* App & Device Info Card */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Application Information
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#010D08] p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Platform</span>
                      <span className="text-amber-300 font-mono font-bold">Thaasbai v0.1.0</span>
                    </div>
                    <div className="bg-[#010D08] p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Orientation</span>
                      <span className="text-emerald-400 font-bold">Landscape Lock</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="space-y-3 text-xs">
                {/* Current Profile Card */}
                <div className="p-3 rounded-2xl bg-[#02140D] border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentAvatar.gradient} border border-slate-600 flex items-center justify-center text-2xl shadow`}
                    >
                      {currentAvatar.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{profile.displayName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono btn-3d-platinum text-slate-950">
                          LVL {profile.level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {currentAvatar.title} • {profile.loginProvider} Account
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      setProfileModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Google Connection & Cloud Backup Card */}
                <div className="p-3.5 rounded-2xl bg-[#02140D] border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center border border-slate-700">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>Google & Cloud Backup</span>
                          {profile.loginProvider === 'GOOGLE' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {profile.loginProvider === 'GOOGLE'
                            ? `Connected with Google (${profile.email || 'Verified Account'})`
                            : 'Guest Account (Local Only) — Link Google to save progress'}
                        </div>
                      </div>
                    </div>

                    {profile.cloudSyncStatus === 'SYNCED' ? (
                      <button
                        onClick={() => syncWithCloud()}
                        disabled={isSyncing}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300">
                        Local Only
                      </span>
                    )}
                  </div>

                  {profile.loginProvider === 'GUEST' ? (
                    <button
                      onClick={async () => {
                        await loginWithGoogle();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Google Account Protected</span>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          setAuthModalOpen(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-[#010D08] hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        Switch Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-emerald-950/60 pt-2.5 mt-2.5 flex justify-end">
            <button
              onClick={onClose}
              className="btn-3d-platinum px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-black cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
