import { magnitudeSpectrum } from './fft';

const WIN = 2048;
const HOP = 1024;

export interface TimbreSummary {
  brightness: 'dark' | 'warm' | 'bright' | 'brilliant';
  spectralCentroidHz: number;
}

/**
 * Plain-language timbre words from an energy-weighted mean spectral centroid.
 * "Brightness as vibe, not verdict."
 */
export function summarizeTimbre(pcm: Float32Array, sampleRate: number): TimbreSummary {
  const binHz = sampleRate / WIN;
  let weighted = 0;
  let total = 0;
  for (let start = 0; start + WIN <= pcm.length; start += HOP) {
    const mag = magnitudeSpectrum(pcm.subarray(start, start + WIN));
    for (let k = 1; k < mag.length; k++) {
      const e = mag[k] * mag[k];
      weighted += e * k * binHz;
      total += e;
    }
  }
  const centroid = total > 1e-12 ? weighted / total : 0;
  const brightness =
    centroid < 800 ? 'dark' : centroid < 1800 ? 'warm' : centroid < 3500 ? 'bright' : 'brilliant';
  return { brightness, spectralCentroidHz: Number(centroid.toFixed(1)) };
}
