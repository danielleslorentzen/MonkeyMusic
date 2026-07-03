import { getAudioContext } from './ctx';
import { barDurationSec, barTicks, type MeterDef } from './meters';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

export interface MetronomeState {
  bpm: number;
  meter: MeterDef;
  swing: number; // 0..1
}

/** Lookahead-scheduled WebAudio metronome (the classic two-clock pattern). */
export class Metronome {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private state: MetronomeState;
  onTick?: (accent: number) => void;

  constructor(state: MetronomeState) {
    this.state = state;
  }

  update(state: Partial<MetronomeState>): void {
    this.state = { ...this.state, ...state };
  }

  get running(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    const ctx = getAudioContext();
    this.nextBarTime = ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.schedule(ctx), LOOKAHEAD_MS);
    this.schedule(ctx);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule(ctx: AudioContext): void {
    const { bpm, meter, swing } = this.state;
    while (this.nextBarTime < ctx.currentTime + SCHEDULE_AHEAD_SEC + barDurationSec(meter, bpm)) {
      for (const tick of barTicks(meter, bpm, swing)) {
        const t = this.nextBarTime + tick.offsetSec;
        if (t < ctx.currentTime) continue;
        this.click(ctx, t, tick.accent);
      }
      this.nextBarTime += barDurationSec(meter, bpm);
    }
  }

  private click(ctx: AudioContext, when: number, accent: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Bar start: high & loud. Group start: mid. Beat: low. Swing off-beat: soft tick.
    const freq = accent === 2 ? 1760 : accent === 1 ? 1320 : accent === 0 ? 1050 : 2200;
    const level = accent === 2 ? 0.5 : accent === 1 ? 0.35 : accent === 0 ? 0.28 : 0.12;
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(level, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.06);

    if (this.onTick && accent >= 0) {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      setTimeout(() => this.onTick?.(accent), delay);
    }
  }
}
