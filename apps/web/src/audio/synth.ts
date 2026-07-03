import type { NoteEvent } from '@lyd/schema';
import { getAudioContext } from './ctx';

export interface PlaybackHandle {
  stop(): void;
  readonly durationSec: number;
}

/**
 * Tiny offline-friendly playback: schedules oscillators straight from note
 * events. No soundfont assets in P0 (TDD §9.1 keeps the bundle lean);
 * a curated SoundFont subset arrives in P1.
 */
export function playNotes(notes: NoteEvent[], onEnded?: () => void): PlaybackHandle {
  const ctx = getAudioContext();
  const t0 = ctx.currentTime + 0.08;
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  let end = 0;
  for (const n of notes) {
    const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
    const start = t0 + n.start;
    const stop = start + Math.max(0.08, n.duration);
    end = Math.max(end, n.start + n.duration);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.5, start + 0.02);
    gain.gain.setValueAtTime(0.4, Math.max(start + 0.02, stop - 0.06));
    gain.gain.linearRampToValueAtTime(0, stop);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(stop + 0.02);
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  if (onEnded) timer = setTimeout(onEnded, (end + 0.3) * 1000);

  return {
    durationSec: end,
    stop() {
      if (timer) clearTimeout(timer);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      setTimeout(() => master.disconnect(), 120);
    },
  };
}
