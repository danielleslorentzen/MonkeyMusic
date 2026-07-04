import type { ChordQuality, PitchClass } from '@lyd/schema';
import { PITCH_CLASSES } from '@lyd/schema';

/** Chord quality → intervals above the root (semitones). */
export const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  add9: [0, 4, 7, 14],
  maj6: [0, 4, 7, 9],
  '7b9': [0, 4, 7, 10, 13],
};

/** Display name: (0,'min') → "Cm", (7,'7b9') → "G7b9". */
export function chordName(root: number, quality: ChordQuality): string {
  const pc = PITCH_CLASSES[((root % 12) + 12) % 12];
  const suffix: Record<ChordQuality, string> = {
    maj: '', min: 'm', dim: 'dim', sus2: 'sus2', sus4: 'sus4',
    maj7: 'maj7', min7: 'm7', '7': '7', add9: 'add9', maj6: '6', '7b9': '7b9',
  };
  return `${pc}${suffix[quality]}`;
}

export function pcIndex(pc: PitchClass): number {
  return PITCH_CLASSES.indexOf(pc);
}

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
export const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];
export const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Deterministic PRNG so spells with `chance` ops are pure given a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
