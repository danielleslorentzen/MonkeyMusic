import type { ChordLabel, ChordSegment } from '@lyd/schema';
import { PITCH_CLASSES } from '@lyd/schema';
import type { ChromaFrames } from './chroma';

/**
 * Chord recognition: 24 triad templates (12 major + 12 minor) + no-chord,
 * cosine-similarity emissions, Viterbi smoothing (the "simple HMM in TS"
 * from TDD §4.1).
 */

interface ChordState {
  label: ChordLabel;
  template: Float32Array | null; // null = no-chord state
}

function triadTemplate(root: number, intervals: number[]): Float32Array {
  const t = new Float32Array(12);
  for (const iv of intervals) t[(root + iv) % 12] = 1;
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += t[i] * t[i];
  norm = Math.sqrt(norm);
  for (let i = 0; i < 12; i++) t[i] /= norm;
  return t;
}

function buildStates(): ChordState[] {
  const states: ChordState[] = [];
  for (let r = 0; r < 12; r++) {
    states.push({ label: `${PITCH_CLASSES[r]}maj`, template: triadTemplate(r, [0, 4, 7]) });
  }
  for (let r = 0; r < 12; r++) {
    states.push({ label: `${PITCH_CLASSES[r]}min`, template: triadTemplate(r, [0, 3, 7]) });
  }
  states.push({ label: 'N', template: null });
  return states;
}

const STATES = buildStates();
const N_STATE = STATES.length - 1;

const SELF_TRANSITION = 0.88;
const NO_CHORD_EMISSION = 0.4;
const SILENCE_RMS = 1e-4;

export interface ChordFrameResult {
  labels: ChordLabel[];
  scores: Float32Array; // emission score of chosen state per frame
  hopSec: number;
}

/** Viterbi decode over chroma frames. */
export function decodeChords(c: ChromaFrames): ChordFrameResult {
  const nFrames = c.frames.length;
  const nStates = STATES.length;
  if (nFrames === 0) return { labels: [], scores: new Float32Array(0), hopSec: c.hopSec };

  // Emission scores per frame/state.
  const emit = new Float64Array(nFrames * nStates);
  for (let f = 0; f < nFrames; f++) {
    const chroma = c.frames[f];
    const silent = c.rms[f] < SILENCE_RMS;
    for (let s = 0; s < nStates; s++) {
      const tpl = STATES[s].template;
      let score: number;
      if (tpl === null) {
        score = silent ? 0.95 : NO_CHORD_EMISSION;
      } else if (silent) {
        score = 0.01;
      } else {
        let dot = 0;
        for (let p = 0; p < 12; p++) dot += chroma[p] * tpl[p];
        score = dot; // chroma is L2-normalized ⇒ cosine similarity in [0,1]
      }
      emit[f * nStates + s] = Math.log(Math.max(score, 1e-6));
    }
  }

  const logSelf = Math.log(SELF_TRANSITION);
  const logSwitch = Math.log((1 - SELF_TRANSITION) / (nStates - 1));

  const delta = new Float64Array(nStates);
  const deltaNext = new Float64Array(nStates);
  const psi = new Int16Array(nFrames * nStates);

  for (let s = 0; s < nStates; s++) delta[s] = emit[s];

  for (let f = 1; f < nFrames; f++) {
    let bestPrev = 0;
    let bestPrevVal = -Infinity;
    for (let s = 0; s < nStates; s++) {
      if (delta[s] > bestPrevVal) {
        bestPrevVal = delta[s];
        bestPrev = s;
      }
    }
    for (let s = 0; s < nStates; s++) {
      // Best incoming path is either self-transition or the globally best
      // previous state switching in (uniform switch probability).
      const stay = delta[s] + logSelf;
      const sw = bestPrevVal + logSwitch;
      if (stay >= sw) {
        deltaNext[s] = stay + emit[f * nStates + s];
        psi[f * nStates + s] = s;
      } else {
        deltaNext[s] = sw + emit[f * nStates + s];
        psi[f * nStates + s] = bestPrev;
      }
    }
    delta.set(deltaNext);
  }

  let best = 0;
  for (let s = 1; s < nStates; s++) if (delta[s] > delta[best]) best = s;

  const path = new Int16Array(nFrames);
  path[nFrames - 1] = best;
  for (let f = nFrames - 1; f > 0; f--) {
    path[f - 1] = psi[f * nStates + path[f]];
  }

  const labels: ChordLabel[] = new Array(nFrames);
  const scores = new Float32Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    const s = path[f];
    labels[f] = STATES[s].label;
    scores[f] = Math.exp(emit[f * nStates + s]);
  }
  return { labels, scores, hopSec: c.hopSec };
}

/** Collapse per-frame labels into time segments; merge blips shorter than minDurSec. */
export function framesToSegments(
  result: ChordFrameResult,
  minDurSec = 0.25,
): ChordSegment[] {
  const { labels, scores, hopSec } = result;
  if (labels.length === 0) return [];

  const segs: { start: number; end: number; label: ChordLabel; scoreSum: number; n: number }[] = [];
  for (let f = 0; f < labels.length; f++) {
    const last = segs[segs.length - 1];
    if (last && last.label === labels[f]) {
      last.end = (f + 1) * hopSec;
      last.scoreSum += scores[f];
      last.n++;
    } else {
      segs.push({
        start: f * hopSec,
        end: (f + 1) * hopSec,
        label: labels[f],
        scoreSum: scores[f],
        n: 1,
      });
    }
  }

  // Absorb too-short segments into the longer neighbor.
  let changed = true;
  while (changed && segs.length > 1) {
    changed = false;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg.end - seg.start >= minDurSec) continue;
      const prev = segs[i - 1];
      const next = segs[i + 1];
      const target =
        prev && next
          ? (prev.end - prev.start >= next.end - next.start ? prev : next)
          : (prev ?? next);
      if (!target) continue;
      if (target === prev) {
        prev.end = seg.end;
      } else {
        target.start = seg.start;
      }
      target.scoreSum += seg.scoreSum;
      target.n += seg.n;
      segs.splice(i, 1);
      changed = true;
      break;
    }
  }

  // Re-merge adjacent same-label segments created by absorption.
  const merged: typeof segs = [];
  for (const seg of segs) {
    const last = merged[merged.length - 1];
    if (last && last.label === seg.label) {
      last.end = seg.end;
      last.scoreSum += seg.scoreSum;
      last.n += seg.n;
    } else {
      merged.push(seg);
    }
  }

  return merged.map((s) => ({
    start: Number(s.start.toFixed(3)),
    end: Number(s.end.toFixed(3)),
    label: s.label,
    confidence: Math.min(1, s.scoreSum / s.n),
  }));
}

/** Chord label at a given time (for beat-resolution evaluation and tap-to-ask). */
export function chordAt(segments: ChordSegment[], timeSec: number): ChordLabel {
  for (const s of segments) {
    if (timeSec >= s.start && timeSec < s.end) return s.label;
  }
  return 'N';
}
