import { z } from 'zod';
import { PITCH_CLASSES } from './pitch';

export { DDL, MIGRATIONS, SCHEMA_VERSION } from './ddl';
export * from './spells';

// ---------------------------------------------------------------------------
// Musical primitives
// ---------------------------------------------------------------------------

export { PITCH_CLASSES } from './pitch';
export type { PitchClass } from './pitch';

/** Chord label: pitch class + quality, or 'N' for no-chord. */
export const ChordLabelSchema = z.string().regex(/^(N|[A-G]#?(maj|min))$/);
export type ChordLabel = z.infer<typeof ChordLabelSchema>;

export const ChordSegmentSchema = z.object({
  start: z.number().nonnegative(), // seconds
  end: z.number().nonnegative(),
  label: ChordLabelSchema,
  confidence: z.number().min(0).max(1),
});
export type ChordSegment = z.infer<typeof ChordSegmentSchema>;

export const KeyEstimateSchema = z.object({
  tonic: z.enum(PITCH_CLASSES),
  mode: z.enum(['major', 'minor']),
  confidence: z.number().min(0).max(1),
});
export type KeyEstimate = z.infer<typeof KeyEstimateSchema>;

export const TempoEstimateSchema = z.object({
  bpm: z.number().positive(),
  confidence: z.number().min(0).max(1),
});
export type TempoEstimate = z.infer<typeof TempoEstimateSchema>;

/** A note event as produced by the melody doodler / pitch tracker. */
export const NoteEventSchema = z.object({
  midi: z.number().int().min(0).max(127),
  start: z.number().nonnegative(), // seconds
  duration: z.number().positive(), // seconds
});
export type NoteEvent = z.infer<typeof NoteEventSchema>;

// ---------------------------------------------------------------------------
// Analysis bundle — what the MIR engine emits and the app stores/displays.
// This is also the future "symbolic bundle" handed to the LLM (P2+).
// ---------------------------------------------------------------------------

export const AnalysisJsonSchema = z.object({
  schemaVersion: z.literal(1),
  engine: z.string(),
  engineVersion: z.string(),
  durationSec: z.number().nonnegative(),
  sampleRate: z.number().positive(),
  key: KeyEstimateSchema,
  tempo: TempoEstimateSchema,
  chords: z.array(ChordSegmentSchema),
  /** Plain-language timbre words (P0: brightness bucket only). */
  timbre: z.object({
    brightness: z.enum(['dark', 'warm', 'bright', 'brilliant']),
    spectralCentroidHz: z.number().nonnegative(),
  }),
});
export type AnalysisJson = z.infer<typeof AnalysisJsonSchema>;

// ---------------------------------------------------------------------------
// Row types mirroring the SQL schema (TDD §5.1)
// ---------------------------------------------------------------------------

export const RecordingRowSchema = z.object({
  id: z.string(),
  created_at: z.number(),
  duration: z.number(),
  file_ref: z.string(),
  mime_type: z.string(),
  title: z.string(),
  notes: z.string(),
});
export type RecordingRow = z.infer<typeof RecordingRowSchema>;

export const AnalysisRowSchema = z.object({
  id: z.string(),
  recording_id: z.string(),
  engine: z.string(),
  version: z.string(),
  created_at: z.number(),
  json: z.string(),
});
export type AnalysisRow = z.infer<typeof AnalysisRowSchema>;

export const ArtifactRowSchema = z.object({
  id: z.string(),
  kind: z.enum(['abc', 'musicxml', 'midi', 'gp', 'pdf']),
  source: z.string(),
  created_at: z.number(),
  title: z.string(),
  blob_ref: z.string(),
  content: z.string(),
  parent_id: z.string().nullable(),
});
export type ArtifactRow = z.infer<typeof ArtifactRowSchema>;

export const ProfileRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['adult', 'kid']),
  emoji: z.string(),
  pin_hash: z.string(),
  created_at: z.number(),
});
export type ProfileRow = z.infer<typeof ProfileRowSchema>;

export const GoalRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  target: z.string(),
  created_at: z.number(),
  status: z.enum(['open', 'done', 'paused', 'dropped']),
});
export type GoalRow = z.infer<typeof GoalRowSchema>;

export const SessionRowSchema = z.object({
  id: z.string(),
  started_at: z.number(),
  duration: z.number(),
  mood: z.string(),
  journal_text: z.string(),
  snapshot_ref: z.string(),
});
export type SessionRow = z.infer<typeof SessionRowSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function newId(prefix: string): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}
