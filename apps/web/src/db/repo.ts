import type {
  AnalysisJson,
  AnalysisRow,
  ArtifactRow,
  GoalRow,
  ProfileRow,
  RecordingRow,
  SessionRow,
  Spell,
} from '@lyd/schema';
import { SpellSchema, newId } from '@lyd/schema';
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

// ---- sessions (journal) -------------------------------------------------------

export async function logSession(
  journalText: string,
  mood = '',
  snapshotRef = '',
): Promise<string> {
  const id = newId('ses');
  await run(
    `INSERT INTO sessions (id, started_at, duration, mood, journal_text, snapshot_ref)
     VALUES (?, ?, 0, ?, ?, ?)`,
    [id, Date.now(), mood, journalText, snapshotRef],
  );
  return id;
}

export function listSessions(): Promise<SessionRow[]> {
  return all<SessionRow>('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 100');
}

// ---- profiles & adult gate (P1, TDD §5.4) --------------------------------------

export function listProfiles(): Promise<ProfileRow[]> {
  return all<ProfileRow>('SELECT * FROM profiles ORDER BY created_at');
}

export async function insertProfile(input: {
  name: string;
  kind: 'adult' | 'kid';
  emoji: string;
  pinHash?: string;
}): Promise<string> {
  const id = newId('prof');
  await run(
    `INSERT INTO profiles (id, name, kind, emoji, pin_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.kind, input.emoji, input.pinHash ?? '', Date.now()],
  );
  return id;
}

export async function setProfilePin(id: string, pinHash: string): Promise<void> {
  await run('UPDATE profiles SET pin_hash = ? WHERE id = ?', [pinHash, id]);
}

export async function getMeta(key: string): Promise<string | null> {
  const rows = await all<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO meta(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

// ---- goals (P1) -----------------------------------------------------------------

export async function insertGoal(title: string, kind = 'freeform'): Promise<string> {
  const id = newId('goal');
  await run(
    `INSERT INTO goals (id, title, kind, target, created_at, status)
     VALUES (?, ?, ?, '', ?, 'open')`,
    [id, title, kind, Date.now()],
  );
  return id;
}

export function listGoals(): Promise<GoalRow[]> {
  return all<GoalRow>("SELECT * FROM goals WHERE status != 'dropped' ORDER BY created_at DESC");
}

export async function setGoalStatus(id: string, status: GoalRow['status']): Promise<void> {
  await run('UPDATE goals SET status = ? WHERE id = ?', [status, id]);
}

// ---- concepts seen (Phrasebook "your dialect" + spell unsealing) ------------------

export async function markConceptSeen(conceptId: string, context: string): Promise<void> {
  await run(
    `INSERT INTO concepts_seen (concept_id, first_heard_at, contexts_json)
     VALUES (?, ?, ?)
     ON CONFLICT(concept_id) DO NOTHING`,
    [conceptId, Date.now(), JSON.stringify([context])],
  );
}

export async function listConceptsSeen(): Promise<Set<string>> {
  const rows = await all<{ concept_id: string }>('SELECT concept_id FROM concepts_seen');
  return new Set(rows.map((r) => r.concept_id));
}

// ---- user spells (rituals & scribed spells, P1) ------------------------------------

export async function saveUserSpell(spell: Spell): Promise<void> {
  const parsed = SpellSchema.parse(spell); // never persist an invalid spell
  await run(
    `INSERT INTO spells (id, origin, created_at, json) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET json = excluded.json`,
    [parsed.id, parsed.origin, Date.now(), JSON.stringify(parsed)],
  );
}

export async function listUserSpells(): Promise<Spell[]> {
  const rows = await all<{ json: string }>('SELECT json FROM spells ORDER BY created_at');
  const spells: Spell[] = [];
  for (const row of rows) {
    try {
      spells.push(SpellSchema.parse(JSON.parse(row.json)));
    } catch {
      // a spell from a future schema version fails closed: skip, don't crash
    }
  }
  return spells;
}

export async function deleteUserSpell(id: string): Promise<void> {
  await run('DELETE FROM spells WHERE id = ?', [id]);
}
