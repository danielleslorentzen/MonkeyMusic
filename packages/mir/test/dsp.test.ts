import { describe, expect, it } from 'vitest';
import { fft, magnitudeSpectrum } from '../src/fft';
import { yinPitch, trackPitch } from '../src/pitch';
import { segmentNotes } from '../src/notes';
import { estimateKey } from '../src/key';

const SR = 22050;

function sine(freq: number, durSec: number, sr = SR, amp = 0.5): Float32Array {
  const out = new Float32Array(Math.floor(durSec * sr));
  for (let i = 0; i < out.length; i++) {
    out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  }
  return out;
}

describe('fft', () => {
  it('transforms an impulse to a flat spectrum', () => {
    const re = new Float64Array(64);
    const im = new Float64Array(64);
    re[0] = 1;
    fft(re, im);
    for (let k = 0; k < 64; k++) {
      expect(Math.hypot(re[k], im[k])).toBeCloseTo(1, 10);
    }
  });

  it('localizes a pure tone to the right bin', () => {
    const n = 2048;
    const binFreq = (10 * SR) / n; // exactly bin 10
    const frame = sine(binFreq, n / SR);
    const mag = magnitudeSpectrum(frame.subarray(0, n));
    let best = 0;
    for (let k = 1; k < mag.length; k++) if (mag[k] > mag[best]) best = k;
    expect(best).toBe(10);
  });
});

describe('yin pitch', () => {
  it.each([82.41, 110, 196, 440, 659.26])('detects %f Hz within 1 cent-ish', (f) => {
    const buf = sine(f, 4096 / SR).subarray(0, 4096);
    const { freq, clarity } = yinPitch(buf, SR);
    expect(freq).not.toBeNull();
    expect(Math.abs(freq! - f) / f).toBeLessThan(0.005);
    expect(clarity).toBeGreaterThan(0.8);
  });

  it('returns null on silence', () => {
    const { freq } = yinPitch(new Float32Array(4096), SR);
    expect(freq).toBeNull();
  });
});

describe('note segmentation (doodler)', () => {
  it('segments a three-note hum into three events', () => {
    // A4 (0.5s), silence (0.2s), C5 (0.4s), E5 (0.4s) back-to-back.
    const parts = [
      sine(440, 0.5),
      new Float32Array(Math.floor(0.2 * SR)),
      sine(523.25, 0.4),
      sine(659.26, 0.4),
    ];
    const total = parts.reduce((s, p) => s + p.length, 0);
    const pcm = new Float32Array(total);
    let off = 0;
    for (const p of parts) {
      pcm.set(p, off);
      off += p.length;
    }

    const notes = segmentNotes(trackPitch(pcm, SR));
    expect(notes.length).toBe(3);
    expect(notes.map((n) => n.midi)).toEqual([69, 72, 76]);
    expect(notes[0].duration).toBeGreaterThan(0.3);
  });
});

describe('key estimation', () => {
  it('identifies C major from a C-major-ish chroma histogram', () => {
    // Pitch-class weights roughly like a C major tune: strong C, E, G.
    const chroma = [5, 0.2, 2, 0.2, 3.5, 2.5, 0.3, 4, 0.2, 2.2, 0.3, 1.5];
    const key = estimateKey(chroma);
    expect(key.tonic).toBe('C');
    expect(key.mode).toBe('major');
  });

  it('identifies A minor when the leading tone G# is present', () => {
    const chroma = [3.5, 0.2, 2, 0.3, 3, 1.8, 0.2, 1.5, 2.2, 5, 0.2, 1.2];
    const key = estimateKey(chroma);
    expect(key.tonic).toBe('A');
    expect(key.mode).toBe('minor');
  });
});
