/**
 * Pure metronome timing logic — separated from WebAudio so it is unit-testable.
 * Simple meters tick quarter-note beats; compound/odd meters tick eighths with
 * group accents (6/8 = 3+3, 7/8 = 2+2+3). Swing delays off-beat eighths.
 */

export interface MeterDef {
  id: string;
  /** Ticks per bar. */
  ticks: number;
  /** Tick duration in beats (1 = quarter at the displayed BPM, 0.5 = eighth). */
  tickBeats: number;
  /** Accent level per tick: 2 = bar start, 1 = group start, 0 = plain. */
  accents: number[];
  /** Whether the swing control applies (simple meters with eighth feel). */
  swingable: boolean;
}

export const METERS: MeterDef[] = [
  { id: '2_4', ticks: 2, tickBeats: 1, accents: [2, 0], swingable: true },
  { id: '3_4', ticks: 3, tickBeats: 1, accents: [2, 0, 0], swingable: true },
  { id: '4_4', ticks: 4, tickBeats: 1, accents: [2, 0, 1, 0], swingable: true },
  { id: '5_4', ticks: 5, tickBeats: 1, accents: [2, 0, 0, 1, 0], swingable: true },
  { id: '6_8', ticks: 6, tickBeats: 0.5, accents: [2, 0, 0, 1, 0, 0], swingable: false },
  { id: '7_8', ticks: 7, tickBeats: 0.5, accents: [2, 0, 1, 0, 1, 0, 0], swingable: false },
];

export interface Tick {
  /** Offset from the bar start, in seconds. */
  offsetSec: number;
  accent: number;
}

/**
 * Tick offsets for one bar. Swing (0..1) applies to the off-beat eighth
 * subdivision of swingable meters: 0 = no subdivision click, >0 adds an
 * off-beat click delayed from the midpoint toward triplet feel.
 */
export function barTicks(meter: MeterDef, bpm: number, swing: number): Tick[] {
  const beatSec = 60 / bpm;
  const out: Tick[] = [];
  for (let i = 0; i < meter.ticks; i++) {
    const t = i * meter.tickBeats * beatSec;
    out.push({ offsetSec: t, accent: meter.accents[i] });
    if (meter.swingable && swing > 0) {
      // Off-beat eighth: midpoint at swing=0 → 2/3 point at swing=1.
      const frac = 0.5 + (2 / 3 - 0.5) * swing;
      out.push({ offsetSec: t + frac * beatSec * meter.tickBeats, accent: -1 });
    }
  }
  return out;
}

export function barDurationSec(meter: MeterDef, bpm: number): number {
  return meter.ticks * meter.tickBeats * (60 / bpm);
}

/** Rolling tap-tempo: median interval of the last few taps → BPM. */
export function tapTempo(tapTimesMs: number[]): number | null {
  const taps = tapTimesMs.slice(-6);
  if (taps.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
  const sorted = intervals.sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  if (median < 200 || median > 2000) return null;
  return Math.round(60000 / median);
}
