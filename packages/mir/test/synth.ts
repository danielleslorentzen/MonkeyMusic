/**
 * Ground-truth song synthesizer for the CI accuracy gate (TDD §9.1).
 * Chords are rendered as sine partials with per-beat amplitude envelopes
 * plus a click at each beat so tempo estimation has real onsets.
 */

import type { ChordLabel } from '@lyd/schema';
import { PITCH_CLASSES } from '@lyd/schema';

export interface SongSpec {
  name: string;
  bpm: number;
  beatsPerBar: number;
  /** One chord label per bar, e.g. 'Cmaj', 'Amin'. Repeated via `repeats`. */
  bars: ChordLabel[];
  repeats: number;
  key: { tonic: (typeof PITCH_CLASSES)[number]; mode: 'major' | 'minor' };
}

const PC_INDEX = new Map(PITCH_CLASSES.map((pc, i) => [pc as string, i]));

export function chordToMidiNotes(label: ChordLabel): number[] {
  if (label === 'N') return [];
  const m = label.match(/^([A-G]#?)(maj|min)$/);
  if (!m) throw new Error(`bad chord label: ${label}`);
  const root = PC_INDEX.get(m[1])!;
  const third = m[2] === 'maj' ? 4 : 3;
  const base = 48 + root; // root around C3
  return [base - 12, base, base + third, base + 7, base + 12]; // bass, root, 3rd, 5th, octave
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Deterministic PRNG so the gate is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function synthesizeSong(spec: SongSpec, sampleRate = 22050): Float32Array {
  const rand = mulberry32(1234);
  const beatSec = 60 / spec.bpm;
  const barSec = beatSec * spec.beatsPerBar;
  const bars: ChordLabel[] = [];
  for (let r = 0; r < spec.repeats; r++) bars.push(...spec.bars);

  const totalSec = bars.length * barSec + 0.5;
  const out = new Float32Array(Math.ceil(totalSec * sampleRate));

  for (let barIdx = 0; barIdx < bars.length; barIdx++) {
    const label = bars[barIdx];
    const notes = chordToMidiNotes(label);
    const barStart = barIdx * barSec;

    // Chord tones sustain the whole bar with a fresh pluck each beat.
    for (const midi of notes) {
      const f = midiToFreq(midi) * (1 + (rand() - 0.5) * 0.002); // slight detune
      const phase = rand() * 2 * Math.PI;
      for (let beat = 0; beat < spec.beatsPerBar; beat++) {
        const t0 = barStart + beat * beatSec;
        const n0 = Math.floor(t0 * sampleRate);
        const nLen = Math.floor(beatSec * sampleRate);
        for (let i = 0; i < nLen && n0 + i < out.length; i++) {
          const t = i / sampleRate;
          // Pluck envelope: fast attack, exponential decay to a sustain floor.
          const envelope = Math.min(1, t / 0.008) * (0.25 + 0.75 * Math.exp(-t / 0.35));
          const s =
            Math.sin(2 * Math.PI * f * (t0 + t) + phase) +
            0.4 * Math.sin(2 * Math.PI * 2 * f * (t0 + t) + phase * 1.7);
          out[n0 + i] += 0.06 * envelope * s;
        }
      }
    }

    // Percussive click at every beat (broadband, for onset detection).
    for (let beat = 0; beat < spec.beatsPerBar; beat++) {
      const n0 = Math.floor((barStart + beat * beatSec) * sampleRate);
      const clickLen = Math.floor(0.006 * sampleRate);
      const amp = beat === 0 ? 0.35 : 0.22;
      for (let i = 0; i < clickLen && n0 + i < out.length; i++) {
        out[n0 + i] += amp * (rand() * 2 - 1) * (1 - i / clickLen);
      }
    }
  }

  // Gentle limiter.
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.tanh(out[i]);
  }
  return out;
}

/** The 8-song ground-truth set: varied keys, modes, tempi, one waltz. */
export const GROUND_TRUTH: SongSpec[] = [
  {
    name: 'Sunny Porch (C major, 120)',
    bpm: 120, beatsPerBar: 4, repeats: 4,
    bars: ['Cmaj', 'Gmaj', 'Amin', 'Fmaj'],
    key: { tonic: 'C', mode: 'major' },
  },
  {
    name: 'Campfire (G major, 96)',
    bpm: 96, beatsPerBar: 4, repeats: 4,
    bars: ['Gmaj', 'Dmaj', 'Emin', 'Cmaj'],
    key: { tonic: 'G', mode: 'major' },
  },
  {
    name: 'Night Bus (A minor, 140)',
    bpm: 140, beatsPerBar: 4, repeats: 4,
    bars: ['Amin', 'Fmaj', 'Emaj', 'Amin'],
    key: { tonic: 'A', mode: 'minor' },
  },
  {
    name: 'Slow Fog (E minor, 76)',
    bpm: 76, beatsPerBar: 4, repeats: 3,
    bars: ['Emin', 'Amin', 'Bmaj', 'Emin'],
    key: { tonic: 'E', mode: 'minor' },
  },
  {
    name: 'Kite Day (D major, 132)',
    bpm: 132, beatsPerBar: 4, repeats: 4,
    bars: ['Dmaj', 'Amaj', 'Bmin', 'Gmaj'],
    key: { tonic: 'D', mode: 'major' },
  },
  {
    name: 'Soft Shoes (F major, 88)',
    bpm: 88, beatsPerBar: 4, repeats: 3,
    bars: ['Fmaj', 'A#maj', 'Cmaj', 'Fmaj'],
    key: { tonic: 'F', mode: 'major' },
  },
  {
    name: 'Waltz for a Robot (B minor, 100, 3/4)',
    bpm: 100, beatsPerBar: 3, repeats: 5,
    bars: ['Bmin', 'Emin', 'F#maj', 'Bmin'],
    key: { tonic: 'B', mode: 'minor' },
  },
  {
    name: 'Brass Morning (D# major, 112)',
    bpm: 112, beatsPerBar: 4, repeats: 4,
    bars: ['D#maj', 'G#maj', 'A#maj', 'Cmin'],
    key: { tonic: 'D#', mode: 'major' },
  },
];

/** Expected chord label at a given second, from the spec. */
export function expectedChordAt(spec: SongSpec, timeSec: number): ChordLabel {
  const beatSec = 60 / spec.bpm;
  const barSec = beatSec * spec.beatsPerBar;
  const bars: ChordLabel[] = [];
  for (let r = 0; r < spec.repeats; r++) bars.push(...spec.bars);
  const barIdx = Math.floor(timeSec / barSec);
  if (barIdx < 0 || barIdx >= bars.length) return 'N';
  return bars[barIdx];
}

export function songDurationSec(spec: SongSpec): number {
  return (60 / spec.bpm) * spec.beatsPerBar * spec.bars.length * spec.repeats;
}
