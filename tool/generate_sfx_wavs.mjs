#!/usr/bin/env node
/**
 * Zero-dependency 44.1kHz 16-bit mono PCM WAV synthesizer for Holhuashi table SFX.
 * Ported from main:src/utils/audioEffects.ts with smooth envelopes & peak normalization.
 *
 * Usage: node tool/generate_sfx_wavs.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../assets/audio');
const SAMPLE_RATE = 44100;

/** Deterministic Mulberry32 PRNG for reproducible shuffle/whoosh noise. */
function createRng(seed = 0x5f3759df) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function triangle(phase) {
  const u = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
  return 2 * Math.abs(2 * u - 1) - 1;
}

function expSweep(f0, f1, t, dur) {
  const ratio = Math.max(0, Math.min(1, t / Math.max(dur, 1e-6)));
  return f0 * Math.pow(f1 / f0, ratio);
}

/** 2-pole biquad bandpass filter (Audio EQ Cookbook). */
function applyBandpass(samples, freqFn, qFn) {
  const out = new Float64Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const fc = Math.max(20, Math.min(SAMPLE_RATE * 0.45, freqFn(t)));
    const q = Math.max(0.25, qFn(t));
    const w0 = (2 * Math.PI * fc) / SAMPLE_RATE;
    const cosW0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);

    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;

    const x0 = samples[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** 1-pole sweeping lowpass filter. */
function applyLowpass(samples, freqFn) {
  const out = new Float64Array(samples.length);
  let yPrev = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const fc = Math.max(40, Math.min(SAMPLE_RATE * 0.45, freqFn(t)));
    const rc = 1 / (2 * Math.PI * fc);
    const dt = 1 / SAMPLE_RATE;
    const alpha = dt / (rc + dt);
    yPrev = yPrev + alpha * (samples[i] - yPrev);
    out[i] = yPrev;
  }
  return out;
}

/** Apply smooth attack and release fades to prevent boundary clicks. */
function applyEdgeEnvelope(samples, attackSec = 0.003, releaseSec = 0.004) {
  const n = samples.length;
  const attSamples = Math.min(Math.floor(attackSec * SAMPLE_RATE), Math.floor(n / 2));
  const relSamples = Math.min(Math.floor(releaseSec * SAMPLE_RATE), Math.floor(n / 2));

  for (let i = 0; i < attSamples; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / Math.max(1, attSamples));
    samples[i] *= g;
  }
  for (let i = 0; i < relSamples; i++) {
    const idx = n - 1 - i;
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / Math.max(1, relSamples));
    samples[idx] *= g;
  }
  return samples;
}

function normalizePeak(samples, targetPeak = 0.82) {
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs < 1e-9) return samples;
  const scale = targetPeak / maxAbs;
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= scale;
  }
  return samples;
}

/** Encode normalized [-1, 1] float samples into a 44.1kHz 16-bit mono PCM WAV Buffer. */
function encodeWavMono16(samples) {
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32);  // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }
  return buffer;
}

function makeBuf(durationSec) {
  return new Float64Array(Math.max(1, Math.round(durationSec * SAMPLE_RATE)));
}

/* ========================================================================== */
/*                          11 TACTILE TABLE SFX TRACKS                       */
/* ========================================================================== */

function synthShuffle() {
  const dur = 0.90;
  const rng = createRng(101);
  const raw = makeBuf(dur);

  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const flutter = Math.sin(2 * Math.PI * (45 + t * 25) * t);
    const noise = (rng() * 2 - 1) * (0.6 + 0.4 * flutter);

    let env = 1.0;
    if (t < 0.15) {
      env = 0.08 + 0.92 * (t / 0.15);
    } else if (t > 0.65) {
      const rem = (t - 0.65) / 0.25;
      env = Math.pow(0.008, Math.min(1, rem));
    }
    raw[i] = noise * env;
  }

  const filtered = applyLowpass(raw, (t) => expSweep(1800, 800, t, 0.85));
  applyEdgeEnvelope(filtered, 0.004, 0.008);
  return normalizePeak(filtered, 0.82);
}

function synthCardDeal() {
  const dur = 0.055;
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(650, 180, t, 0.05);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.pow(0.01, Math.min(1, t / 0.05));
    raw[i] = triangle(phase) * env;
  }
  const filtered = applyBandpass(raw, () => 1400, () => 2.5);
  applyEdgeEnvelope(filtered, 0.002, 0.004);
  return normalizePeak(filtered, 0.82);
}

function synthCardSnap() {
  const dur = 0.045;
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(800, 120, t, 0.04);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.pow(0.01, Math.min(1, t / 0.04));
    raw[i] = triangle(phase) * env;
  }
  const filtered = applyBandpass(raw, () => 1200, () => 3.0);
  applyEdgeEnvelope(filtered, 0.002, 0.003);
  return normalizePeak(filtered, 0.82);
}

function synthDiscardPickup() {
  const dur = 0.050;
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(420, 740, t, 0.04);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.pow(0.008, Math.min(1, t / 0.045));
    raw[i] = Math.sin(phase) * env;
  }
  applyEdgeEnvelope(raw, 0.002, 0.004);
  return normalizePeak(raw, 0.82);
}

function synthCardDiscard() {
  const dur = 0.080;
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(160, 45, t, 0.07);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.pow(0.006, Math.min(1, t / 0.075));
    raw[i] = triangle(phase) * env;
  }
  applyEdgeEnvelope(raw, 0.002, 0.005);
  return normalizePeak(raw, 0.82);
}

function synthFanTick() {
  const dur = 0.022;
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(1100, 500, t, 0.018);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.pow(0.01, Math.min(1, t / 0.019));
    raw[i] = Math.sin(phase) * env;
  }
  applyEdgeEnvelope(raw, 0.002, 0.003);
  return normalizePeak(raw, 0.45);
}

function synthGinReady() {
  const dur = 0.60;
  const raw = makeBuf(dur);
  const notes = [
    { freq: 523.25, delay: 0.0 },  // C5
    { freq: 659.25, delay: 0.06 }, // E5
    { freq: 783.99, delay: 0.12 }, // G5
  ];

  for (const note of notes) {
    for (let i = 0; i < raw.length; i++) {
      const t = i / SAMPLE_RATE - note.delay;
      if (t < 0 || t > 0.48) continue;
      let env = 0;
      if (t < 0.02) {
        env = t / 0.02;
      } else {
        env = Math.pow(0.005, (t - 0.02) / 0.46);
      }
      raw[i] += Math.sin(2 * Math.PI * note.freq * t) * env * 0.45;
    }
  }
  applyEdgeEnvelope(raw, 0.003, 0.006);
  return normalizePeak(raw, 0.82);
}

function synthTimerHeartbeat() {
  const dur = 0.15;
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(80, 35, t, 0.12);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.pow(0.004, Math.min(1, t / 0.14));
    raw[i] = Math.sin(phase) * env;
  }
  applyEdgeEnvelope(raw, 0.003, 0.005);
  return normalizePeak(raw, 0.82);
}

function synthTrickSweep() {
  const dur = 0.18;
  const rng = createRng(202);
  const raw = makeBuf(dur);
  let phase = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = expSweep(320, 780, t, dur);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.sin((Math.PI * t) / dur);
    const noise = (rng() * 2 - 1) * 0.65;
    const tri = triangle(phase) * 0.35;
    raw[i] = (noise + tri) * env;
  }
  const filtered = applyBandpass(raw, (t) => expSweep(650, 2200, t, dur), () => 1.8);
  applyEdgeEnvelope(filtered, 0.004, 0.006);
  return normalizePeak(filtered, 0.82);
}

function synthGinSlam() {
  const dur = 0.50;
  const raw = makeBuf(dur);
  let subPhase = 0;
  let snapPhase = 0;

  for (let i = 0; i < raw.length; i++) {
    const t = i / SAMPLE_RATE;
    const subFreq = expSweep(115, 26, t, 0.38);
    subPhase += (2 * Math.PI * subFreq) / SAMPLE_RATE;
    const subEnv = Math.pow(0.0025, Math.min(1, t / 0.45));
    let sample = Math.sin(subPhase) * subEnv * 0.85;

    if (t <= 0.10) {
      const snapFreq = expSweep(500, 55, t, 0.08);
      snapPhase += (2 * Math.PI * snapFreq) / SAMPLE_RATE;
      const snapEnv = Math.pow(0.004, Math.min(1, t / 0.09));
      sample += triangle(snapPhase) * snapEnv * 0.60;
    }
    raw[i] = sample;
  }
  applyEdgeEnvelope(raw, 0.002, 0.006);
  return normalizePeak(raw, 0.82);
}

function synthFanfare() {
  const dur = 0.65;
  const raw = makeBuf(dur);
  // Warm rising Maldivian-inspired golden victory arpeggio (D5 -> F#5 -> A5 -> D6)
  const notes = [
    { freq: 587.33, delay: 0.00, len: 0.30, amp: 0.35 },
    { freq: 739.99, delay: 0.08, len: 0.32, amp: 0.35 },
    { freq: 880.00, delay: 0.16, len: 0.35, amp: 0.38 },
    { freq: 1174.66, delay: 0.24, len: 0.40, amp: 0.45 },
  ];

  for (const note of notes) {
    for (let i = 0; i < raw.length; i++) {
      const t = i / SAMPLE_RATE - note.delay;
      if (t < 0 || t > note.len) continue;
      const env = t < 0.015
        ? t / 0.015
        : Math.pow(0.004, (t - 0.015) / Math.max(0.01, note.len - 0.015));
      // Fundamental + warm 2nd harmonic
      const tone = Math.sin(2 * Math.PI * note.freq * t) * 0.82 +
                   Math.sin(4 * Math.PI * note.freq * t) * 0.18;
      raw[i] += tone * env * note.amp;
    }
  }
  applyEdgeEnvelope(raw, 0.003, 0.008);
  return normalizePeak(raw, 0.82);
}

const TRACKS = {
  'sfx_shuffle.wav': synthShuffle,
  'sfx_card_deal.wav': synthCardDeal,
  'sfx_card_snap.wav': synthCardSnap,
  'sfx_discard_pickup.wav': synthDiscardPickup,
  'sfx_card_discard.wav': synthCardDiscard,
  'sfx_fan_tick.wav': synthFanTick,
  'sfx_gin_ready.wav': synthGinReady,
  'sfx_timer_heartbeat.wav': synthTimerHeartbeat,
  'sfx_trick_sweep.wav': synthTrickSweep,
  'sfx_gin_slam.wav': synthGinSlam,
  'sfx_fanfare.wav': synthFanfare,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [fileName, synthFn] of Object.entries(TRACKS)) {
  const samples = synthFn();
  const wavBuffer = encodeWavMono16(samples);
  const outPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(outPath, wavBuffer);
  console.log(`Generated ${fileName} (${wavBuffer.length} bytes, ${(samples.length / SAMPLE_RATE).toFixed(3)}s)`);
}
