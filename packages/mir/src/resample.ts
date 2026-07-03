/** Analysis-side sample rate: chroma/tempo/pitch work well here and it keeps CPU sane. */
export const ANALYSIS_SAMPLE_RATE = 22050;

/** Mix an AudioBuffer-shaped set of channels down to mono. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) {
    for (let i = 0; i < n; i++) out[i] += ch[i];
  }
  const g = 1 / channels.length;
  for (let i = 0; i < n; i++) out[i] *= g;
  return out;
}

/** Linear resampler — adequate for analysis (not for playback). */
export function resampleLinear(
  pcm: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return pcm;
  const outLen = Math.floor((pcm.length * toRate) / fromRate);
  const out = new Float32Array(outLen);
  const step = fromRate / toRate;
  for (let i = 0; i < outLen; i++) {
    const x = i * step;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, pcm.length - 1);
    const frac = x - i0;
    out[i] = pcm[i0] * (1 - frac) + pcm[i1] * frac;
  }
  return out;
}
