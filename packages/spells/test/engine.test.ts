import { describe, expect, it } from 'vitest';
import type { Spell, Tune } from '@lyd/schema';
import { SpellSchema } from '@lyd/schema';
import {
  BUNDLED_SPELLS, DEMO_TUNES, SpellFizzle, castChain, castSpell,
  tuneChordNames, tuneToNoteEvents,
} from '../src';

const porch = (): Tune => structuredClone(DEMO_TUNES[0].tune);
const lantern = (): Tune => structuredClone(DEMO_TUNES[1].tune);

const byId = (id: string): Spell => {
  const s = BUNDLED_SPELLS.find((sp) => sp.id === id);
  if (!s) throw new Error(`missing spell ${id}`);
  return s;
};

describe('grimoire hygiene', () => {
  it('has 15 bundled spells, all schema-valid with unique ids', () => {
    expect(BUNDLED_SPELLS).toHaveLength(15);
    const ids = new Set<string>();
    for (const s of BUNDLED_SPELLS) {
      expect(SpellSchema.safeParse(s).success, s.id).toBe(true);
      expect(ids.has(s.id), `duplicate id ${s.id}`).toBe(false);
      ids.add(s.id);
    }
  });

  it('every bundled spell casts on both demo tunes without fizzling', () => {
    for (const s of BUNDLED_SPELLS) {
      for (const demo of DEMO_TUNES) {
        const out = castSpell(s, structuredClone(demo.tune));
        expect(out.bpm).toBeGreaterThan(0);
        expect(tuneToNoteEvents(out).length).toBeGreaterThan(0);
      }
    }
  });

  it('casting is deterministic for a given seed and pure w.r.t. input', () => {
    const spell = byId('spell.spookify.v1');
    const input = porch();
    const snapshot = structuredClone(input);
    const a = castSpell(spell, input, 7);
    const b = castSpell(spell, porch(), 7);
    expect(a).toEqual(b);
    expect(input).toEqual(snapshot); // no mutation of the source material
  });
});

describe('individual ops', () => {
  it('Spookify: C major porch loop goes parallel minor with a spicy dominant', () => {
    const out = castSpell(byId('spell.spookify.v1'), porch());
    expect(out.key.mode).toBe('minor');
    expect(out.key.tonic).toBe('C');
    // I → i, IV → iv, V picks up the b9, vi → bVI major
    expect(tuneChordNames(out)).toEqual(['Cm', 'G7b9', 'G#', 'Fm']);
    // melody: E (major third over C) lowered to Eb
    expect(out.melody.some((n) => n.midi % 12 === 3)).toBe(true);
    expect(out.melody.some((n) => n.midi % 12 === 4)).toBe(false);
    expect(out.bpm).toBe(90);
  });

  it('Sunshine on the A-minor waltz turns it major', () => {
    const out = castSpell(byId('spell.sunshine.v1'), lantern());
    expect(out.key.mode).toBe('major');
    // i → I (A major triad now includes C#)
    expect(tuneChordNames(out)[0]).toBe('A');
  });

  it('transpose moves key, chords, melody together', () => {
    const out = castSpell(byId('spell.hat.v1'), porch());
    expect(out.key.tonic).toBe('D');
    expect(tuneChordNames(out)).toEqual(['D', 'A', 'Bm', 'G']);
    expect(out.melody[0].midi).toBe(74);
  });

  it('melody_retrograde reverses time, preserving total length', () => {
    const input = porch();
    const out = castSpell(byId('spell.rewind.v1'), input);
    const total = Math.max(...input.melody.map((n) => n.startBeat + n.beats));
    const outTotal = Math.max(...out.melody.map((n) => n.startBeat + n.beats));
    expect(outTotal).toBeCloseTo(total, 3);
    // First note of the retrograde is the last note of the original
    expect(out.melody[0].midi).toBe(input.melody[input.melody.length - 1].midi);
    expect(tuneChordNames(out)).toEqual(['F', 'Am', 'G', 'C']);
  });

  it('melody_invert mirrors around the first note', () => {
    const out = castSpell(byId('spell.mirror.v1'), porch());
    expect(out.melody[0].midi).toBe(72); // pivot unchanged
    expect(out.melody[1].midi).toBe(70); // 74 mirrors to 70
  });

  it('stutter doubles the note count and halves durations', () => {
    const input = porch();
    const out = castSpell(byId('spell.echo.v1'), input);
    expect(out.melody).toHaveLength(input.melody.length * 2);
    expect(out.melody[0].beats).toBeCloseTo(input.melody[0].beats / 2, 3);
  });

  it('pentatonify removes non-pentatonic pitch classes', () => {
    const out = castSpell(byId('spell.campfire.v1'), porch());
    const allowed = new Set([0, 2, 4, 7, 9]); // C major pentatonic
    for (const n of out.melody) {
      expect(allowed.has(n.midi % 12), `midi ${n.midi}`).toBe(true);
    }
  });

  it('drone + octave shift (Giant) adds a bass pedal and sinks the melody', () => {
    const input = porch();
    const out = castSpell(byId('spell.giant.v1'), input);
    expect(out.drone).toBe(0); // C pedal
    expect(out.melody[0].midi).toBe(input.melody[0].midi - 12);
    const events = tuneToNoteEvents(out);
    expect(events.some((e) => e.midi === 36)).toBe(true); // low C in playback
  });

  it('Jazz Hands sevenths every chord and sets swing', () => {
    const out = castSpell(byId('spell.jazzhands.v1'), porch());
    expect(tuneChordNames(out)).toEqual(['C7', 'G7', 'Am7', 'F7']);
    expect(out.swing).toBeCloseTo(0.4);
  });

  it('rituals chain spells left to right', () => {
    const out = castChain([byId('spell.spookify.v1'), byId('spell.hat.v1')], porch());
    expect(out.key.tonic).toBe('D');
    expect(out.key.mode).toBe('minor');
  });
});

describe('fail-closed behavior', () => {
  it('fizzles on an unknown op', () => {
    const evil = {
      ...byId('spell.echo.v1'),
      id: 'spell.imported.v99',
      ops: [{ op: 'summon_network', url: 'https://nope' }],
    } as unknown as Spell;
    expect(() => castSpell(evil, porch())).toThrow(SpellFizzle);
  });

  it('fizzles on a malformed tune', () => {
    const bad = { ...porch(), bpm: -3 } as Tune;
    expect(() => castSpell(byId('spell.echo.v1'), bad)).toThrow(SpellFizzle);
  });
});
