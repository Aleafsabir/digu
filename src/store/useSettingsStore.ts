import { create } from 'zustand';

export type AITier = 'casual' | 'regular' | 'master';

interface SettingsState {
  aiTier: AITier;
  soundEnabled: boolean;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  hapticsEnabled: boolean;
  serverUrl: string;

  setAiTier: (tier: AITier) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSfxVolume: (vol: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMusicVolume: (vol: number) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
}

const SETTINGS_STORAGE_KEY = 'digu_settings_v2';

function loadInitialSettings() {
  if (typeof localStorage === 'undefined') {
    return {
      aiTier: 'master' as AITier,
      soundEnabled: true,
      sfxVolume: 0.85,
      musicEnabled: true,
      musicVolume: 0.70,
      hapticsEnabled: true,
      serverUrl: 'https://digu-holhuashi.onrender.com',
    };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        aiTier: (parsed.aiTier as AITier) || 'master',
        soundEnabled: parsed.soundEnabled ?? true,
        sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : 0.85,
        musicEnabled: parsed.musicEnabled ?? true,
        musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : 0.70,
        hapticsEnabled: parsed.hapticsEnabled ?? true,
        serverUrl: parsed.serverUrl || 'https://digu-holhuashi.onrender.com',
      };
    }
  } catch (err) {
    console.warn('Failed to load settings from storage:', err);
  }
  return {
    aiTier: 'master' as AITier,
    soundEnabled: true,
    sfxVolume: 0.85,
    musicEnabled: true,
    musicVolume: 0.70,
    hapticsEnabled: true,
    serverUrl: 'https://digu-holhuashi.onrender.com',
  };
}

function persistSettings(data: Partial<SettingsState>) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = loadInitialSettings();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...current, ...data }));
  } catch (err) {
    console.warn('Failed to persist settings:', err);
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = loadInitialSettings();

  return {
    ...initial,

    setAiTier: (tier) => {
      set({ aiTier: tier });
      persistSettings({ aiTier: tier });
    },
    setSoundEnabled: (enabled) => {
      set({ soundEnabled: enabled });
      persistSettings({ soundEnabled: enabled });
    },
    setSfxVolume: (vol) => {
      set({ sfxVolume: vol });
      persistSettings({ sfxVolume: vol });
    },
    setMusicEnabled: (enabled) => {
      set({ musicEnabled: enabled });
      persistSettings({ musicEnabled: enabled });
    },
    setMusicVolume: (vol) => {
      set({ musicVolume: vol });
      persistSettings({ musicVolume: vol });
    },
    setHapticsEnabled: (enabled) => {
      set({ hapticsEnabled: enabled });
      persistSettings({ hapticsEnabled: enabled });
    },
    setServerUrl: (url) => {
      set({ serverUrl: url });
      persistSettings({ serverUrl: url });
    },
  };
});
