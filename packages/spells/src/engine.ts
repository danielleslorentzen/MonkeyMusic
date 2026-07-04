import type { ChordQuality, Spell, SpellOp, Tune, TuneChord } from '@lyd/schema';
import { PITCH_CLASSES, SpellSchema, TuneSchema } from '@lyd/schema';
import {
  MAJOR_PENTATONIC, MAJOR_SCALE, MINOR_PENTATONIC, NATURAL_MINOR_SCALE,
  mod12, mulberry32, pcIndex,
} from './theory';

/**
 * The spell interpreter (TDD §4.5). Spells are PURE: same spell + same tune
 * + same seed → same result. Ops are a closed vocabulary; anything the
 * engine doesn't recognize fails closed with a SpellFizzle.
 */

export class SpellFizzle extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpellFizzle';
  }
}

function clampMidi(m: number): number {
  return Math.max(12, Math.min(115, m));
}

// ---- mode swap -------------------------------------------------------------

/**
 * Degree-wise chord translation between parallel major/minor.
 * Index = major scale degree of the chord root (0-based); value = [newOffset, quality mapper].
 */
function swapChordToMinor(offset: number, quality: ChordQuality): { offset: number; quality: ChordQuality } {
  const deg = MAJOR_SCALE.indexOf(offset);
  if (deg === -1) return { offset, quality }; // chromatic root: leave alone
  switch (deg) {
    case 0: return { offset: 0, quality: quality === 'maj' ? 'min' : quality };   // I → i
    case 1: return { offset: 2, quality };                                        // ii stays
    case 2: return { offset: 3, quality: 'maj' };                                 // iii → bIII
    case 3: return { offset: 5, quality: quality === 'maj' ? 'min' : quality };   // IV → iv
    case 4: return { offset: 7, quality };                                        // V stays (harmonic pull)
    case 5: return { offset: 8, quality: 'maj' };                                 // vi → bVI
    default: return { offset: 10, quality: 'maj' };                               // vii° → bVII
  }
}

function swapChordToMajor(offset: number, quality: ChordQuality): { offset: number; quality: ChordQuality } {
  const deg = NATURAL_MINOR_SCALE.indexOf(offset);
  if (deg === -1) return { offset, quality };
  switch (deg) {
    case 0: return { offset: 0, quality: quality === 'min' ? 'maj' : quality };   // i → I
    case 1: return { offset: 2, quality };                                        // ii stays
    case 2: return { offset: 4, quality: 'min' };                                 // bIII → iii
    case 3: return { offset: 5, quality: quality === 'min' ? 'maj' : quality };   // iv → IV
    case 4: return { offset: 7, quality: 'maj' };                                 // v/V → V
    case 5: return { offset: 9, quality: 'min' };                                 // bVI → vi
    default: return { offset: 11, quality: 'dim' };                               // bVII → vii°
  }
}

function modeSwap(tune: Tune, to: 'parallel_minor' | 'parallel_major'): Tune {
  const tonic = pcIndex(tune.key.tonic);
  const goingMinor = to === 'parallel_minor';
  if (goingMinor && tune.key.mode === 'minor') return tune;
  if (!goingMinor && tune.key.mode === 'major') return tune;

  const chords = tune.chords.map((c) => {
    const offset = mod12(c.root - tonic);
    const swapped = goingMinor ? swapChordToMinor(offset, c.quality) : swapChordToMajor(offset, c.quality);
    return { ...c, root: mod12(tonic + swapped.offset), quality: swapped.quality };
  });

  // Melody: move scale degrees 3/6/7 down (→minor) or ^3/^6/^7 up (→major).
  const lowered = new Set(goingMinor ? [4, 9, 11] : []);
  const raised = new Set(goingMinor ? [] : [3, 8, 10]);
  const melody = tune.melody.map((n) => {
    const off = mod12(n.midi - tonic);
    if (lowered.has(off)) return { ...n, midi: clampMidi(n.midi - 1) };
    if (raised.has(off)) return { ...n, midi: clampMidi(n.midi + 1) };
    return n;
  });

  return {
    ...tune,
    key: { ...tune.key, mode: goingMinor ? 'minor' : 'major' },
    chords,
    melody,
  };
}

// ---- chord colouring --------------------------------------------------------

function matchesWhere(
  c: TuneChord, i: number, tune: Tune, where: 'all' | 'dominant' | 'tonic' | 'last',
): boolean {
  const tonic = pcIndex(tune.key.tonic);
  switch (where) {
    case 'all': return true;
    case 'dominant': return mod12(c.root - tonic) === 7;
    case 'tonic': return mod12(c.root - tonic) === 0;
    case 'last': return i === tune.chords.length - 1;
  }
}

const COLOR_MAP: Record<string, Partial<Record<ChordQuality, ChordQuality>>> = {
  '7': { maj: '7', min: 'min7', sus4: '7' },
  maj7: { maj: 'maj7', min: 'min7' },
  add9: { maj: 'add9', sus2: 'add9' },
  b9: { maj: '7b9', '7': '7b9' },
  maj6: { maj: 'maj6' },
};

// ---- pentatonic / blue notes -------------------------------------------------

function snapToSet(midi: number, tonic: number, set: number[]): number {
  for (let d = 0; d <= 6; d++) {
    // Prefer moving down on ties — melodies sag more gracefully than they leap.
    if (set.includes(mod12(midi - d - tonic))) return clampMidi(midi - d);
    if (set.includes(mod12(midi + d - tonic))) return clampMidi(midi + d);
  }
  return midi;
}

// ---- the interpreter ----------------------------------------------------------

function applyOp(tune: Tune, op: SpellOp, rand: () => number): Tune {
  switch (op.op) {
    case 'mode_swap':
      return modeSwap(tune, op.to);

    case 'transpose': {
      const tonic = mod12(pcIndex(tune.key.tonic) + op.semitones);
      return {
        ...tune,
        key: { ...tune.key, tonic: PITCH_CLASSES[tonic] },
        chords: tune.chords.map((c) => ({ ...c, root: mod12(c.root + op.semitones) })),
        melody: tune.melody.map((n) => ({ ...n, midi: clampMidi(n.midi + op.semitones) })),
        drone: tune.drone == null ? tune.drone : mod12(tune.drone + op.semitones),
      };
    }

    case 'tempo_scale':
      return { ...tune, bpm: Math.max(30, Math.min(280, Math.round(tune.bpm * op.factor))) };

    case 'chord_color': {
      const map = COLOR_MAP[op.add];
      return {
        ...tune,
        chords: tune.chords.map((c, i) => {
          if (!matchesWhere(c, i, tune, op.where)) return c;
          if (rand() > op.chance) return c;
          const to = map[c.quality];
          return to ? { ...c, quality: to } : c;
        }),
      };
    }

    case 'quality_paint':
      return {
        ...tune,
        chords: tune.chords.map((c, i) =>
          matchesWhere(c, i, tune, op.where) ? { ...c, quality: op.to } : c,
        ),
      };

    case 'melody_invert': {
      if (tune.melody.length === 0) return tune;
      const pivot = tune.melody[0].midi;
      return {
        ...tune,
        melody: tune.melody.map((n) => ({ ...n, midi: clampMidi(2 * pivot - n.midi) })),
      };
    }

    case 'melody_retrograde': {
      if (tune.melody.length === 0) return tune;
      const total = Math.max(...tune.melody.map((n) => n.startBeat + n.beats));
      return {
        ...tune,
        melody: tune.melody
          .map((n) => ({ ...n, startBeat: Number((total - n.startBeat - n.beats).toFixed(4)) }))
          .sort((a, b) => a.startBeat - b.startBeat),
      };
    }

    case 'reverse_progression':
      return { ...tune, chords: [...tune.chords].reverse() };

    case 'octave_shift':
      return {
        ...tune,
        melody: tune.melody.map((n) => ({ ...n, midi: clampMidi(n.midi + 12 * op.octaves) })),
      };

    case 'rhythm_scale':
      return {
        ...tune,
        chords: tune.chords.map((c) => ({ ...c, beats: c.beats * op.factor })),
        melody: tune.melody.map((n) => ({
          ...n,
          startBeat: n.startBeat * op.factor,
          beats: n.beats * op.factor,
        })),
      };

    case 'stutter':
      return {
        ...tune,
        melody: tune.melody.flatMap((n) => {
          const slice = n.beats / op.times;
          return Array.from({ length: op.times }, (_, k) => ({
            midi: n.midi,
            startBeat: Number((n.startBeat + k * slice).toFixed(4)),
            beats: Number(slice.toFixed(4)),
          }));
        }),
      };

    case 'swing':
      return { ...tune, swing: op.amount };

    case 'drone': {
      const tonic = pcIndex(tune.key.tonic);
      return { ...tune, drone: op.degree === 1 ? tonic : mod12(tonic + 7) };
    }

    case 'pentatonify': {
      const tonic = pcIndex(tune.key.tonic);
      const set = tune.key.mode === 'major' ? MAJOR_PENTATONIC : MINOR_PENTATONIC;
      return {
        ...tune,
        melody: tune.melody.map((n) => ({ ...n, midi: snapToSet(n.midi, tonic, set) })),
      };
    }

    case 'blue_notes': {
      const tonic = pcIndex(tune.key.tonic);
      return {
        ...tune,
        melody: tune.melody.map((n) => {
          if (mod12(n.midi - tonic) === 4 && rand() <= op.chance) {
            return { ...n, midi: clampMidi(n.midi - 1) }; // ♮3 → ♭3
          }
          return n;
        }),
      };
    }

    default: {
      // A validated Spell can't reach here, but imported/foreign spell JSON can.
      const unknown = (op as { op?: string }).op ?? '???';
      throw new SpellFizzle(`unknown op: ${unknown}`);
    }
  }
}

/**
 * Cast a spell. Pure and deterministic for a given seed. Throws SpellFizzle
 * if the spell (or its ops) is not something this engine understands.
 */
export function castSpell(spell: Spell, tune: Tune, seed = 0): Tune {
  const parsedSpell = SpellSchema.safeParse(spell);
  if (!parsedSpell.success) {
    throw new SpellFizzle(`spell did not validate: ${parsedSpell.error.issues[0]?.message}`);
  }
  const parsedTune = TuneSchema.safeParse(tune);
  if (!parsedTune.success) {
    throw new SpellFizzle(`tune did not validate: ${parsedTune.error.issues[0]?.message}`);
  }
  const rand = mulberry32(seed + 0x5f3759d);
  let result = parsedTune.data;
  for (const op of parsedSpell.data.ops) {
    result = applyOp(result, op, rand);
  }
  return result;
}

/** Chain several spells (a "ritual"), left to right. */
export function castChain(spells: Spell[], tune: Tune, seed = 0): Tune {
  return spells.reduce((t, s, i) => castSpell(s, t, seed + i), tune);
}
