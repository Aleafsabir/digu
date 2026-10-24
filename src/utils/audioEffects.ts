/**
 * Audio Engine for Digu (Maldivian Rummy)
 * - HTML5 Audio BGM Manager streaming user Lyria stereo soundtracks (`bgm_lobby.mp3` & `bgm_table.mp3`)
 * - Synthesized Web Audio SFX for crisp, tactile physical card feedback
 */

import { useSettingsStore } from '../store/useSettingsStore';
import { useGameStore } from '../store/useGameStore';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function primeAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Also unlock HTML5 music playback if pending
    MusicManager.unlockAndPlay();
  } catch {}
}

function getEffectiveSfxVolume(): number {
  const settings = useSettingsStore.getState();
  const game = useGameStore.getState();
  if (!settings.soundEnabled || !game.soundEnabled) return 0;
  return settings.sfxVolume ?? 0.85;
}

/* ========================================================================== */
/*                             LYRIA MUSIC MANAGER                            */
/* ========================================================================== */

type MusicTrack = 'lobby' | 'table' | 'none';

class BGMManager {
  private currentTrack: MusicTrack = 'none';
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup autoplay unlock listener on first user interaction
      const unlockHandler = () => {
        this.unlockAndPlay();
        window.removeEventListener('pointerdown', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
      };
      window.addEventListener('pointerdown', unlockHandler, { once: true });
      window.addEventListener('keydown', unlockHandler, { once: true });

      // Subscribe to settings changes for instant live volume updates
      useSettingsStore.subscribe((state) => {
        if (!state.musicEnabled) {
          if (this.audioElement) {
            this.audioElement.pause();
          }
        } else {
          if (this.audioElement) {
            this.audioElement.volume = Math.max(0, Math.min(1, state.musicVolume));
            if (this.audioElement.paused && this.currentTrack !== 'none') {
              this.audioElement.play().catch(() => {});
            }
          }
        }
      });
    }
  }

  public unlockAndPlay() {
    if (this.audioElement && this.currentTrack !== 'none') {
      const { musicEnabled, musicVolume } = useSettingsStore.getState();
      if (musicEnabled) {
        this.audioElement.volume = Math.max(0, Math.min(1, musicVolume));
        this.audioElement.play().catch(() => {});
      }
    }
  }

  public playTrack(track: MusicTrack) {
    if (track === this.currentTrack) return;
    this.currentTrack = track;

    if (track === 'none') {
      this.stop();
      return;
    }

    const trackUrl =
      track === 'table' ? '/assets/audio/bgm_table.mp3' : '/assets/audio/bgm_lobby.mp3';

    const { musicEnabled, musicVolume } = useSettingsStore.getState();

    // If an existing track is playing, crossfade out smoothly
    if (this.audioElement) {
      const oldAudio = this.audioElement;
      let fadeVol = oldAudio.volume;
      const fadeStep = fadeVol / 8;
      const interval = setInterval(() => {
        fadeVol = Math.max(0, fadeVol - fadeStep);
        oldAudio.volume = fadeVol;
        if (fadeVol <= 0.02) {
          clearInterval(interval);
          oldAudio.pause();
          oldAudio.src = '';
        }
      }, 40);
    }

    const audio = new Audio(trackUrl);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = musicEnabled ? Math.max(0, Math.min(1, musicVolume)) : 0;
    this.audioElement = audio;

    if (musicEnabled) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Blocked by browser autoplay policy until next interaction
        });
      }
    }
  }

  public stop() {
    this.currentTrack = 'none';
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }
}

export const MusicManager = new BGMManager();

/* ========================================================================== */
/*                      TACTILE PROCEDURAL WEB AUDIO SFX                      */
/* ========================================================================== */

/**
 * 1. Card Slide / Draw Sound: Crisp soft card leaf sliding smoothly across felt.
 */
export function playCardDrawSound(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.12 * sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
  } catch {}
}

/**
 * 2. Discard Pickup Sound: Light crisp pluck when drawing from discard pile.
 */
export function playDiscardPickupSound(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.04);

    gain.gain.setValueAtTime(0.14 * sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

/**
 * 3. Card Discard Thud: Satisfying medium felt slap when card lands on discard pile.
 */
export function playCardDiscardThud(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Soft low transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

    gain.gain.setValueAtTime(0.22 * sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {}
}

/**
 * 4. Fan Reorder Tick: Subtle, ultra-soft micro-click when selecting / reordering hand cards.
 */
export function playFanReorderTick(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.015);

    gain.gain.setValueAtTime(0.06 * sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch {}
}

/**
 * 5. Gin Ready Chime: Resonant, warm golden chime (C5-E5-G5 triad) when hand reaches 0 deadwood.
 */
export function playGinReadyChime(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18 * sfxVol, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.6);
    });
  } catch {}
}

/**
 * 6. Urgent Timer Heartbeat: Low rhythmic pulse when turn countdown is critical (< 4s).
 */
export function playUrgentTimerHeartbeat(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    gain.gain.setValueAtTime(0.25 * sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

/**
 * 7. Card Flick Sound: Fast snap click.
 */
export function playCardFlickSound(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.08 * sfxVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {}
}

/**
 * 8. Riffle Shuffle Sound: Synthesizes rich 3D card deck riffle flutter.
 */
export function playRiffleShuffleSound(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const flutter = Math.sin(2 * Math.PI * (45 + t * 25) * t);
      const noise = (Math.random() * 2 - 1) * (0.6 + 0.4 * flutter);
      data[i] = noise;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.85);

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01 * sfxVol, now);
    gain.gain.linearRampToValueAtTime(0.12 * sfxVol, now + 0.15);
    gain.gain.setValueAtTime(0.12 * sfxVol, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.95);
  } catch {}
}

/**
 * 9. Gin Slam Impact Sound: Deep, thunderous table thud with punchy sub-bass transient.
 */
export function playGinSlamImpactSound(): void {
  try {
    const sfxVol = getEffectiveSfxVolume();
    if (sfxVol <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sub thud
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.38);

    subGain.gain.setValueAtTime(0.4 * sfxVol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.5);

    // High snap slap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(500, now);
    snapOsc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

    snapGain.gain.setValueAtTime(0.28 * sfxVol, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.1);
  } catch {}
}
