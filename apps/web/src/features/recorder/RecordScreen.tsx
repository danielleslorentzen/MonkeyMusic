import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisJson } from '@lyd/schema';
import { decodeToAnalysisPcm } from '../../audio/decode';
import { startRecording, type RecordingHandle } from '../../audio/recorder';
import { analyzeInWorker } from '../../analysis/client';
import { insertAnalysis, insertRecording } from '../../db/repo';
import { saveAudioBlob } from '../../db/opfs';
import { AnalysisView } from '../../components/AnalysisView';

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording'; startedAt: number }
  | { kind: 'analyzing' }
  | { kind: 'done'; analysis: AnalysisJson; blob: Blob; mimeType: string; durationSec: number; savedId?: string }
  | { kind: 'error'; msgKey: string };

export function RecordScreen() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const handleRef = useRef<RecordingHandle | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase.kind !== 'recording') return;
    const iv = setInterval(() => setElapsed((Date.now() - phase.startedAt) / 1000), 250);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(
    () => () => {
      handleRef.current?.cancel();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    },
    [],
  );

  async function begin() {
    try {
      handleRef.current = await startRecording();
      setElapsed(0);
      setPhase({ kind: 'recording', startedAt: Date.now() });
    } catch {
      setPhase({ kind: 'error', msgKey: 'record.micDenied' });
    }
  }

  async function finish() {
    const handle = handleRef.current;
    if (!handle) return;
    handleRef.current = null;
    setPhase({ kind: 'analyzing' });
    const { blob, mimeType } = await handle.stop();
    await analyzeBlob(blob, mimeType);
  }

  async function importFile(file: File) {
    setPhase({ kind: 'analyzing' });
    await analyzeBlob(file, file.type || 'audio/mpeg', file.name.replace(/\.[^.]+$/, ''));
  }

  async function analyzeBlob(blob: Blob, mimeType: string, title?: string) {
    try {
      const { pcm, sampleRate, durationSec } = await decodeToAnalysisPcm(blob);
      if (durationSec < 3) {
        setPhase({ kind: 'error', msgKey: 'record.tooShort' });
        return;
      }
      const analysis = await analyzeInWorker(pcm, sampleRate);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(blob);
      setPhase({ kind: 'done', analysis, blob, mimeType, durationSec });
      void save(analysis, blob, mimeType, durationSec, title);
    } catch {
      setPhase({ kind: 'error', msgKey: 'record.error' });
    }
  }

  async function save(
    analysis: AnalysisJson,
    blob: Blob,
    mimeType: string,
    durationSec: number,
    title?: string,
  ) {
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'webm';
    const fileRef = `rec-${Date.now()}.${ext}`;
    await saveAudioBlob(fileRef, blob);
    const recordingId = await insertRecording({
      duration: durationSec,
      fileRef,
      mimeType,
      title: title ?? t('record.untitled'),
    });
    await insertAnalysis(recordingId, analysis);
    setPhase((p) => (p.kind === 'done' ? { ...p, savedId: recordingId } : p));
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('record.title')}</h1>

      {phase.kind === 'idle' && (
        <div className="center-stack">
          <button className="btn btn-record" onClick={begin}>
            ⏺ {t('record.start')}
          </button>
          <label className="btn btn-ghost file-btn">
            📁 {t('record.import')}
            <input
              type="file"
              accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,.wav,.mp3,.m4a,.aac"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
              }}
            />
          </label>
          <p className="hint">{t('record.importHint')}</p>
        </div>
      )}

      {phase.kind === 'recording' && (
        <div className="center-stack">
          <div className="recording-pulse">⏺</div>
          <p className="hint">{t('record.recording')} {elapsed.toFixed(0)}s</p>
          <button className="btn btn-primary" onClick={finish}>
            ⏹ {t('record.stop')}
          </button>
        </div>
      )}

      {phase.kind === 'analyzing' && (
        <div className="center-stack">
          <div className="spinner" />
          <p className="hint">{t('record.analyzing')}</p>
        </div>
      )}

      {phase.kind === 'error' && (
        <div className="center-stack">
          <p className="error-text">{t(phase.msgKey)}</p>
          <button className="btn btn-ghost" onClick={() => setPhase({ kind: 'idle' })}>
            {t('common.back')}
          </button>
        </div>
      )}

      {phase.kind === 'done' && (
        <div>
          <AnalysisView analysis={phase.analysis} title={t('record.untitled')} />
          {audioUrlRef.current && (
            <div className="playback-row">
              <span className="hint">{t('results.playback')}</span>
              <audio controls src={audioUrlRef.current} />
            </div>
          )}
          <p className="hint">{phase.savedId ? `✓ ${t('results.saved')}` : '…'}</p>
          <button className="btn btn-ghost" onClick={() => setPhase({ kind: 'idle' })}>
            {t('common.back')}
          </button>
        </div>
      )}
    </div>
  );
}
