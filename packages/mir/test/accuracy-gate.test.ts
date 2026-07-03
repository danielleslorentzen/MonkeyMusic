/**
 * P0 accuracy gate (TDD §9.1):
 *   - ≥70% chord-symbol accuracy at beat resolution across the set
 *   - key correct on ≥6/8 songs
 *   - tempo within ±2 BPM
 * Below the gate: tune HMM smoothing before shipping.
 */

import { describe, expect, it } from 'vitest';
import { analyzeRecording, chordAt } from '../src';
import { GROUND_TRUTH, expectedChordAt, songDurationSec, synthesizeSong } from './synth';

const SR = 22050;

interface SongResult {
  name: string;
  chordAccuracy: number;
  keyCorrect: boolean;
  bpmError: number;
}

function evaluateAll(): SongResult[] {
  return GROUND_TRUTH.map((spec) => {
    const pcm = synthesizeSong(spec, SR);
    const analysis = analyzeRecording(pcm, SR);

    // Beat-resolution chord accuracy: sample at each beat center.
    const beatSec = 60 / spec.bpm;
    const dur = songDurationSec(spec);
    let hits = 0;
    let total = 0;
    for (let t = beatSec / 2; t < dur; t += beatSec) {
      total++;
      if (chordAt(analysis.chords, t) === expectedChordAt(spec, t)) hits++;
    }

    const keyCorrect =
      analysis.key.tonic === spec.key.tonic && analysis.key.mode === spec.key.mode;

    return {
      name: spec.name,
      chordAccuracy: hits / total,
      keyCorrect,
      bpmError: Math.abs(analysis.tempo.bpm - spec.bpm),
    };
  });
}

describe('P0 accuracy gate (8-song ground-truth set)', () => {
  const results = evaluateAll();

  it('reports per-song metrics', () => {
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(
        `${r.name}: chords ${(r.chordAccuracy * 100).toFixed(1)}%, ` +
          `key ${r.keyCorrect ? 'OK' : 'MISS'}, bpm err ${r.bpmError.toFixed(2)}`,
      );
    }
    expect(results).toHaveLength(8);
  });

  it('chord-symbol accuracy at beat resolution is ≥70% on the set', () => {
    const mean = results.reduce((s, r) => s + r.chordAccuracy, 0) / results.length;
    expect(mean).toBeGreaterThanOrEqual(0.7);
  });

  it('key is correct on ≥6/8 songs', () => {
    const correct = results.filter((r) => r.keyCorrect).length;
    expect(correct).toBeGreaterThanOrEqual(6);
  });

  it('tempo is within ±2 BPM on every song', () => {
    for (const r of results) {
      expect(r.bpmError, r.name).toBeLessThanOrEqual(2);
    }
  });
});
