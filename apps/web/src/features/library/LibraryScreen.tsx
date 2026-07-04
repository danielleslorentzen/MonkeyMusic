import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisJson, ArtifactRow, RecordingRow, SessionRow } from '@lyd/schema';
import { abcToNotes } from '@lyd/notation';
import {
  deleteArtifact,
  deleteRecording,
  latestAnalysisFor,
  listAbcArtifacts,
  listRecordings,
  listSessions,
  logSession,
} from '../../db/repo';
import { deleteAudioBlob, loadAudioBlob, saveAudioBlob } from '../../db/opfs';
import { playNotes, type PlaybackHandle } from '../../audio/synth';
import { startRecording, type RecordingHandle } from '../../audio/recorder';
import { AnalysisView } from '../../components/AnalysisView';
import { AbcView } from '../../components/AbcView';

const JOURNAL_MOODS = ['😊', '😌', '🤔', '🔥', '😴', '🥳'];
const SNAPSHOT_MAX_MS = 10_000;

type Tab = 'recordings' | 'doodles' | 'journal';

export function LibraryScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('recordings');
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [doodles, setDoodles] = useState<ArtifactRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [openRec, setOpenRec] = useState<{ row: RecordingRow; analysis: AnalysisJson | null; url: string | null } | null>(null);
  const [openDoodle, setOpenDoodle] = useState<ArtifactRow | null>(null);
  const [doodlePlaying, setDoodlePlaying] = useState(false);
  const doodlePlaybackRef = useRef<PlaybackHandle | null>(null);
  const [journalText, setJournalText] = useState('');
  const [journalMood, setJournalMood] = useState('');
  const [snapshotRef, setSnapshotRef] = useState('');
  const [snapshotState, setSnapshotState] = useState<'idle' | 'recording'>('idle');
  const snapshotHandleRef = useRef<RecordingHandle | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snapshotUrls, setSnapshotUrls] = useState<Record<string, string>>({});

  const stopDoodlePlayback = useCallback(() => {
    doodlePlaybackRef.current?.stop();
    doodlePlaybackRef.current = null;
    setDoodlePlaying(false);
  }, []);

  // Stop any doodle playback when the detail view closes or the screen unmounts.
  useEffect(() => {
    if (!openDoodle) stopDoodlePlayback();
  }, [openDoodle, stopDoodlePlayback]);
  useEffect(() => stopDoodlePlayback, [stopDoodlePlayback]);

  function toggleDoodlePlayback(abc: string) {
    if (doodlePlaying) {
      stopDoodlePlayback();
      return;
    }
    const notes = abcToNotes(abc);
    if (notes.length === 0) return;
    doodlePlaybackRef.current = playNotes(notes, () => setDoodlePlaying(false));
    setDoodlePlaying(true);
  }

  const refresh = useCallback(() => {
    void listRecordings().then(setRecordings);
    void listAbcArtifacts().then(setDoodles);
    void listSessions().then(setSessions);
  }, []);

  useEffect(refresh, [refresh]);
  useEffect(
    () => () => {
      if (openRec?.url) URL.revokeObjectURL(openRec.url);
    },
    [openRec],
  );

  async function openRecording(row: RecordingRow) {
    const analysis = await latestAnalysisFor(row.id);
    const blob = await loadAudioBlob(row.file_ref);
    setOpenRec({ row, analysis, url: blob ? URL.createObjectURL(blob) : null });
  }

  async function removeRecording(row: RecordingRow) {
    if (!confirm(t('library.deleteConfirm'))) return;
    await deleteAudioBlob(row.file_ref);
    await deleteRecording(row.id);
    setOpenRec(null);
    refresh();
  }

  async function removeDoodle(row: ArtifactRow) {
    if (!confirm(t('library.deleteConfirm'))) return;
    await deleteArtifact(row.id);
    setOpenDoodle(null);
    refresh();
  }

  async function jot() {
    const text = journalText.trim();
    if (!text && !snapshotRef) return;
    await logSession(text, journalMood, snapshotRef);
    setJournalText('');
    setJournalMood('');
    setSnapshotRef('');
    refresh();
  }

  async function toggleSnapshot() {
    if (snapshotState === 'recording') {
      await finishSnapshot();
      return;
    }
    try {
      snapshotHandleRef.current = await startRecording();
      setSnapshotState('recording');
      snapshotTimerRef.current = setTimeout(() => void finishSnapshot(), SNAPSHOT_MAX_MS);
    } catch {
      // mic denied — the journal still works without a snapshot
    }
  }

  async function finishSnapshot() {
    const handle = snapshotHandleRef.current;
    if (!handle) return;
    snapshotHandleRef.current = null;
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    const { blob, mimeType } = await handle.stop();
    const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
    const ref = `snap-${Date.now()}.${ext}`;
    await saveAudioBlob(ref, blob);
    setSnapshotRef(ref);
    setSnapshotState('idle');
  }

  async function loadSnapshotUrl(ref: string) {
    if (snapshotUrls[ref]) return;
    const blob = await loadAudioBlob(ref);
    if (blob) setSnapshotUrls((u) => ({ ...u, [ref]: URL.createObjectURL(blob) }));
  }

  if (openRec) {
    return (
      <div className="screen">
        <button className="btn btn-ghost" onClick={() => setOpenRec(null)}>
          ← {t('common.back')}
        </button>
        <h1 className="screen-title">{openRec.row.title}</h1>
        {openRec.analysis ? (
          <AnalysisView analysis={openRec.analysis} title={openRec.row.title} />
        ) : (
          <p className="hint">{t('library.noAnalysis')}</p>
        )}
        {openRec.url && (
          <div className="playback-row">
            <audio controls src={openRec.url} />
          </div>
        )}
        <button className="btn btn-danger" onClick={() => removeRecording(openRec.row)}>
          🗑 {t('library.delete')}
        </button>
      </div>
    );
  }

  if (openDoodle) {
    return (
      <div className="screen">
        <button className="btn btn-ghost" onClick={() => setOpenDoodle(null)}>
          ← {t('common.back')}
        </button>
        <h1 className="screen-title">{openDoodle.title}</h1>
        <AbcView abc={openDoodle.content} />
        <button className="btn btn-primary" onClick={() => toggleDoodlePlayback(openDoodle.content)}>
          {doodlePlaying ? `⏹ ${t('doodler.stopPlay')}` : `▶ ${t('doodler.play')}`}
        </button>
        <button className="btn btn-danger" onClick={() => removeDoodle(openDoodle)}>
          🗑 {t('library.delete')}
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('library.title')}</h1>

      <div className="chip-row">
        {(['recordings', 'doodles', 'journal'] as Tab[]).map((tb) => (
          <button key={tb} className={`chip ${tb === tab ? 'chip-active' : ''}`} onClick={() => setTab(tb)}>
            {t(`library.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'recordings' && (
        <ul className="item-list">
          {recordings.length === 0 && <p className="hint">{t('library.empty.recordings')}</p>}
          {recordings.map((r) => (
            <li key={r.id}>
              <button className="item-row" onClick={() => openRecording(r)}>
                <span className="item-title">{r.title}</span>
                <span className="item-sub">
                  {new Date(r.created_at).toLocaleDateString()} · {t('library.duration', { seconds: Math.round(r.duration) })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'doodles' && (
        <ul className="item-list">
          {doodles.length === 0 && <p className="hint">{t('library.empty.doodles')}</p>}
          {doodles.map((d) => (
            <li key={d.id}>
              <button className="item-row" onClick={() => setOpenDoodle(d)}>
                <span className="item-title">{d.title}</span>
                <span className="item-sub">{new Date(d.created_at).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'journal' && (
        <div>
          <div className="journal-input">
            <div className="chip-row">
              {JOURNAL_MOODS.map((m) => (
                <button
                  key={m}
                  className={`chip ${m === journalMood ? 'chip-active' : ''}`}
                  onClick={() => setJournalMood(m === journalMood ? '' : m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={journalText}
              placeholder={t('library.journal.placeholder')}
              onChange={(e) => setJournalText(e.target.value)}
              rows={2}
            />
            <div className="button-row">
              <button
                className={`btn btn-ghost ${snapshotState === 'recording' ? 'btn-recording' : ''}`}
                onClick={() => void toggleSnapshot()}
              >
                {snapshotState === 'recording'
                  ? `⏹ ${t('library.journal.snapStop')}`
                  : snapshotRef
                    ? `✓ ${t('library.journal.snapDone')}`
                    : `🎙 ${t('library.journal.snap')}`}
              </button>
              <button
                className="btn btn-primary"
                onClick={jot}
                disabled={!journalText.trim() && !snapshotRef}
              >
                ✏️ {t('library.journal.log')}
              </button>
            </div>
          </div>
          <ul className="item-list">
            {sessions.length === 0 && <p className="hint">{t('library.empty.journal')}</p>}
            {sessions.map((s) => (
              <li key={s.id} className="journal-entry">
                <span className="item-sub">
                  {s.mood && <span className="journal-mood">{s.mood} </span>}
                  {new Date(s.started_at).toLocaleString()}
                </span>
                {s.journal_text && <p>{s.journal_text}</p>}
                {s.snapshot_ref &&
                  (snapshotUrls[s.snapshot_ref] ? (
                    <audio controls src={snapshotUrls[s.snapshot_ref]} />
                  ) : (
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => void loadSnapshotUrl(s.snapshot_ref)}
                    >
                      🔈 {t('library.journal.playSnap')}
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
