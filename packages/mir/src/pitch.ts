/**
 * YIN pitch detection (de Cheveigné & Kawahara 2002) — powers the tuner
 * and the melody doodler.
 */

export interface PitchResult {
  /** Fundamental in Hz, or null if unvoiced/unclear. */
  freq: number | null;
  /** 1 - CMNDF minimum: higher = clearer pitch. */
  clarity: number;
}

export interface YinOptions {
  fMin?: number;
  fMax?: number;
  threshold?: number;
}

export function yinPitch(
  buf: Float32Array,
  sampleRate: number,
  opts: YinOptions = {},
): PitchResult {
  const fMin = opts.fMin ?? 40;
  const fMax = opts.fMax ?? 1500;
  const threshold = opts.threshold ?? 0.15;

  const w = buf.length >> 1;
  const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
  const tauMax = Math.min(w - 1, Math.ceil(sampleRate / fMin));
  if (tauMax <= tauMin) return { freq: null, clarity: 0 };

  // Energy gate.
  let energy = 0;
  for (let i = 0; i < buf.length; i++) energy += buf[i] * buf[i];
  if (energy / buf.length < 1e-8) return { freq: null, clarity: 0 };

  // Difference function.
  const diff = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const d = buf[i] - buf[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Cumulative-mean-normalized difference function.
  const cmndf = new Float64Array(tauMax + 1);
  cmndf[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += diff[tau];
    cmndf[tau] = running > 1e-12 ? (diff[tau] * tau) / running : 1;
  }

  // Absolute threshold: first dip below threshold, descended to its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmndf[t] < threshold) {
      while (t + 1 <= tauMax && cmndf[t + 1] < cmndf[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    // Fall back to the global minimum if it is reasonably clear.
    let minT = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t++) {
      if (cmndf[t] < cmndf[minT]) minT = t;
    }
    if (cmndf[minT] < 0.35) tau = minT;
    else return { freq: null, clarity: Math.max(0, 1 - cmndf[minT]) };
  }

  // Parabolic interpolation around the minimum.
  let refined = tau;
  if (tau > tauMin && tau < tauMax) {
    const y0 = cmndf[tau - 1];
    const y1 = cmndf[tau];
    const y2 = cmndf[tau + 1];
    const denom = y0 - 2 * y1 + y2;
    if (Math.abs(denom) > 1e-12) {
      const delta = (0.5 * (y0 - y2)) / denom;
      if (Math.abs(delta) <= 1) refined = tau + delta;
    }
  }

  return {
    freq: sampleRate / refined,
    clarity: Math.max(0, Math.min(1, 1 - cmndf[tau])),
  };
}

export interface PitchFrame {
  time: number; // seconds (frame center)
  freq: number | null;
  clarity: number;
}

export const PITCH_WIN = 2048;
export const PITCH_HOP = 512;

/** Frame-by-frame pitch track over a whole buffer (doodler capture). */
export function trackPitch(
  pcm: Float32Array,
  sampleRate: number,
  opts: YinOptions = {},
): PitchFrame[] {
  const out: PitchFrame[] = [];
  for (let start = 0; start + PITCH_WIN <= pcm.length; start += PITCH_HOP) {
    const frame = pcm.subarray(start, start + PITCH_WIN);
    const { freq, clarity } = yinPitch(frame, sampleRate, opts);
    out.push({ time: (start + PITCH_WIN / 2) / sampleRate, freq, clarity });
  }
  return out;
}
