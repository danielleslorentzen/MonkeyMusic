import type { ChordSegment, NoteEvent } from '@lyd/schema';

/**
 * ABC notation generation for the melody doodler and chord charts.
 * ABC is P0's only notation format (TDD §9.1) and renders via abcjs.
 */

// Sharps-canonical spelling; base letter + accidental per pitch class.
const PC_LETTER = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'] as const;
const PC_SHARP = [false, true, false, true, false, false, true, false, true, false, true, false] as const;

/**
 * ABC pitch for a midi note: C4 (60) = "C", C5 (72) = "c", with , and '
 * octave marks. Accidental handling is done by AccidentalTracker.
 */
function midiToAbcParts(midi: number): { letter: string; sharp: boolean; octaveMark: string; pcOct: string } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1; // midi 60 → octave 4
  const letter = PC_LETTER[pc];
  const sharp = PC_SHARP[pc];

  let octaveMark = '';
  let base: string = letter;
  if (octave >= 5) {
    base = letter.toLowerCase();
    octaveMark = "'".repeat(octave - 5);
  } else {
    octaveMark = ','.repeat(4 - octave);
  }
  return { letter: base, sharp, octaveMark, pcOct: `${letter}${octave}` };
}

/**
 * Tracks accidental state so we emit ^/= only when the effective state changes.
 * In barred (snap) mode, call resetBar() at each barline; in free-time mode
 * (no barlines) state persists for the whole tune, which matches ABC semantics.
 */
export class AccidentalTracker {
  private state = new Map<string, boolean>(); // pcOct → currently sharpened

  resetBar(): void {
    this.state.clear();
  }

  /** Returns the accidental prefix to emit for this note ('' | '^' | '='). */
  prefixFor(midi: number): string {
    const { sharp, pcOct } = midiToAbcParts(midi);
    const current = this.state.get(pcOct) ?? false;
    if (sharp === current) return '';
    this.state.set(pcOct, sharp);
    return sharp ? '^' : '=';
  }
}

export function midiToAbcNote(midi: number, tracker?: AccidentalTracker): string {
  const { letter, sharp, octaveMark } = midiToAbcParts(midi);
  const prefix = tracker ? tracker.prefixFor(midi) : sharp ? '^' : '';
  return `${prefix}${letter}${octaveMark}`;
}

export interface MelodyAbcOptions {
  title?: string;
  /** Tempo used to size note durations. Doodles default to 100. */
  bpm?: number;
  /** Snap to a 16th-note grid with 4/4 barlines. Off = free-time (M:none). */
  snap?: boolean;
}

/**
 * Render doodler note events as an ABC tune.
 *
 * Free-time mode (default): durations are proportional (16th-note base unit),
 * no meter, no barlines — a transcript of what was hummed, not a correction.
 * Snap mode: starts and durations quantize to the 16th grid in 4/4.
 */
export function melodyToAbc(notes: NoteEvent[], opts: MelodyAbcOptions = {}): string {
  const bpm = opts.bpm ?? 100;
  const title = opts.title ?? 'Doodle';
  const snap = opts.snap ?? false;
  const unitSec = 60 / bpm / 4; // one 16th note

  const header = [
    'X:1',
    `T:${title}`,
    snap ? 'M:4/4' : 'M:none',
    'L:1/16',
    `Q:1/4=${bpm}`,
    'K:C',
  ].join('\n');

  if (notes.length === 0) return `${header}\nz16 |]`;

  const tracker = new AccidentalTracker();
  const tokens: string[] = [];

  if (!snap) {
    // Free time: proportional durations, rests for gaps, no barlines.
    let cursor = notes[0].start;
    for (const n of notes) {
      const gap = Math.round((n.start - cursor) / unitSec);
      if (gap >= 1) tokens.push(`z${gap > 1 ? gap : ''}`);
      const dur = Math.max(1, Math.min(64, Math.round(n.duration / unitSec)));
      tokens.push(`${midiToAbcNote(n.midi, tracker)}${dur > 1 ? dur : ''}`);
      cursor = n.start + n.duration;
    }
    return `${header}\n${tokens.join(' ')} |]`;
  }

  // Snap mode: quantize to the 16th grid, emit 4/4 bars (16 units per bar).
  const UNITS_PER_BAR = 16;
  interface GridNote { startU: number; durU: number; midi: number }
  const grid: GridNote[] = [];
  const t0 = notes[0].start;
  for (const n of notes) {
    const startU = Math.round((n.start - t0) / unitSec);
    const durU = Math.max(1, Math.round(n.duration / unitSec));
    const last = grid[grid.length - 1];
    const clampedStart = last ? Math.max(startU, last.startU + last.durU) : startU;
    grid.push({ startU: clampedStart, durU, midi: n.midi });
  }

  let cursorU = 0;
  let barFill = 0;
  const emit = (tok: string, units: number) => {
    tokens.push(tok);
    barFill += units;
    cursorU += units;
    while (barFill >= UNITS_PER_BAR) {
      barFill -= UNITS_PER_BAR;
      tokens.push('|');
      tracker.resetBar();
    }
  };
  // Emit a duration split across barlines so bars stay exactly full.
  const emitSplit = (makeTok: (u: number) => string, units: number) => {
    let remaining = units;
    while (remaining > 0) {
      const room = UNITS_PER_BAR - barFill;
      const chunk = Math.min(remaining, room);
      emit(makeTok(chunk), chunk);
      remaining -= chunk;
    }
  };

  for (const g of grid) {
    const gapU = g.startU - cursorU;
    if (gapU > 0) emitSplit((u) => `z${u > 1 ? u : ''}`, gapU);
    // Ties across barlines would be nicer; P0 splits without tie for simplicity.
    emitSplit((u) => `${midiToAbcNote(g.midi, tracker)}${u > 1 ? u : ''}`, g.durU);
  }
  if (tokens[tokens.length - 1] !== '|') tokens.push('|]');
  else tokens[tokens.length - 1] = '|]';

  return `${header}\n${tokens.join(' ')}`;
}

// Natural-letter → pitch-class semitone.
const LETTER_SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/**
 * Parse one ABC note token (no duration suffix) to midi, tracking accidental
 * carry within the bar. Returns null if the token isn't a note.
 */
function parseAbcNote(tok: string, accidentals: Map<string, number>): number | null {
  const m = tok.match(/^(\^|=|_)?([A-Ga-g])([,']*)$/);
  if (!m) return null;
  const [, accidental, letterRaw, octaveMarks] = m;
  const upper = letterRaw >= 'A' && letterRaw <= 'G';
  const letter = letterRaw.toUpperCase();
  const baseOctave = upper ? 4 : 5;
  const downs = (octaveMarks.match(/,/g) ?? []).length;
  const ups = (octaveMarks.match(/'/g) ?? []).length;
  const octave = baseOctave - downs + ups;
  const key = `${letter}${octave}`;

  let alter: number;
  if (accidental === '^') alter = 1;
  else if (accidental === '_') alter = -1;
  else if (accidental === '=') alter = 0;
  else alter = accidentals.get(key) ?? 0;
  if (accidental) accidentals.set(key, alter);

  return (octave + 1) * 12 + LETTER_SEMITONE[letter] + alter;
}

/**
 * Parse ABC produced by {@link melodyToAbc} back into note events, so a saved
 * doodle can be replayed from its stored notation alone (no separate note
 * store, works on already-saved doodles). Deliberately scoped to the subset
 * this package emits — L:1/16, single voice, Q tempo header — not general ABC.
 *
 * Timing is reconstructed from the Q header; notes start at 0 (leading rests
 * collapse), which is what playback wants anyway.
 */
export function abcToNotes(abc: string): NoteEvent[] {
  const bpmMatch = abc.match(/Q:1\/4=(\d+)/);
  const bpm = bpmMatch ? Number(bpmMatch[1]) : 100;
  const unitSec = 60 / bpm / 4; // L:1/16

  // Body = everything after the last header line (headers are `X:` style).
  const lines = abc.split('\n');
  const bodyLines = lines.filter((l) => !/^[A-Za-z]:/.test(l.trim()));
  const body = bodyLines.join(' ').trim();
  if (!body) return [];

  const notes: NoteEvent[] = [];
  let cursor = 0;
  // Accidental state keyed by natural letter + octave, matching how
  // AccidentalTracker scopes them; reset at each barline.
  let accidentals = new Map<string, number>();

  for (const raw of body.split(/\s+/)) {
    const tok = raw.trim();
    if (!tok) continue;
    if (tok === '|' || tok === '|]' || tok === '||' || tok === '[|' || tok === ']') {
      accidentals = new Map();
      continue;
    }

    // Rest: z or x, optional duration.
    const rest = tok.match(/^[zx](\d*)$/i);
    if (rest) {
      cursor += (rest[1] ? Number(rest[1]) : 1) * unitSec;
      continue;
    }

    // Chord group: [CEG]4 — all notes share the start; cursor advances once.
    const group = tok.match(/^\[((?:(?:\^|=|_)?[A-Ga-g][,']*)+)\](\d*)$/);
    if (group) {
      const durUnits = group[2] ? Number(group[2]) : 1;
      const duration = durUnits * unitSec;
      const inner = group[1].match(/(\^|=|_)?[A-Ga-g][,']*/g) ?? [];
      for (const noteTok of inner) {
        const parsed = parseAbcNote(noteTok, accidentals);
        if (parsed !== null) {
          notes.push({
            midi: parsed,
            start: Number(cursor.toFixed(3)),
            duration: Number(duration.toFixed(3)),
          });
        }
      }
      cursor += duration;
      continue;
    }

    const m = tok.match(/^((?:\^|=|_)?[A-Ga-g][,']*)(\d*)$/);
    if (!m) continue; // ignore anything outside the emitted subset
    const [, noteTok, durStr] = m;
    const midi = parseAbcNote(noteTok, accidentals);
    if (midi === null) continue;
    const durUnits = durStr ? Number(durStr) : 1;
    const duration = durUnits * unitSec;
    notes.push({
      midi,
      start: Number(cursor.toFixed(3)),
      duration: Number(duration.toFixed(3)),
    });
    cursor += duration;
  }

  return notes;
}

/** Pretty chord symbol for display: Cmaj → C, Amin → Am, N → N.C. */
export function chordDisplayName(label: string): string {
  if (label === 'N') return 'N.C.';
  return label.replace(/maj$/, '').replace(/min$/, 'm');
}

export interface ChordChartOptions {
  title?: string;
  bpm?: number;
  beatsPerBar?: number;
}

/**
 * Render analyzed chord segments as a simple ABC chord chart:
 * one chord symbol per bar over invisible rests, 4 bars per line.
 */
export function chordChartAbc(segments: ChordSegment[], opts: ChordChartOptions = {}): string {
  const bpm = opts.bpm ?? 120;
  const beatsPerBar = opts.beatsPerBar ?? 4;
  const barSec = (60 / bpm) * beatsPerBar;
  const title = opts.title ?? 'Chord chart';

  const end = segments.length ? segments[segments.length - 1].end : 0;
  const nBars = Math.max(1, Math.round(end / barSec));

  const bars: string[] = [];
  let lastLabel = '';
  for (let b = 0; b < nBars; b++) {
    const mid = (b + 0.5) * barSec;
    const seg = segments.find((s) => mid >= s.start && mid < s.end);
    const label = seg ? chordDisplayName(seg.label) : 'N.C.';
    bars.push(label !== lastLabel ? `"${label}"x${beatsPerBar}` : `x${beatsPerBar}`);
    lastLabel = label;
  }

  const lines: string[] = [];
  for (let i = 0; i < bars.length; i += 4) {
    lines.push(bars.slice(i, i + 4).join(' | ') + (i + 4 >= bars.length ? ' |]' : ' |'));
  }

  return [
    'X:1',
    `T:${title}`,
    `M:${beatsPerBar}/4`,
    'L:1/4',
    `Q:1/4=${Math.round(bpm)}`,
    'K:C',
    ...lines,
  ].join('\n');
}
