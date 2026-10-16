/**
 * Synthesized Web Audio Sound Effects for Card Game Actions.
 * Zero external audio files required, runs 100% locally and offline.
 */

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
  } catch {}
}

/**
 * Synthesizes a crisp, subtle card slide / flick click sound.
 */
export function playCardFlickSound(): void {
  try {
    if (!useGameStore.getState().soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // High snap frequency decaying fast
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Graceful silence on blocked audio
  }
}

/**
 * Synthesizes a rich 3D card deck riffle flutter shuffle sound.
 */
export function playRiffleShuffleSound(): void {
  try {
    if (!useGameStore.getState().soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * 0.9); // 0.9 seconds of riffle flutter
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate modulated noise simulating rapid card leaves snapping together
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      // Flutter frequency accelerates slightly like a real riffle
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
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gain.gain.setValueAtTime(0.12, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.95);
  } catch {
    // Graceful silence
  }
}

/**
 * Synthesizes a deep, thunderous table thud / slam impact sound with punchy sub-bass transient.
 */
export function playGinSlamImpactSound(): void {
  try {
    if (!useGameStore.getState().soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Deep low-end bass sub thud (110Hz diving down to 26Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.38);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.5);

    // 2. High snap transient / hard card slap on the felt
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(500, now);
    snapOsc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

    snapGain.gain.setValueAtTime(0.28, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.1);
  } catch {
    // Graceful silence
  }
}

