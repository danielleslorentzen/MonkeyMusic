import type { NoteEvent, Tune } from '@lyd/schema';
import { QUALITY_INTERVALS, chordName } from './theory';

/**
 * Render a Tune to plain NoteEvents (seconds) for the app's oscillator synth.
 * Chords voice as block triads around C3–C4; drone sits an octave below;
 * swing delays melody notes that fall on off-beat eighths.
 */
export function tuneToNoteEvents(tune: Tune): NoteEvent[] {
  const beatSec = 60 / tune.bpm;
  const events: NoteEvent[] = [];

  let cursorBeat = 0;
  for (const chord of tune.chords) {
    const start = cursorBeat * beatSec;
    const dur = Math.max(0.15, chord.beats * beatSec - 0.05);
    for (const iv of QUALITY_INTERVALS[chord.quality]) {
      events.push({ midi: 48 + ((chord.root + iv) % 24), start, duration: dur });
    }
    cursorBeat += chord.beats;
  }
  const chordEndBeat = cursorBeat;

  for (const n of tune.melody) {
    let startBeat = n.startBeat;
    if (tune.swing > 0) {
      // Off-beat eighths slide from the midpoint toward the triplet point.
      const withinBeat = startBeat % 1;
      if (Math.abs(withinBeat - 0.5) < 1e-3) {
        startBeat = Math.floor(startBeat) + 0.5 + (2 / 3 - 0.5) * tune.swing;
      }
    }
    events.push({
      midi: n.midi,
      start: startBeat * beatSec,
      duration: Math.max(0.1, n.beats * beatSec - 0.02),
    });
  }

  if (tune.drone != null) {
    const endBeat = Math.max(
      chordEndBeat,
      ...tune.melody.map((n) => n.startBeat + n.beats),
      4,
    );
    events.push({ midi: 36 + tune.drone, start: 0, duration: endBeat * beatSec });
  }

  return events.sort((a, b) => a.start - b.start);
}

/** Chord symbols in order, for display and diffing ("C → Am → F"). */
export function tuneChordNames(tune: Tune): string[] {
  return tune.chords.map((c) => chordName(c.root, c.quality));
}

/** Total length in seconds (for progress UI). */
export function tuneDurationSec(tune: Tune): number {
  const beatSec = 60 / tune.bpm;
  const chordBeats = tune.chords.reduce((s, c) => s + c.beats, 0);
  const melodyBeats = tune.melody.length
    ? Math.max(...tune.melody.map((n) => n.startBeat + n.beats))
    : 0;
  return Math.max(chordBeats, melodyBeats) * beatSec;
}
