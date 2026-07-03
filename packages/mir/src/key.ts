import type { KeyEstimate } from '@lyd/schema';
import { PITCH_CLASSES } from '@lyd/schema';

/** Krumhansl–Kessler key profiles. */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function pearson(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = 12;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den > 1e-12 ? num / den : 0;
}

/** Krumhansl–Schmuckler key estimation from an aggregate chroma vector. */
export function estimateKey(chroma: ArrayLike<number>): KeyEstimate {
  let bestScore = -Infinity;
  let secondScore = -Infinity;
  let bestTonic = 0;
  let bestMode: 'major' | 'minor' = 'major';

  for (const mode of ['major', 'minor'] as const) {
    const profile = mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE;
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotated = new Float64Array(12);
      for (let i = 0; i < 12; i++) rotated[i] = chroma[(i + tonic) % 12];
      const score = pearson(rotated, profile);
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestTonic = tonic;
        bestMode = mode;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }
  }

  // Confidence: gap to runner-up, squashed into [0,1].
  const gap = Math.max(0, bestScore - secondScore);
  const confidence = Math.max(0, Math.min(1, bestScore * 0.5 + gap * 2));

  return {
    tonic: PITCH_CLASSES[bestTonic],
    mode: bestMode,
    confidence: Number(confidence.toFixed(3)),
  };
}
