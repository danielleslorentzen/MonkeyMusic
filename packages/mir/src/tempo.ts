import type { TempoEstimate } from '@lyd/schema';
import { magnitudeSpectrum } from './fft';

const ONSET_WIN = 1024;
const ONSET_HOP = 256;
const BPM_MIN = 55;
const BPM_MAX = 200;

/** Spectral-flux onset strength envelope (half-wave rectified magnitude increase). */
export function onsetEnvelope(
  pcm: Float32Array,
  sampleRate: number,
): { env: Float64Array; envRate: number } {
  const nFrames = Math.max(0, Math.floor((pcm.length - ONSET_WIN) / ONSET_HOP) + 1);
  const env = new Float64Array(nFrames);
  let prev: Float64Array | null = null;
  for (let f = 0; f < nFrames; f++) {
    const frame = pcm.subarray(f * ONSET_HOP, f * ONSET_HOP + ONSET_WIN);
    const mag = magnitudeSpectrum(frame);
    if (prev) {
      let flux = 0;
      for (let k = 0; k < mag.length; k++) {
        const d = mag[k] - prev[k];
        if (d > 0) flux += d;
      }
      env[f] = flux;
    }
    prev = mag;
  }

  // Remove local mean so the autocorrelation sees pulse structure, not DC.
  const meanWin = Math.round((sampleRate / ONSET_HOP) * 1.0); // ~1 s
  const smoothed = new Float64Array(env.length);
  for (let i = 0; i < env.length; i++) {
    const a = Math.max(0, i - meanWin);
    const b = Math.min(env.length - 1, i + meanWin);
    let m = 0;
    for (let j = a; j <= b; j++) m += env[j];
    m /= b - a + 1;
    smoothed[i] = Math.max(0, env[i] - m);
  }

  return { env: smoothed, envRate: sampleRate / ONSET_HOP };
}

/** Log-Gaussian preference for mid tempos (peaked near 120 BPM). */
function tempoPrior(bpm: number): number {
  const x = Math.log2(bpm / 120);
  return Math.exp(-0.5 * (x / 1.0) ** 2);
}

/** Autocorrelation tempo estimate with parabolic peak interpolation. */
export function estimateTempo(pcm: Float32Array, sampleRate: number): TempoEstimate {
  const { env, envRate } = onsetEnvelope(pcm, sampleRate);
  if (env.length < envRate * 2) {
    return { bpm: 0, confidence: 0 };
  }

  const lagMin = Math.max(2, Math.floor((60 / BPM_MAX) * envRate));
  const lagMax = Math.min(env.length - 1, Math.ceil((60 / BPM_MIN) * envRate));

  const ac = new Float64Array(lagMax + 1);
  let energy = 0;
  for (let i = 0; i < env.length; i++) energy += env[i] * env[i];
  if (energy < 1e-12) return { bpm: 0, confidence: 0 };

  for (let lag = lagMin; lag <= lagMax; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < env.length; i++) sum += env[i] * env[i + lag];
    ac[lag] = sum / energy;
  }

  let bestLag = lagMin;
  let bestScore = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    const bpm = (60 * envRate) / lag;
    const score = ac[lag] * tempoPrior(bpm);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  // Parabolic interpolation around the peak for sub-lag precision.
  let refined = bestLag;
  if (bestLag > lagMin && bestLag < lagMax) {
    const y0 = ac[bestLag - 1];
    const y1 = ac[bestLag];
    const y2 = ac[bestLag + 1];
    const denom = y0 - 2 * y1 + y2;
    if (Math.abs(denom) > 1e-12) {
      const delta = (0.5 * (y0 - y2)) / denom;
      if (Math.abs(delta) <= 1) refined = bestLag + delta;
    }
  }

  const bpm = (60 * envRate) / refined;
  const confidence = Math.max(0, Math.min(1, ac[bestLag]));
  return { bpm: Number(bpm.toFixed(2)), confidence: Number(confidence.toFixed(3)) };
}
