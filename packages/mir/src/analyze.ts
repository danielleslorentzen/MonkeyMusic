import type { AnalysisJson } from '@lyd/schema';
import { chromagram, meanChroma } from './chroma';
import { decodeChords, framesToSegments } from './chords';
import { estimateKey } from './key';
import { estimateTempo } from './tempo';
import { summarizeTimbre } from './timbre';

export const ENGINE_NAME = 'lyd-mir-ts';
export const ENGINE_VERSION = '0.1.0';

/**
 * The full P0 analysis pipeline: mono PCM in, symbolic bundle out.
 * Runs identically in a Web Worker and in Node (CI accuracy gate).
 */
export function analyzeRecording(pcm: Float32Array, sampleRate: number): AnalysisJson {
  const chroma = chromagram(pcm, sampleRate);
  const frameResult = decodeChords(chroma);
  const chords = framesToSegments(frameResult);
  const key = estimateKey(meanChroma(chroma));
  const tempo = estimateTempo(pcm, sampleRate);
  const timbre = summarizeTimbre(pcm, sampleRate);

  return {
    schemaVersion: 1,
    engine: ENGINE_NAME,
    engineVersion: ENGINE_VERSION,
    durationSec: Number((pcm.length / sampleRate).toFixed(3)),
    sampleRate,
    key,
    tempo,
    chords,
    timbre,
  };
}
