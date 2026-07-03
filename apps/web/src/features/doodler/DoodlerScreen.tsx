import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NoteEvent } from '@lyd/schema';
import { melodyToAbc } from '@lyd/notation';
import { decodeToAnalysisPcm } from '../../audio/decode';
import { startRecording, type RecordingHandle } from '../../audio/recorder';
import { playNotes, type PlaybackHandle } from '../../audio/synth';
import { doodleInWorker } from '../../analysis/client';
import { insertAbcArtifact } from '../../db/repo';
import { AbcView } from '../../components/AbcView';

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'thinking' }
  | { kind: 'done'; notes: NoteEvent[]; saved: boolean }
  | { kind: 'empty' }
  | { kind: 'error'; msgKey: string };

export function DoodlerScreen() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [snap, setSnap] = useState(false);
  const [playing, setPlaying] = useState(false);
  const handleRef = useRef<RecordingHandle | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);

  useEffect(
    () => () => {
      handleRef.current?.cancel();
      playbackRef.current?.stop();
    },
    [],
  );

  const abc = useMemo(() => {
    if (phase.kind !== 'done') return null;
    return melodyToAbc(phase.notes, { title: t('doodler.defaultTitle'), snap });
  }, [phase, snap, t]);

  async function begin() {
    try {
      handleRef.current = await startRecording();
      setPhase({ kind: 'recording' });
    } catch {
      setPhase({ kind: 'error', msgKey: 'doodler.micDenied' });
    }
  }

  async function finish() {
    const handle = handleRef.current;
    if (!handle) return;
    handleRef.current = null;
    setPhase({ kind: 'thinking' });
    try {
      const { blob } = await handle.stop();
      const { pcm, sampleRate } = await decodeToAnalysisPcm(blob);
      const notes = await doodleInWorker(pcm, sampleRate);
      setPhase(notes.length === 0 ? { kind: 'empty' } : { kind: 'done', notes, saved: false });
    } catch {
      setPhase({ kind: 'empty' });
    }
  }

  function togglePlay() {
    if (phase.kind !== 'done') return;
    if (playing) {
      playbackRef.current?.stop();
      setPlaying(false);
      return;
    }
    // Play relative to the first note so leading silence is skipped.
    const t0 = phase.notes[0].start;
    const shifted = phase.notes.map((n) => ({ ...n, start: n.start - t0 }));
    playbackRef.current = playNotes(shifted, () => setPlaying(false));
    setPlaying(true);
  }

  async function save() {
    if (phase.kind !== 'done' || !abc) return;
    await insertAbcArtifact({ source: 'doodler', title: t('doodler.defaultTitle'), content: abc });
    setPhase({ ...phase, saved: true });
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('doodler.title')}</h1>
      <p className="hint">{t('doodler.hint')}</p>

      {phase.kind === 'idle' && (
        <div className="center-stack">
          <button className="btn btn-record" onClick={begin}>
            🎤 {t('doodler.start')}
          </button>
        </div>
      )}

      {phase.kind === 'recording' && (
        <div className="center-stack">
          <div className="recording-pulse">🎤</div>
          <p className="hint">{t('doodler.listening')}</p>
          <button className="btn btn-primary" onClick={finish}>
            ⏹ {t('doodler.stop')}
          </button>
        </div>
      )}

      {phase.kind === 'thinking' && (
        <div className="center-stack">
          <div className="spinner" />
          <p className="hint">{t('doodler.thinking')}</p>
        </div>
      )}

      {phase.kind === 'empty' && (
        <div className="center-stack">
          <p className="hint">{t('doodler.empty')}</p>
          <button className="btn btn-ghost" onClick={() => setPhase({ kind: 'idle' })}>
            {t('common.back')}
          </button>
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

      {phase.kind === 'done' && abc && (
        <div>
          <AbcView abc={abc} />
          {/* Snap is an invitation, never forced (TDD §9.1). */}
          <label className="toggle-row">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            {t('doodler.snap')} <span className="hint">{t('doodler.snapHint')}</span>
          </label>
          <div className="button-row">
            <button className="btn btn-primary" onClick={togglePlay}>
              {playing ? `⏹ ${t('doodler.stopPlay')}` : `▶ ${t('doodler.play')}`}
            </button>
            <button className="btn btn-ghost" onClick={save} disabled={phase.saved}>
              {phase.saved ? `✓ ${t('doodler.saved')}` : `💾 ${t('doodler.save')}`}
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase({ kind: 'idle' })}>
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
