import { useTranslation } from 'react-i18next';
import type { SpellOp } from '@lyd/schema';

/**
 * Block-style editor over the CLOSED op vocabulary (TDD §4.5 — Tweak and
 * Scribe are the same surface: sliders and chips over ops, never code).
 */

const WHERE_OPTIONS = ['all', 'dominant', 'tonic', 'last'] as const;

/** Default instance of each op, for the Scribe "add a block" palette. */
export const OP_DEFAULTS: SpellOp[] = [
  { op: 'mode_swap', to: 'parallel_minor' },
  { op: 'transpose', semitones: 2 },
  { op: 'tempo_scale', factor: 0.9 },
  { op: 'chord_color', add: '7', where: 'all', chance: 1 },
  { op: 'quality_paint', to: 'sus4', where: 'dominant' },
  { op: 'melody_invert' },
  { op: 'melody_retrograde' },
  { op: 'reverse_progression' },
  { op: 'octave_shift', octaves: 1 },
  { op: 'rhythm_scale', factor: 2 },
  { op: 'stutter', times: 2 },
  { op: 'swing', amount: 0.5 },
  { op: 'drone', degree: 1 },
  { op: 'pentatonify' },
  { op: 'blue_notes', chance: 0.5 },
];

function Chips<T extends string | number>({
  options, value, onPick, labels,
}: {
  options: readonly T[];
  value: T;
  onPick: (v: T) => void;
  labels?: (v: T) => string;
}) {
  return (
    <div className="chip-row chip-row-tight">
      {options.map((o) => (
        <button
          key={String(o)}
          className={`chip chip-small ${o === value ? 'chip-active' : ''}`}
          onClick={() => onPick(o)}
        >
          {labels ? labels(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

function OpControls({ op, onChange }: { op: SpellOp; onChange: (op: SpellOp) => void }) {
  const { t } = useTranslation();
  switch (op.op) {
    case 'mode_swap':
      return (
        <Chips
          options={['parallel_minor', 'parallel_major'] as const}
          value={op.to}
          onPick={(to) => onChange({ ...op, to })}
          labels={(v) => t(`ops.modeSwap.${v}`)}
        />
      );
    case 'transpose':
      return (
        <label className="op-slider">
          <span>{op.semitones > 0 ? `+${op.semitones}` : op.semitones} {t('ops.semitones')}</span>
          <input
            type="range" min={-12} max={12} step={1} value={op.semitones}
            onChange={(e) => onChange({ ...op, semitones: Number(e.target.value) })}
          />
        </label>
      );
    case 'tempo_scale':
      return (
        <label className="op-slider">
          <span>×{op.factor.toFixed(2)}</span>
          <input
            type="range" min={0.5} max={2} step={0.05} value={op.factor}
            onChange={(e) => onChange({ ...op, factor: Number(e.target.value) })}
          />
        </label>
      );
    case 'chord_color':
      return (
        <>
          <Chips
            options={['7', 'maj7', 'add9', 'b9', 'maj6'] as const}
            value={op.add}
            onPick={(add) => onChange({ ...op, add })}
          />
          <Chips
            options={WHERE_OPTIONS}
            value={op.where}
            onPick={(where) => onChange({ ...op, where })}
            labels={(v) => t(`ops.where.${v}`)}
          />
        </>
      );
    case 'quality_paint':
      return (
        <>
          <Chips
            options={['maj', 'min', 'sus2', 'sus4'] as const}
            value={op.to}
            onPick={(to) => onChange({ ...op, to })}
          />
          <Chips
            options={WHERE_OPTIONS}
            value={op.where}
            onPick={(where) => onChange({ ...op, where })}
            labels={(v) => t(`ops.where.${v}`)}
          />
        </>
      );
    case 'octave_shift':
      return (
        <Chips
          options={[-2, -1, 1, 2] as const}
          value={op.octaves}
          onPick={(octaves) => onChange({ ...op, octaves })}
          labels={(v) => (v > 0 ? `+${v} 🎈` : `${v} 🐋`)}
        />
      );
    case 'rhythm_scale':
      return (
        <Chips
          options={[0.5, 2] as const}
          value={op.factor}
          onPick={(factor) => onChange({ ...op, factor })}
          labels={(v) => (v === 2 ? t('ops.rhythm.stretch') : t('ops.rhythm.squeeze'))}
        />
      );
    case 'stutter':
      return (
        <Chips
          options={[2, 3, 4] as const}
          value={op.times}
          onPick={(times) => onChange({ ...op, times })}
          labels={(v) => `×${v}`}
        />
      );
    case 'swing':
      return (
        <label className="op-slider">
          <span>{Math.round(op.amount * 100)}%</span>
          <input
            type="range" min={0} max={1} step={0.05} value={op.amount}
            onChange={(e) => onChange({ ...op, amount: Number(e.target.value) })}
          />
        </label>
      );
    case 'drone':
      return (
        <Chips
          options={[1, 5] as const}
          value={op.degree}
          onPick={(degree) => onChange({ ...op, degree })}
          labels={(v) => t(`ops.drone.${v}`)}
        />
      );
    case 'blue_notes':
      return (
        <label className="op-slider">
          <span>{Math.round(op.chance * 100)}%</span>
          <input
            type="range" min={0} max={1} step={0.1} value={op.chance}
            onChange={(e) => onChange({ ...op, chance: Number(e.target.value) })}
          />
        </label>
      );
    default:
      return null; // parameterless ops: melody_invert, retrograde, reverse, pentatonify
  }
}

export function OpsEditor({
  ops, onChange, allowAdd,
}: {
  ops: SpellOp[];
  onChange: (ops: SpellOp[]) => void;
  allowAdd: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="ops-editor">
      {ops.map((op, i) => (
        <div key={i} className="op-block">
          <div className="op-block-head">
            <span className="op-name">{t(`ops.name.${op.op}`)}</span>
            <button
              className="op-remove"
              aria-label={t('scribe.removeOp')}
              onClick={() => onChange(ops.filter((_, k) => k !== i))}
            >
              ✕
            </button>
          </div>
          <OpControls op={op} onChange={(next) => onChange(ops.map((o, k) => (k === i ? next : o)))} />
        </div>
      ))}

      {allowAdd && ops.length < 8 && (
        <details className="op-palette">
          <summary>＋ {t('scribe.addOp')}</summary>
          <div className="chip-row">
            {OP_DEFAULTS.map((def) => (
              <button
                key={def.op}
                className="chip chip-small"
                onClick={() => onChange([...ops, structuredClone(def)])}
              >
                {t(`ops.name.${def.op}`)}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
