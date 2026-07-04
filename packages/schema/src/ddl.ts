/**
 * Canonical local store DDL (TDD §5.1).
 *
 * The FULL schema is created at P0 even though only a subset is used,
 * so that later phases (Phrasebook, quests, LLM threads, goals) are
 * additive migrations only.
 */

export const SCHEMA_VERSION = 2;

/**
 * Additive migrations, applied in order when the stored schema_version is
 * older. Index 0 = migration to v2, etc. Never edit past entries.
 */
export const MIGRATIONS: string[] = [
  // ---- v2 (P1): profiles + adult gate, user spells --------------------------
  `
CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('adult','kid')),
  emoji      TEXT NOT NULL DEFAULT '🙂',
  pin_hash   TEXT NOT NULL DEFAULT '',   -- empty = no PIN set (adult only)
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS spells (
  id         TEXT PRIMARY KEY,
  origin     TEXT NOT NULL CHECK (origin IN ('bundled','user','llm')),
  created_at INTEGER NOT NULL,
  json       TEXT NOT NULL               -- Spell (zod-validated on read/write)
);
`,
];

export const DDL = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recordings (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,          -- epoch ms
  duration   REAL NOT NULL,             -- seconds
  file_ref   TEXT NOT NULL,             -- OPFS / native filesystem path
  mime_type  TEXT NOT NULL DEFAULT 'audio/webm',
  title      TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS analyses (
  id           TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  engine       TEXT NOT NULL,           -- e.g. 'lyd-mir-ts'
  version      TEXT NOT NULL,           -- engine version string
  created_at   INTEGER NOT NULL,
  json         TEXT NOT NULL            -- AnalysisJson (chord map, key, tempo, structure)
);
CREATE INDEX IF NOT EXISTS idx_analyses_recording ON analyses(recording_id);

CREATE TABLE IF NOT EXISTS artifacts (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('abc','musicxml','midi','gp','pdf')),
  source     TEXT NOT NULL,             -- 'doodler' | 'analysis' | 'import' | ...
  created_at INTEGER NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  blob_ref   TEXT NOT NULL DEFAULT '',  -- file ref for binary kinds
  content    TEXT NOT NULL DEFAULT '',  -- inline content for text kinds (abc)
  parent_id  TEXT                       -- optional link to recording/analysis/artifact
);

CREATE TABLE IF NOT EXISTS goals (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'freeform',
  target     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','paused','dropped'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  started_at   INTEGER NOT NULL,
  duration     REAL NOT NULL DEFAULT 0, -- seconds
  mood         TEXT NOT NULL DEFAULT '',
  journal_text TEXT NOT NULL DEFAULT '',
  snapshot_ref TEXT NOT NULL DEFAULT '' -- optional 10s "sound diary" audio ref
);

CREATE TABLE IF NOT EXISTS quests (
  id             TEXT PRIMARY KEY,
  source         TEXT NOT NULL CHECK (source IN ('bundled','llm')),
  schema_version INTEGER NOT NULL,
  json           TEXT NOT NULL,
  state          TEXT NOT NULL DEFAULT 'inactive'
);

CREATE TABLE IF NOT EXISTS concepts_seen (
  concept_id     TEXT PRIMARY KEY,
  first_heard_at INTEGER NOT NULL,
  contexts_json  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS llm_threads (
  id            TEXT PRIMARY KEY,
  topic_ref     TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL,
  messages_json TEXT NOT NULL DEFAULT '[]'
);
`;
