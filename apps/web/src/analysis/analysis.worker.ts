/// <reference lib="webworker" />
/** Song analysis runs off the main thread so the UI stays playful, not frozen. */
import { analyzeRecording, segmentNotes, trackPitch } from '@lyd/mir';
import type { AnalysisJson, NoteEvent } from '@lyd/schema';

export type AnalysisRequest =
  | { id: number; op: 'analyze'; pcm: Float32Array; sampleRate: number }
  | { id: number; op: 'doodle'; pcm: Float32Array; sampleRate: number };

export type AnalysisResponse =
  | { id: number; ok: true; op: 'analyze'; analysis: AnalysisJson }
  | { id: number; ok: true; op: 'doodle'; notes: NoteEvent[] }
  | { id: number; ok: false; error: string };

self.onmessage = (ev: MessageEvent<AnalysisRequest>) => {
  const msg = ev.data;
  try {
    if (msg.op === 'analyze') {
      const analysis = analyzeRecording(msg.pcm, msg.sampleRate);
      postMessage({ id: msg.id, ok: true, op: 'analyze', analysis } satisfies AnalysisResponse);
    } else {
      const notes = segmentNotes(trackPitch(msg.pcm, msg.sampleRate, { fMin: 70, fMax: 1200 }));
      postMessage({ id: msg.id, ok: true, op: 'doodle', notes } satisfies AnalysisResponse);
    }
  } catch (err) {
    postMessage({
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies AnalysisResponse);
  }
};
