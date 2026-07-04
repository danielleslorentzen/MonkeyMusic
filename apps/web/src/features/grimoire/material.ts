import type { AnalysisJson, Tune, TuneChord } from '@lyd/schema';
import { PITCH_CLASSES } from '@lyd/schema';
import { abcToNotes } from '@lyd/notation';
import { estimateKey } from '@lyd/mir';

/**
 * Converts P0 artifacts (doodles, analyzed recordings) into spell-castable
 * Tunes — the loop that makes the user's OWN music the spell ingredient.
 */

export function doodleToTune(abc: string): Tune | null {
  const notes = abcToNotes(abc);
  if (notes.length === 0) return null;
  const bpmMatch = abc.match(/Q:1\/4=(\d+)/);
  const bpm = bpmMatch ? Number(bpmMatch[1]) : 100;
  const beatSec = 60 / bpm;

  // Key from a duration-weighted pitch-class histogram.
  const histogram = new Float64Array(12);
  for (const n of notes) histogram[n.midi % 12] += n.duration;
  const key = estimateKey(histogram);

  return {
    key: { tonic: key.tonic, mode: key.mode },
    bpm,
    chords: [],
    melody: notes.map((n) => ({
      midi: n.midi,
      startBeat: Number((n.start / beatSec).toFixed(3)),
      beats: Number(Math.max(0.25, n.duration / beatSec).toFixed(3)),
    })),
    drone: null,
    swing: 0,
  };
}

export function analysisToTune(analysis: AnalysisJson): Tune | null {
  const bpm = analysis.tempo.bpm > 0 ? Math.round(analysis.tempo.bpm) : 100;
  const beatSec = 60 / bpm;
  const chords: TuneChord[] = [];
  for (const seg of analysis.chords) {
    const m = seg.label.match(/^([A-G]#?)(maj|min)$/);
    if (!m) continue; // skip N segments
    const root = PITCH_CLASSES.indexOf(m[1] as (typeof PITCH_CLASSES)[number]);
    const beats = Math.max(1, Math.round((seg.end - seg.start) / beatSec));
    chords.push({ root, quality: m[2] as 'maj' | 'min', beats });
  }
  if (chords.length === 0) return null;
  return {
    key: { tonic: analysis.key.tonic, mode: analysis.key.mode },
    bpm,
    chords,
    melody: [],
    drone: null,
    swing: 0,
  };
}
