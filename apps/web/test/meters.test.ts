import { describe, expect, it } from 'vitest';
import { barDurationSec, barTicks, METERS, tapTempo } from '../src/audio/meters';

const byId = (id: string) => METERS.find((m) => m.id === id)!;

describe('meters', () => {
  it('4/4 at 120 BPM is a 2-second bar with 4 beats', () => {
    const m = byId('4_4');
    expect(barDurationSec(m, 120)).toBeCloseTo(2);
    const ticks = barTicks(m, 120, 0);
    expect(ticks).toHaveLength(4);
    expect(ticks.map((tk) => tk.offsetSec)).toEqual([0, 0.5, 1, 1.5]);
    expect(ticks[0].accent).toBe(2);
  });

  it('6/8 ticks eighths with 3+3 grouping', () => {
    const m = byId('6_8');
    const ticks = barTicks(m, 120, 0);
    expect(ticks).toHaveLength(6);
    expect(ticks[0].accent).toBe(2);
    expect(ticks[3].accent).toBe(1); // second group start
  });

  it('7/8 groups 2+2+3', () => {
    const m = byId('7_8');
    expect(m.accents).toEqual([2, 0, 1, 0, 1, 0, 0]);
  });

  it('swing adds delayed off-beat ticks in simple meters', () => {
    const m = byId('4_4');
    const straightish = barTicks(m, 120, 0.001);
    expect(straightish).toHaveLength(8);
    // At swing=1 the off-beat sits at the 2/3 point (triplet feel).
    const swung = barTicks(m, 120, 1);
    const off = swung[1];
    expect(off.accent).toBe(-1);
    expect(off.offsetSec).toBeCloseTo((2 / 3) * 0.5, 5); // 2/3 of a 0.5s beat
  });

  it('6/8 ignores swing', () => {
    expect(barTicks(byId('6_8'), 120, 1)).toHaveLength(6);
  });
});

describe('tapTempo', () => {
  it('estimates BPM from tap intervals', () => {
    const taps = [0, 500, 1000, 1500, 2000]; // 120 BPM
    expect(tapTempo(taps)).toBe(120);
  });

  it('needs at least two taps', () => {
    expect(tapTempo([100])).toBeNull();
  });

  it('rejects absurd intervals', () => {
    expect(tapTempo([0, 50])).toBeNull();
  });
});
