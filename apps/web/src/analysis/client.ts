import type { AnalysisJson, NoteEvent } from '@lyd/schema';
import type { AnalysisRequest, AnalysisResponse } from './analysis.worker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (r: AnalysisResponse) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<AnalysisResponse>) => {
      const p = pending.get(ev.data.id);
      if (p) {
        pending.delete(ev.data.id);
        p.resolve(ev.data);
      }
    };
  }
  return worker;
}

function send(req: Omit<AnalysisRequest, 'id'>, transfer: Transferable[]): Promise<AnalysisResponse> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (r) => (r.ok ? resolve(r) : reject(new Error(r.error))),
    });
    getWorker().postMessage({ ...req, id }, transfer);
  });
}

export async function analyzeInWorker(
  pcm: Float32Array,
  sampleRate: number,
): Promise<AnalysisJson> {
  const r = await send({ op: 'analyze', pcm, sampleRate }, [pcm.buffer]);
  if (r.ok && r.op === 'analyze') return r.analysis;
  throw new Error('unexpected analysis response');
}

export async function doodleInWorker(
  pcm: Float32Array,
  sampleRate: number,
): Promise<NoteEvent[]> {
  const r = await send({ op: 'doodle', pcm, sampleRate }, [pcm.buffer]);
  if (r.ok && r.op === 'doodle') return r.notes;
  throw new Error('unexpected doodle response');
}
