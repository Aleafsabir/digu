import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { DECK_DESIGNS, DeckDesignId } from '../../config/deckConfig';
import {
  X,
  Volume2,
  VolumeX,
  Music,
  Smartphone,
  Layers,
  HelpCircle,
  Target,
  RotateCcw,
  LogOut,
  Play,
} from 'lucide-react';

interface InGameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRules: () => void;
  onOpenScorecard: () => void;
  onRestartMatch: () => void;
  onExitMatch: () => void;
}

const PHYSICAL_DECK_KEYS: DeckDesignId[] = [
  'royal_lacquer',
  'bicycle_red',
  'bicycle_blue',
  'casino_emerald',
];

export const InGameSettingsModal: React.FC<InGameSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenRules,
  onOpenScorecard,
  onRestartMatch,
  onExitMatch,
}) => {
  const { activeDeck, setActiveDeck, setSoundEnabled, setHapticsEnabled } = useGameStore();
  const {
    musicEnabled,
    musicVolume,
    setMusicEnabled,
    setMusicVolume,
    soundEnabled,
    sfxVolume,
    setSoundEnabled: setSettingsSoundEnabled,
    setSfxVolume,
    hapticsEnabled,
    setHapticsEnabled: setSettingsHapticsEnabled,
  } = useSettingsStore();

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSettingsSoundEnabled(next);
  };

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    setSettingsHapticsEnabled(next);
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none font-sans-clean"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="bg-gradient-to-b from-[#170b09] via-[#0d0605] to-[#0d0605] border-2 border-[#301a14] rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-md w-full max-h-[92dvh] flex flex-col text-left"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[#301a14] pb-2.5 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c84b31] to-[#8f2d1b] text-white flex items-center justify-center shadow">
                <Layers className="w-4 h-4 text-[#e5c378]" />
              </div>
              <h3 className="font-serif font-black text-sm sm:text-base text-[#f7f0ea] tracking-wider uppercase">
                Match Settings
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#e5c378]/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* 1. Audio Controls */}
            <div className="p-3 rounded-2xl bg-[#0d0605] border border-[#301a14] space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#e5c378]/80 font-bold flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#c84b31]" /> Audio & Atmosphere
              </span>

              {/* Background Music Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMusicEnabled(!musicEnabled)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                      musicEnabled
                        ? 'bg-[#c84b31]/20 border-[#c84b31] text-[#e5c378]'
                        : 'bg-[#170b09] border-[#301a14] text-[#e5c378]/40'
                    }`}
                    title="Toggle Music"
                  >
                    <Music className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-[#f7f0ea]">Music</span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={!musicEnabled}
                    value={musicVolume}
                    onChange={e => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#301a14] rounded-lg appearance-none cursor-pointer accent-[#c84b31] disabled:opacity-30"
                  />
                  <span className="text-[10px] font-mono text-[#e5c378]/70 w-7 text-right">
                    {musicEnabled ? Math.round(musicVolume * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Sound Effects Row */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSound}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                      soundEnabled
                        ? 'bg-[#c84b31]/20 border-[#c84b31] text-[#e5c378]'
                        : 'bg-[#170b09] border-[#301a14] text-[#e5c378]/40'
                    }`}
                    title="Toggle SFX"
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-xs font-bold text-[#f7f0ea]">SFX</span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={!soundEnabled}
                    value={sfxVolume}
                    onChange={e => setSfxVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#301a14] rounded-lg appearance-none cursor-pointer accent-[#c84b31] disabled:opacity-30"
                  />
                  <span className="text-[10px] font-mono text-[#e5c378]/70 w-7 text-right">
                    {soundEnabled ? Math.round(sfxVolume * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Haptics Row */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#301a14]/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#170b09] border border-[#301a14] flex items-center justify-center text-[#e5c378]/70">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#f7f0ea]">Haptic Feedback</span>
                </div>
                <button
                  onClick={handleToggleHaptics}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    hapticsEnabled ? 'bg-[#c84b31]' : 'bg-[#301a14]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      hapticsEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 2. Deck Back Switcher */}
            <div className="p-3 rounded-2xl bg-[#0d0605] border border-[#301a14] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#e5c378]/80 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#c84b31]" /> Physical Deck Back
                </span>
                <span className="text-[9px] font-mono text-[#e5c378] px-1.5 py-0.5 rounded bg-[#301a14]/60 border border-[#e5c378]/30">
                  {DECK_DESIGNS[activeDeck || 'royal_lacquer']?.name || 'Royal Lacquer'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {PHYSICAL_DECK_KEYS.map(dKey => {
                  const dCfg = DECK_DESIGNS[dKey];
                  const isSelected = (activeDeck || 'royal_lacquer') === dKey;
                  return (
                    <button
                      key={dKey}
                      onClick={() => setActiveDeck(dKey)}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#c84b31]/25 border-[#e5c378] text-white font-bold shadow-[0_0_12px_rgba(200,75,49,0.4)]'
                          : 'bg-[#170b09] hover:bg-[#301a14]/70 text-[#f7f0ea]/80 border-[#301a14]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-bold truncate">{dCfg.name}</span>
                        {isSelected && <span className="text-[10px] text-[#e5c378]">✓</span>}
                      </div>
                      <span className="text-[9px] font-mono text-[#e5c378]/60 uppercase">
                        {dCfg.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Match Actions Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenRules();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#170b09] hover:bg-[#301a14] text-[#f7f0ea] border border-[#301a14] font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <HelpCircle className="w-4 h-4 text-[#e5c378] shrink-0" />
                <span>Rules Guide</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenScorecard();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#170b09] hover:bg-[#301a14] text-[#f7f0ea] border border-[#301a14] font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <Target className="w-4 h-4 text-[#e5c378] shrink-0" />
                <span>Scorecard</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#301a14] space-y-2 shrink-0">
            {/* Resume Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#c84b31] via-[#e5c378] to-[#c84b31] text-[#0d0605] font-black uppercase tracking-wider text-xs shadow-lg hover:brightness-110 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Match</span>
            </button>

            {/* Restart & Forfeit */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Restart this match from the beginning?')) {
                    onRestartMatch();
                    onClose();
                  }
                }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-[#170b09] hover:bg-[#301a14] text-[#e5c378]/80 hover:text-white border border-[#301a14] text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Exit match and return to the main lobby?')) {
                    onExitMatch();
                    onClose();
                  }
                }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-[#170b09] hover:bg-rose-950/60 text-rose-300 border border-rose-900/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Table</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
