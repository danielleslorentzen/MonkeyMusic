import { yinPitch } from '@lyd/mir';
import { getAudioContext } from './ctx';

export interface TunerReading {
  freq: number | null;
  clarity: number;
  /** Nearest chromatic midi note. */
  midi: number | null;
  /** Cents offset from that note (-50..+50). */
  cents: number | null;
}

export interface TunerEngine {
  stop(): void;
}

const BUF_SIZE = 4096;

/** AnalyserNode + YIN polling loop (~20 Hz). Covers low bass E1 (41 Hz) up. */
export async function startTuner(
  onReading: (r: TunerReading) => void,
): Promise<TunerEngine> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  const ctx = getAudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = BUF_SIZE;
  source.connect(analyser);

  const buf = new Float32Array(BUF_SIZE);
  let stopped = false;
  let raf = 0;
  let lastRun = 0;

  const loop = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (now - lastRun < 50) return; // ~20 Hz is plenty for a tuner needle
    lastRun = now;
    analyser.getFloatTimeDomainData(buf);
    const { freq, clarity } = yinPitch(buf, ctx.sampleRate, { fMin: 35, fMax: 1600 });
    if (freq === null || clarity < 0.5) {
      onReading({ freq: null, clarity, midi: null, cents: null });
      return;
    }
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(midiFloat);
    const cents = Math.round((midiFloat - midi) * 100);
    onReading({ freq, clarity, midi, cents });
  };
  raf = requestAnimationFrame(loop);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export interface TunerPreset {
  id: string;
  /** Target strings as midi numbers, low to high; null = chromatic. */
  strings: number[] | null;
  /** Voice mode hides note names unless toggled on. */
  voice?: boolean;
}

export const TUNER_PRESETS: TunerPreset[] = [
  { id: 'chromatic', strings: null },
  { id: 'guitar', strings: [40, 45, 50, 55, 59, 64] }, // E2 A2 D3 G3 B3 E4
  { id: 'dropD', strings: [38, 45, 50, 55, 59, 64] },  // D2 A2 D3 G3 B3 E4
  { id: 'bass', strings: [28, 33, 38, 43] },           // E1 A1 D2 G2
  { id: 'voice', strings: null, voice: true },
];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiName(midi: number): string {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/** For string presets: nearest target string and cents offset to it. */
export function nearestString(
  preset: TunerPreset,
  freq: number,
): { midi: number; cents: number } | null {
  if (!preset.strings) return null;
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  let best = preset.strings[0];
  for (const s of preset.strings) {
    if (Math.abs(s - midiFloat) < Math.abs(best - midiFloat)) best = s;
  }
  return { midi: best, cents: Math.round((midiFloat - best) * 100) };
}
