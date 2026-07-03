import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisJson, ArtifactRow, RecordingRow, SessionRow } from '@lyd/schema';
import {
  deleteArtifact,
  deleteRecording,
  latestAnalysisFor,
  listAbcArtifacts,
  listRecordings,
  listSessions,
  logSession,
} from '../../db/repo';
import { deleteAudioBlob, loadAudioBlob } from '../../db/opfs';
import { AnalysisView } from '../../components/AnalysisView';
import { AbcView } from '../../components/AbcView';

type Tab = 'recordings' | 'doodles' | 'journal';

export function LibraryScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('recordings');
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [doodles, setDoodles] = useState<ArtifactRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [openRec, setOpenRec] = useState<{ row: RecordingRow; analysis: AnalysisJson | null; url: string | null } | null>(null);
  const [openDoodle, setOpenDoodle] = useState<ArtifactRow | null>(null);
  const [journalText, setJournalText] = useState('');

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
    if (!text) return;
    await logSession(text);
    setJournalText('');
    refresh();
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
            <textarea
              value={journalText}
              placeholder={t('library.journal.placeholder')}
              onChange={(e) => setJournalText(e.target.value)}
              rows={2}
            />
            <button className="btn btn-primary" onClick={jot} disabled={!journalText.trim()}>
              ✏️ {t('library.journal.log')}
            </button>
          </div>
          <ul className="item-list">
            {sessions.length === 0 && <p className="hint">{t('library.empty.journal')}</p>}
            {sessions.map((s) => (
              <li key={s.id} className="journal-entry">
                <span className="item-sub">{new Date(s.started_at).toLocaleString()}</span>
                <p>{s.journal_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
