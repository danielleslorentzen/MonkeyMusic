import { z } from 'zod';
import { PITCH_CLASSES } from './pitch';

/**
 * Spell System schema v1 (TDD §4.5).
 *
 * Spells are small, declarative, human-readable recipes over a CLOSED op
 * vocabulary — no eval, no I/O, no network. Ops are additive-only across
 * versions; unknown ops fail closed (a friendly "fizzle").
 */

export const SPELL_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// The musical material spells operate on
// ---------------------------------------------------------------------------

export const CHORD_QUALITIES = [
  'maj', 'min', 'dim', 'sus2', 'sus4',
  'maj7', 'min7', '7', 'add9', 'maj6', '7b9',
] as const;
export type ChordQuality = (typeof CHORD_QUALITIES)[number];

export const TuneChordSchema = z.object({
  /** Root pitch class, 0–11 (C=0). */
  root: z.number().int().min(0).max(11),
  quality: z.enum(CHORD_QUALITIES),
  /** Duration in beats. */
  beats: z.number().positive(),
});
export type TuneChord = z.infer<typeof TuneChordSchema>;

export const TuneNoteSchema = z.object({
  midi: z.number().int().min(0).max(127),
  startBeat: z.number().nonnegative(),
  beats: z.number().positive(),
});
export type TuneNote = z.infer<typeof TuneNoteSchema>;

/** A piece of musical material: a progression, a melody, or both. */
export const TuneSchema = z.object({
  key: z.object({
    tonic: z.enum(PITCH_CLASSES),
    mode: z.enum(['major', 'minor']),
  }),
  bpm: z.number().positive(),
  chords: z.array(TuneChordSchema).default([]),
  melody: z.array(TuneNoteSchema).default([]),
  /** Optional sustained bass pitch class (drone), if a spell added one. */
  drone: z.number().int().min(0).max(11).nullish(),
  /** Swing amount 0–1 applied at playback. */
  swing: z.number().min(0).max(1).default(0),
});
export type Tune = z.infer<typeof TuneSchema>;

// ---------------------------------------------------------------------------
// Ops — the closed vocabulary. Additive-only; never remove, only deprecate.
// ---------------------------------------------------------------------------

const where = z.enum(['all', 'dominant', 'tonic', 'last']).default('all');

export const SpellOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('mode_swap'), to: z.enum(['parallel_minor', 'parallel_major']) }),
  z.object({ op: z.literal('transpose'), semitones: z.number().int().min(-24).max(24) }),
  z.object({ op: z.literal('tempo_scale'), factor: z.number().min(0.25).max(4) }),
  z.object({
    op: z.literal('chord_color'),
    add: z.enum(['7', 'maj7', 'add9', 'b9', 'maj6']),
    where,
    chance: z.number().min(0).max(1).default(1),
  }),
  z.object({
    op: z.literal('quality_paint'),
    to: z.enum(['maj', 'min', 'sus2', 'sus4']),
    where,
  }),
  z.object({ op: z.literal('melody_invert') }),
  z.object({ op: z.literal('melody_retrograde') }),
  z.object({ op: z.literal('reverse_progression') }),
  z.object({ op: z.literal('octave_shift'), octaves: z.number().int().min(-3).max(3) }),
  z.object({ op: z.literal('rhythm_scale'), factor: z.union([z.literal(0.5), z.literal(2)]) }),
  z.object({ op: z.literal('stutter'), times: z.number().int().min(2).max(4) }),
  z.object({ op: z.literal('swing'), amount: z.number().min(0).max(1) }),
  z.object({ op: z.literal('drone'), degree: z.union([z.literal(1), z.literal(5)]) }),
  z.object({ op: z.literal('pentatonify') }),
  z.object({ op: z.literal('blue_notes'), chance: z.number().min(0).max(1).default(0.5) }),
]);
export type SpellOp = z.infer<typeof SpellOpSchema>;

/** Every op id the engine understands (used by the Scribe editor palette). */
export const SPELL_OP_IDS = [
  'mode_swap', 'transpose', 'tempo_scale', 'chord_color', 'quality_paint',
  'melody_invert', 'melody_retrograde', 'reverse_progression', 'octave_shift',
  'rhythm_scale', 'stutter', 'swing', 'drone', 'pentatonify', 'blue_notes',
] as const;

// ---------------------------------------------------------------------------
// The spell itself
// ---------------------------------------------------------------------------

export const SpellSchema = z.object({
  id: z.string().min(1),
  schema_version: z.literal(SPELL_SCHEMA_VERSION),
  name: z.string().min(1),
  flavor: z.string(),
  emoji: z.string().min(1),
  input: z.array(z.enum(['progression', 'melody'])).min(1),
  ops: z.array(SpellOpSchema).min(1).max(8),
  reveal: z.object({
    concepts: z.array(z.string()),
    one_liner: z.string(),
  }),
  origin: z.enum(['bundled', 'user', 'llm']),
  safety: z.literal('pure'),
  /** Sealed until this Phrasebook concept has been encountered (bundled only). */
  sealed_until_concept: z.string().nullish(),
});
export type Spell = z.infer<typeof SpellSchema>;

// ---------------------------------------------------------------------------
// Phrasebook concept cards (P1 — human-reviewed static content)
// ---------------------------------------------------------------------------

export const ConceptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** The feeling, first — before any vocabulary. */
  feeling: z.string().min(1),
  /** Plain-language description anchored in experience. */
  description: z.string().min(1),
  /** "Where you've heard this" — a pop-culture / everyday anchor. */
  heard: z.string().min(1),
  /** A "try it" prompt — something to do, not memorize. */
  try: z.string().min(1),
  /** Bundled ABC sound example (single voice; may contain [chord] groups). */
  abc: z.string().min(1),
  tags: z.array(z.string()).default([]),
});
export type Concept = z.infer<typeof ConceptSchema>;
