import { describe, expect, it } from 'vitest';
import type { NoteEvent } from '@lyd/schema';
import {
  AccidentalTracker,
  abcToNotes,
  chordChartAbc,
  chordDisplayName,
  melodyToAbc,
  midiToAbcNote,
} from '../src';

describe('midiToAbcNote', () => {
  it('maps octaves correctly', () => {
    expect(midiToAbcNote(60)).toBe('C');   // C4
    expect(midiToAbcNote(72)).toBe('c');   // C5
    expect(midiToAbcNote(84)).toBe("c'");  // C6
    expect(midiToAbcNote(48)).toBe('C,');  // C3
    expect(midiToAbcNote(36)).toBe('C,,'); // C2
    expect(midiToAbcNote(69)).toBe('A');   // A4
  });

  it('marks sharps', () => {
    expect(midiToAbcNote(61)).toBe('^C');
    expect(midiToAbcNote(66)).toBe('^F');
  });
});

describe('AccidentalTracker', () => {
  it('emits accidentals only when state changes, and naturals to cancel', () => {
    const t = new AccidentalTracker();
    expect(midiToAbcNote(61, t)).toBe('^C'); // C#: mark
    expect(midiToAbcNote(61, t)).toBe('C');  // still sharp: no mark
    expect(midiToAbcNote(60, t)).toBe('=C'); // back to natural: cancel
    expect(midiToAbcNote(60, t)).toBe('C');
    t.resetBar();
    expect(midiToAbcNote(61, t)).toBe('^C'); // new bar: mark again
  });

  it('tracks octaves independently', () => {
    const t = new AccidentalTracker();
    expect(midiToAbcNote(61, t)).toBe('^C');
    expect(midiToAbcNote(72, t)).toBe('c'); // C5 unaffected by C#4
  });
});

const THREE_NOTES: NoteEvent[] = [
  { midi: 69, start: 0.0, duration: 0.6 },
  { midi: 72, start: 0.8, duration: 0.3 },
  { midi: 76, start: 1.1, duration: 0.3 },
];

describe('melodyToAbc', () => {
  it('renders free-time by default (M:none, no barlines)', () => {
    const abc = melodyToAbc(THREE_NOTES, { bpm: 100 });
    expect(abc).toContain('M:none');
    expect(abc).toContain('L:1/16');
    const body = abc.split('\n').pop()!;
    expect(body).not.toContain(' | ');
    expect(body).toContain('A4'); // 0.6s at bpm100 unit=0.15 → 4 sixteenths
    expect(body).toContain('z');  // the 0.2s gap becomes a rest
  });

  it('renders snap mode with 4/4 bars that are exactly full', () => {
    const notes: NoteEvent[] = Array.from({ length: 8 }, (_, i) => ({
      midi: 60 + i,
      start: i * 0.6,
      duration: 0.6, // exactly one beat at bpm 100
    }));
    const abc = melodyToAbc(notes, { bpm: 100, snap: true });
    expect(abc).toContain('M:4/4');
    const body = abc.split('\n').pop()!;
    expect(body).toContain('|');
    // 8 quarter notes = 2 full 4/4 bars.
    expect(body.trim().endsWith('|]')).toBe(true);
  });

  it('handles empty input', () => {
    const abc = melodyToAbc([]);
    expect(abc).toContain('z16');
  });
});

describe('chordChartAbc', () => {
  it('lays out one chord symbol per bar', () => {
    const abc = chordChartAbc(
      [
        { start: 0, end: 2, label: 'Cmaj', confidence: 0.9 },
        { start: 2, end: 4, label: 'Amin', confidence: 0.9 },
      ],
      { bpm: 120, beatsPerBar: 4 },
    );
    expect(abc).toContain('"C"x4');
    expect(abc).toContain('"Am"x4');
    expect(abc).toContain('M:4/4');
  });

  it('suppresses repeated chord symbols', () => {
    const abc = chordChartAbc(
      [{ start: 0, end: 8, label: 'Gmaj', confidence: 0.9 }],
      { bpm: 120, beatsPerBar: 4 },
    );
    expect(abc.match(/"G"/g)!.length).toBe(1);
  });
});

describe('abcToNotes', () => {
  it('round-trips the melody pitch sequence in free-time mode', () => {
    const notes: NoteEvent[] = [
      { midi: 69, start: 0.0, duration: 0.45 },
      { midi: 71, start: 0.5, duration: 0.28 },
      { midi: 72, start: 0.8, duration: 0.3 },
      { midi: 74, start: 1.15, duration: 0.5 },
      { midi: 60, start: 1.8, duration: 0.3 },
      { midi: 84, start: 2.2, duration: 0.3 },
    ];
    const abc = melodyToAbc(notes, { bpm: 100, snap: false });
    const back = abcToNotes(abc);
    expect(back.map((n) => n.midi)).toEqual([69, 71, 72, 74, 60, 84]);
  });

  it('recovers sharps and octave marks', () => {
    // C#4, F#3, C6, C3 — exercises ^, lowercase/uppercase, , and ' marks.
    const notes: NoteEvent[] = [
      { midi: 61, start: 0, duration: 0.3 },
      { midi: 54, start: 0.4, duration: 0.3 },
      { midi: 84, start: 0.8, duration: 0.3 },
      { midi: 48, start: 1.2, duration: 0.3 },
    ];
    const abc = melodyToAbc(notes, { bpm: 100, snap: false });
    expect(abcToNotes(abc).map((n) => n.midi)).toEqual([61, 54, 84, 48]);
  });

  it('honors accidental carry within a token run (free time, no barlines)', () => {
    // Two C#4 in a row: generator emits ^C then C; parser must carry the sharp.
    const notes: NoteEvent[] = [
      { midi: 61, start: 0, duration: 0.3 },
      { midi: 61, start: 0.4, duration: 0.3 },
      { midi: 60, start: 0.8, duration: 0.3 },
    ];
    const abc = melodyToAbc(notes, { bpm: 100, snap: false });
    expect(abcToNotes(abc).map((n) => n.midi)).toEqual([61, 61, 60]);
  });

  it('reconstructs durations from the tempo header', () => {
    const notes: NoteEvent[] = [{ midi: 69, start: 0, duration: 0.6 }];
    const abc = melodyToAbc(notes, { bpm: 100, snap: false });
    // 0.6s at bpm100 → 4 sixteenths → 4 * (0.15) = 0.6s back.
    const back = abcToNotes(abc);
    expect(back).toHaveLength(1);
    expect(back[0].duration).toBeCloseTo(0.6, 2);
  });

  it('collapses leading rests so playback starts at 0', () => {
    const notes: NoteEvent[] = [{ midi: 72, start: 2.0, duration: 0.3 }];
    const back = abcToNotes(melodyToAbc(notes, { bpm: 100, snap: false }));
    expect(back[0].start).toBe(0);
  });

  it('returns [] for an empty tune', () => {
    expect(abcToNotes(melodyToAbc([]))).toEqual([]);
  });

  it('round-trips pitch sequence through snap mode too', () => {
    const notes: NoteEvent[] = Array.from({ length: 6 }, (_, i) => ({
      midi: 60 + i * 2,
      start: i * 0.6,
      duration: 0.6,
    }));
    const abc = melodyToAbc(notes, { bpm: 100, snap: true });
    expect(abcToNotes(abc).map((n) => n.midi)).toEqual([60, 62, 64, 66, 68, 70]);
  });
});

describe('chordDisplayName', () => {
  it('formats labels', () => {
    expect(chordDisplayName('Cmaj')).toBe('C');
    expect(chordDisplayName('Amin')).toBe('Am');
    expect(chordDisplayName('F#min')).toBe('F#m');
    expect(chordDisplayName('N')).toBe('N.C.');
  });
});

describe('abcToNotes chord groups', () => {
  it('parses [CEG] as three simultaneous notes', () => {
    const abc = 'X:1\nT:x\nM:none\nL:1/16\nQ:1/4=100\nK:C\n[CEG]4 c4';
    const notes = abcToNotes(abc);
    expect(notes).toHaveLength(4);
    const chord = notes.filter((n) => n.start === 0);
    expect(chord.map((n) => n.midi).sort((a, b) => a - b)).toEqual([60, 64, 67]);
    // melody note starts after the chord's duration
    expect(notes[3].start).toBeCloseTo(chord[0].duration, 3);
  });

  it('handles accidentals inside chord groups', () => {
    const abc = 'X:1\nT:x\nM:none\nL:1/16\nQ:1/4=100\nK:C\n[^FAc]2';
    const notes = abcToNotes(abc);
    expect(notes.map((n) => n.midi).sort((a, b) => a - b)).toEqual([66, 69, 72]);
  });
});
