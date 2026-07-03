import { magnitudeSpectrum } from './fft';

export const CHROMA_WIN = 4096;
export const CHROMA_HOP = 2048;

export interface ChromaFrames {
  /** frames[i] is a 12-vector (C..B), L2-normalized unless the frame is silent. */
  frames: Float32Array[];
  /** RMS energy per frame (pre-normalization), for silence gating. */
  rms: Float32Array;
  hopSec: number;
}

/**
 * Pitch-class profile per STFT frame. Energy from spectral bins between
 * fMin and fMax is accumulated into 12 pitch classes.
 */
export function chromagram(
  pcm: Float32Array,
  sampleRate: number,
  opts: { fMin?: number; fMax?: number } = {},
): ChromaFrames {
  const fMin = opts.fMin ?? 55;
  const fMax = opts.fMax ?? 5000;
  const frames: Float32Array[] = [];
  const rmsList: number[] = [];
  const binHz = sampleRate / CHROMA_WIN;

  for (let start = 0; start + CHROMA_WIN <= pcm.length; start += CHROMA_HOP) {
    const frame = pcm.subarray(start, start + CHROMA_WIN);

    let sq = 0;
    for (let i = 0; i < frame.length; i++) sq += frame[i] * frame[i];
    const rms = Math.sqrt(sq / frame.length);
    rmsList.push(rms);

    const mag = magnitudeSpectrum(frame);
    const chroma = new Float32Array(12);
    const kMin = Math.max(1, Math.ceil(fMin / binHz));
    const kMax = Math.min(mag.length - 1, Math.floor(fMax / binHz));
    for (let k = kMin; k <= kMax; k++) {
      const f = k * binHz;
      const midi = 69 + 12 * Math.log2(f / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pc] += mag[k] * mag[k];
    }

    let norm = 0;
    for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
    norm = Math.sqrt(norm);
    if (norm > 1e-12) {
      for (let i = 0; i < 12; i++) chroma[i] /= norm;
    }
    frames.push(chroma);
  }

  return {
    frames,
    rms: Float32Array.from(rmsList),
    hopSec: CHROMA_HOP / sampleRate,
  };
}

/** Mean chroma over all frames, weighted by frame RMS (silence contributes ~0). */
export function meanChroma(c: ChromaFrames): Float64Array {
  const mean = new Float64Array(12);
  let totalW = 0;
  for (let i = 0; i < c.frames.length; i++) {
    const w = c.rms[i];
    for (let p = 0; p < 12; p++) mean[p] += c.frames[i][p] * w;
    totalW += w;
  }
  if (totalW > 1e-12) {
    for (let p = 0; p < 12; p++) mean[p] /= totalW;
  }
  return mean;
}
