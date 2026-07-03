import type { NoteEvent } from '@lyd/schema';
import type { PitchFrame } from './pitch';

export interface SegmentOptions {
  /** Frames below this clarity are treated as unvoiced. */
  clarityGate?: number;
  /** Minimum note duration in seconds. */
  minDurSec?: number;
  /** Pitch jump (semitones) that splits into a new note. */
  splitSemitones?: number;
}

function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Turn a pitch track into discrete note events (the melody doodler's core).
 * Free-time by design: events carry real start/duration in seconds;
 * quantization is a later, optional step (TDD §9.1 — snap is an invitation).
 */
export function segmentNotes(track: PitchFrame[], opts: SegmentOptions = {}): NoteEvent[] {
  const clarityGate = opts.clarityGate ?? 0.6;
  const minDurSec = opts.minDurSec ?? 0.09;
  const splitSemitones = opts.splitSemitones ?? 0.65;

  // Voiced midi values with median filter (width 5) to kill octave blips.
  const raw: (number | null)[] = track.map((f) =>
    f.freq !== null && f.clarity >= clarityGate ? freqToMidi(f.freq) : null,
  );
  const midi: (number | null)[] = raw.map((v, i) => {
    if (v === null) return null;
    const windowVals: number[] = [];
    for (let j = Math.max(0, i - 2); j <= Math.min(raw.length - 1, i + 2); j++) {
      const x = raw[j];
      if (x !== null) windowVals.push(x);
    }
    return windowVals.length ? median(windowVals) : v;
  });

  const notes: NoteEvent[] = [];
  let curFrames: number[] = [];
  let curStart = 0;
  let unvoicedRun = 0;

  const flush = (endTime: number) => {
    if (curFrames.length === 0) return;
    const dur = endTime - curStart;
    if (dur >= minDurSec) {
      const m = Math.round(median(curFrames));
      if (m >= 0 && m <= 127) {
        notes.push({
          midi: m,
          start: Number(curStart.toFixed(3)),
          duration: Number(dur.toFixed(3)),
        });
      }
    }
    curFrames = [];
  };

  for (let i = 0; i < track.length; i++) {
    const m = midi[i];
    const t = track[i].time;
    if (m === null) {
      unvoicedRun++;
      if (unvoicedRun >= 2) flush(t);
      continue;
    }
    unvoicedRun = 0;
    if (curFrames.length === 0) {
      curStart = t;
      curFrames.push(m);
    } else if (Math.abs(m - median(curFrames)) > splitSemitones) {
      flush(t);
      curStart = t;
      curFrames = [m];
    } else {
      curFrames.push(m);
    }
  }
  if (track.length > 0) {
    const last = track[track.length - 1];
    flush(last.time + 0.03);
  }

  return notes;
}
