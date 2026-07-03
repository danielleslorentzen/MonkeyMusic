import { ANALYSIS_SAMPLE_RATE, mixToMono, resampleLinear } from '@lyd/mir';
import { getAudioContext } from './ctx';

export interface DecodedAudio {
  /** Mono PCM at the analysis sample rate (22.05 kHz). */
  pcm: Float32Array;
  sampleRate: number;
  durationSec: number;
}

/** Decode wav/mp3/m4a/webm to analysis-ready mono PCM (WebAudio native decode, TDD §9.1). */
export async function decodeToAnalysisPcm(blob: Blob): Promise<DecodedAudio> {
  const ctx = getAudioContext();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const channels: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c));
  const mono = mixToMono(channels);
  const pcm = resampleLinear(mono, buf.sampleRate, ANALYSIS_SAMPLE_RATE);
  return { pcm, sampleRate: ANALYSIS_SAMPLE_RATE, durationSec: buf.duration };
}
