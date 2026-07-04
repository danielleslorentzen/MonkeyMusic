import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ArtifactRow, Spell, SpellOp, Tune } from '@lyd/schema';
import { SpellSchema, newId } from '@lyd/schema';
import {
  BUNDLED_SPELLS, DEMO_TUNES, SpellFizzle, castSpell,
  tuneChordNames, tuneToNoteEvents,
} from '@lyd/spells';
import { getConcept } from '@lyd/phrasebook';
import { playNotes, type PlaybackHandle } from '../../audio/synth';
import {
  deleteUserSpell, latestAnalysisFor, listAbcArtifacts, listConceptsSeen,
  listRecordings, listUserSpells, markConceptSeen, saveUserSpell,
} from '../../db/repo';
import { useAppStore } from '../../store';
import { analysisToTune, doodleToTune } from './material';
import { OpsEditor } from './OpsEditor';

/**
 * The Grimoire (TDD §4.5): the spell collection, casting circle, and the
 * Tweak/Scribe editors. Hear first — the reveal card only shows on tap.
 */

interface Material {
  id: string;
  label: string;
  emoji: string;
  tune: Tune;
}

type View =
  | { kind: 'list' }
  | { kind: 'cast'; spell: Spell; ops: SpellOp[]; tweaked: boolean }
  | { kind: 'scribe' };

// concepts implied by each op — auto-fills the reveal card of scribed spells
const OP_CONCEPT: Partial<Record<SpellOp['op'], string>> = {
  mode_swap: 'parallel-minor', transpose: 'modulation', tempo_scale: 'tempo',
  chord_color: 'seventh-chord', quality_paint: 'suspended-chord',
  melody_invert: 'inversion', melody_retrograde: 'retrograde',
  octave_shift: 'octave', rhythm_scale: 'augmentation', stutter: 'motif',
  swing: 'swing', drone: 'drone', pentatonify: 'pentatonic', blue_notes: 'blue-note',
};

export function GrimoireScreen() {
  const { t } = useTranslation();
  const openConcept = useAppStore((s) => s.openConcept);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [userSpells, setUserSpells] = useState<Spell[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState<string>(DEMO_TUNES[0].id);
  const [result, setResult] = useState<Tune | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [fizzle, setFizzle] = useState(false);
  const [playing, setPlaying] = useState<'before' | 'after' | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refresh();
    return () => playbackRef.current?.stop();
  }, []);

  async function refresh() {
    setUserSpells(await listUserSpells());
    setSeen(await listConceptsSeen());
    const mats: Material[] = DEMO_TUNES.map((d) => ({
      id: d.id, label: d.name, emoji: d.emoji, tune: d.tune,
    }));
    const doodles: ArtifactRow[] = await listAbcArtifacts();
    for (const d of doodles.slice(0, 8)) {
      const tune = doodleToTune(d.content);
      if (tune) mats.push({ id: d.id, label: d.title || t('grimoire.aDoodle'), emoji: '🎤', tune });
    }
    for (const r of (await listRecordings()).slice(0, 8)) {
      const analysis = await latestAnalysisFor(r.id);
      const tune = analysis ? analysisToTune(analysis) : null;
      if (tune) mats.push({ id: r.id, label: r.title, emoji: '🎧', tune });
    }
    setMaterials(mats);
  }

  const material = materials.find((m) => m.id === materialId) ?? materials[0];

  function isSealed(spell: Spell): boolean {
    return !!spell.sealed_until_concept && !seen.has(spell.sealed_until_concept);
  }

  function stopPlayback() {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setPlaying(null);
  }

  function playTune(tune: Tune, which: 'before' | 'after') {
    stopPlayback();
    playbackRef.current = playNotes(tuneToNoteEvents(tune), () => setPlaying(null));
    setPlaying(which);
  }

  function openCast(spell: Spell) {
    setView({ kind: 'cast', spell, ops: structuredClone(spell.ops), tweaked: false });
    setResult(null);
    setRevealOpen(false);
    setFizzle(false);
  }

  function cast(spell: Spell, ops: SpellOp[]) {
    if (!material) return;
    setFizzle(false);
    setRevealOpen(false);
    try {
      const out = castSpell({ ...spell, ops }, structuredClone(material.tune));
      setResult(out);
      playTune(out, 'after'); // hear it FIRST — the reveal waits for a tap
      for (const c of spell.reveal.concepts) void markConceptSeen(c, `spell:${spell.id}`);
      void listConceptsSeen().then(setSeen);
    } catch (err) {
      if (err instanceof SpellFizzle) setFizzle(true);
      else throw err;
    }
  }

  async function saveRitual(spell: Spell, ops: SpellOp[]) {
    const ritual: Spell = {
      ...spell,
      id: newId('spell.user'),
      name: t('grimoire.ritualName', { name: spell.name }),
      ops,
      origin: 'user',
      sealed_until_concept: null,
    };
    await saveUserSpell(ritual);
    await refresh();
    setView({ kind: 'list' });
  }

  function exportSpell(spell: Spell) {
    const blob = new Blob([JSON.stringify(spell, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${spell.name.replace(/\W+/g, '-').toLowerCase()}.spell.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importSpell(file: File) {
    try {
      const parsed = SpellSchema.parse(JSON.parse(await file.text()));
      await saveUserSpell({ ...parsed, id: newId('spell.user'), origin: 'user' });
      await refresh();
    } catch {
      setFizzle(true); // foreign/future spells fail closed, gently
    }
  }

  // ---------------------------------------------------------------- list view
  if (view.kind === 'list') {
    return (
      <div className="screen">
        <h1 className="screen-title">{t('grimoire.title')}</h1>
        <p className="hint">{t('grimoire.hint')}</p>
        {fizzle && <p className="fizzle">{t('grimoire.fizzle')}</p>}

        <div className="spell-grid">
          {[...BUNDLED_SPELLS, ...userSpells].map((s) => {
            const sealed = isSealed(s);
            return (
              <button
                key={s.id}
                className={`spell-card ${sealed ? 'spell-sealed' : ''}`}
                onClick={() => !sealed && openCast(s)}
              >
                <span className="spell-emoji">{sealed ? '🔒' : s.emoji}</span>
                <span className="spell-name">{sealed ? t('grimoire.sealed') : s.name}</span>
                <span className="spell-flavor">
                  {sealed
                    ? t('grimoire.sealedHint', {
                        concept: getConcept(s.sealed_until_concept!)?.name ?? '?',
                      })
                    : s.flavor}
                </span>
                <span className={`spell-origin spell-origin-${s.origin}`}>
                  {t(`grimoire.origin.${s.origin}`)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="button-row">
          <button className="btn btn-ghost" onClick={() => setView({ kind: 'scribe' })}>
            ✍️ {t('scribe.start')}
          </button>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
            📥 {t('grimoire.import')}
          </button>
          <input
            ref={importRef} type="file" accept=".json,application/json" hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importSpell(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- scribe view
  if (view.kind === 'scribe') {
    return (
      <ScribeView
        onCancel={() => setView({ kind: 'list' })}
        onSaved={async () => {
          await refresh();
          setView({ kind: 'list' });
        }}
      />
    );
  }

  // ---------------------------------------------------------------- cast view
  const { spell, ops, tweaked } = view;
  const before = material?.tune ?? null;

  return (
    <div className="screen">
      <button className="btn btn-ghost" onClick={() => { stopPlayback(); setView({ kind: 'list' }); }}>
        ← {t('common.back')}
      </button>
      <h1 className="screen-title">
        {spell.emoji} {spell.name}
      </h1>
      <p className="hint">{spell.flavor}</p>

      <h3 className="section-title">{t('grimoire.castOn')}</h3>
      <div className="chip-row">
        {materials.map((m) => (
          <button
            key={m.id}
            className={`chip ${m.id === material?.id ? 'chip-active' : ''}`}
            onClick={() => { setMaterialId(m.id); setResult(null); stopPlayback(); }}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <div className="button-row">
        <button className="btn btn-record" onClick={() => cast(spell, ops)}>
          ✨ {t('grimoire.cast')}
        </button>
        {before && (
          <button
            className="btn btn-ghost"
            onClick={() => (playing === 'before' ? stopPlayback() : playTune(before, 'before'))}
          >
            {playing === 'before' ? '⏹' : '▶'} {t('grimoire.original')}
          </button>
        )}
      </div>

      {fizzle && <p className="fizzle">{t('grimoire.fizzle')}</p>}

      {result && before && (
        <div className="cast-result">
          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={() => (playing === 'after' ? stopPlayback() : playTune(result, 'after'))}
            >
              {playing === 'after' ? '⏹' : '▶'} {t('grimoire.playResult')}
            </button>
          </div>

          <BeforeAfter before={before} after={result} />

          {!revealOpen ? (
            <button className="btn btn-ghost" onClick={() => setRevealOpen(true)}>
              🃏 {t('grimoire.whatHappened')}
            </button>
          ) : (
            <div className="reveal-card">
              <p className="reveal-line">“{spell.reveal.one_liner}”</p>
              <div className="chip-row">
                {spell.reveal.concepts.map((cid) => (
                  <button key={cid} className="chip" onClick={() => openConcept(cid)}>
                    📖 {getConcept(cid)?.name ?? cid}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <details className="tweak-panel" open={tweaked}>
        <summary>🎛 {t('grimoire.tweak')}</summary>
        <OpsEditor
          ops={ops}
          allowAdd={false}
          onChange={(next) => setView({ ...view, ops: next, tweaked: true })}
        />
        {tweaked && (
          <button className="btn btn-ghost" onClick={() => void saveRitual(spell, ops)}>
            💾 {t('grimoire.saveRitual')}
          </button>
        )}
      </details>

      <div className="button-row">
        <button className="btn btn-ghost" onClick={() => exportSpell({ ...spell, ops })}>
          📤 {t('grimoire.export')}
        </button>
        {spell.origin === 'user' && (
          <button
            className="btn btn-danger"
            onClick={async () => {
              await deleteUserSpell(spell.id);
              await refresh();
              setView({ kind: 'list' });
            }}
          >
            🗑 {t('library.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Chord-name pills before → after, changes highlighted; tempo/key/mode badges. */
function BeforeAfter({ before, after }: { before: Tune; after: Tune }) {
  const { t } = useTranslation();
  const beforeNames = useMemo(() => tuneChordNames(before), [before]);
  const afterNames = useMemo(() => tuneChordNames(after), [after]);

  return (
    <div className="before-after">
      {beforeNames.length > 0 && (
        <>
          <div className="ba-row">
            <span className="ba-label">{t('grimoire.before')}</span>
            {beforeNames.map((n, i) => (
              <span key={i} className="ba-pill">{n}</span>
            ))}
          </div>
          <div className="ba-row">
            <span className="ba-label">{t('grimoire.after')}</span>
            {afterNames.map((n, i) => (
              <span key={i} className={`ba-pill ${n !== beforeNames[i] ? 'ba-changed' : ''}`}>
                {n}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="ba-row">
        <span className="ba-label">·</span>
        <span className="ba-pill">
          {before.bpm}→{after.bpm} bpm
        </span>
        <span className={`ba-pill ${before.key.mode !== after.key.mode || before.key.tonic !== after.key.tonic ? 'ba-changed' : ''}`}>
          {after.key.tonic} {t(`results.${after.key.mode}Short`)}
        </span>
        {after.swing > 0 && <span className="ba-pill ba-changed">swing</span>}
        {after.drone != null && <span className="ba-pill ba-changed">{t('grimoire.droneOn')}</span>}
      </div>
    </div>
  );
}

/** Scribe: compose a brand-new spell from the op vocabulary. */
function ScribeView({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🪄');
  const [ops, setOps] = useState<SpellOp[]>([]);
  const [error, setError] = useState(false);

  const EMOJI_CHOICES = ['🪄', '🌊', '🔥', '🍄', '🌙', '🐉', '🧊', '🌈'];

  async function save() {
    if (!name.trim() || ops.length === 0) {
      setError(true);
      return;
    }
    const concepts = [...new Set(ops.map((o) => OP_CONCEPT[o.op]).filter((c): c is string => !!c))];
    const spell: Spell = {
      id: newId('spell.user'),
      schema_version: 1,
      name: name.trim(),
      flavor: t('scribe.defaultFlavor'),
      emoji,
      input: ['progression', 'melody'],
      ops,
      reveal: { concepts, one_liner: t('scribe.defaultReveal') },
      origin: 'user',
      safety: 'pure',
    };
    await saveUserSpell(spell);
    await onSaved();
  }

  return (
    <div className="screen">
      <button className="btn btn-ghost" onClick={onCancel}>
        ← {t('common.back')}
      </button>
      <h1 className="screen-title">✍️ {t('scribe.title')}</h1>
      <p className="hint">{t('scribe.hint')}</p>

      <input
        className="text-input"
        placeholder={t('scribe.namePlaceholder')}
        value={name}
        maxLength={30}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="chip-row">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            className={`chip ${e === emoji ? 'chip-active' : ''}`}
            onClick={() => setEmoji(e)}
          >
            {e}
          </button>
        ))}
      </div>

      <OpsEditor ops={ops} onChange={setOps} allowAdd />

      {error && <p className="error-text">{t('scribe.needNameAndOps')}</p>}
      <button className="btn btn-primary" onClick={() => void save()}>
        💾 {t('scribe.save')}
      </button>
    </div>
  );
}
