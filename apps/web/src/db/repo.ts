import type {
  AnalysisJson,
  AnalysisRow,
  ArtifactRow,
  RecordingRow,
  SessionRow,
} from '@lyd/schema';
import { newId } from '@lyd/schema';
import { all, run } from './client';

// ---- recordings -----------------------------------------------------------

export async function insertRecording(input: {
  duration: number;
  fileRef: string;
  mimeType: string;
  title: string;
}): Promise<string> {
  const id = newId('rec');
  await run(
    `INSERT INTO recordings (id, created_at, duration, file_ref, mime_type, title, notes)
     VALUES (?, ?, ?, ?, ?, ?, '')`,
    [id, Date.now(), input.duration, input.fileRef, input.mimeType, input.title],
  );
  return id;
}

export function listRecordings(): Promise<RecordingRow[]> {
  return all<RecordingRow>('SELECT * FROM recordings ORDER BY created_at DESC');
}

export async function deleteRecording(id: string): Promise<void> {
  await run('DELETE FROM recordings WHERE id = ?', [id]);
}

// ---- analyses --------------------------------------------------------------

export async function insertAnalysis(recordingId: string, analysis: AnalysisJson): Promise<string> {
  const id = newId('ana');
  await run(
    `INSERT INTO analyses (id, recording_id, engine, version, created_at, json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, recordingId, analysis.engine, analysis.engineVersion, Date.now(), JSON.stringify(analysis)],
  );
  return id;
}

export async function latestAnalysisFor(recordingId: string): Promise<AnalysisJson | null> {
  const rows = await all<AnalysisRow>(
    'SELECT * FROM analyses WHERE recording_id = ? ORDER BY created_at DESC LIMIT 1',
    [recordingId],
  );
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].json) as AnalysisJson;
  } catch {
    return null;
  }
}

// ---- artifacts (doodles) ----------------------------------------------------

export async function insertAbcArtifact(input: {
  source: string;
  title: string;
  content: string;
  parentId?: string;
}): Promise<string> {
  const id = newId('art');
  await run(
    `INSERT INTO artifacts (id, kind, source, created_at, title, blob_ref, content, parent_id)
     VALUES (?, 'abc', ?, ?, ?, '', ?, ?)`,
    [id, input.source, Date.now(), input.title, input.content, input.parentId ?? null],
  );
  return id;
}

export function listAbcArtifacts(): Promise<ArtifactRow[]> {
  return all<ArtifactRow>(
    "SELECT * FROM artifacts WHERE kind = 'abc' ORDER BY created_at DESC",
  );
}

export async function deleteArtifact(id: string): Promise<void> {
  await run('DELETE FROM artifacts WHERE id = ?', [id]);
}

// ---- sessions (journal stub) -------------------------------------------------

export async function logSession(journalText: string): Promise<string> {
  const id = newId('ses');
  await run(
    `INSERT INTO sessions (id, started_at, duration, mood, journal_text, snapshot_ref)
     VALUES (?, ?, 0, '', ?, '')`,
    [id, Date.now(), journalText],
  );
  return id;
}

export function listSessions(): Promise<SessionRow[]> {
  return all<SessionRow>('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 50');
}
