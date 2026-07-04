import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GoalRow } from '@lyd/schema';
import { insertGoal, listGoals, setGoalStatus } from '../../db/repo';

/**
 * Goals (TDD §4.4): experience-shaped, never "memorize the circle of fifths".
 * No streaks, no guilt — finishing is celebrated, lingering is fine.
 */

const TEMPLATE_KEYS = ['playAlong', 'writeLoop', 'learnChords', 'humDaily', 'quietSong'] as const;

export function GoalsScreen() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [text, setText] = useState('');
  const [justDone, setJustDone] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listGoals().then(setGoals);
  }, []);
  useEffect(refresh, [refresh]);

  async function add(title: string, kind: string) {
    if (!title.trim()) return;
    await insertGoal(title.trim(), kind);
    setText('');
    refresh();
  }

  async function toggle(goal: GoalRow) {
    const next = goal.status === 'done' ? 'open' : 'done';
    await setGoalStatus(goal.id, next);
    if (next === 'done') {
      setJustDone(goal.id);
      setTimeout(() => setJustDone(null), 2500);
    }
    refresh();
  }

  const open = goals.filter((g) => g.status === 'open');
  const done = goals.filter((g) => g.status === 'done');

  return (
    <div className="screen">
      <h1 className="screen-title">{t('goals.title')}</h1>
      <p className="hint">{t('goals.hint')}</p>

      <div className="chip-row">
        {TEMPLATE_KEYS.map((k) => (
          <button
            key={k}
            className="chip"
            onClick={() => void add(t(`goals.template.${k}`), 'template')}
          >
            ＋ {t(`goals.template.${k}`)}
          </button>
        ))}
      </div>

      <div className="journal-input">
        <textarea
          rows={1}
          placeholder={t('goals.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary" disabled={!text.trim()} onClick={() => void add(text, 'freeform')}>
          ＋ {t('goals.add')}
        </button>
      </div>

      <ul className="item-list">
        {open.length === 0 && done.length === 0 && <p className="hint">{t('goals.empty')}</p>}
        {open.map((g) => (
          <li key={g.id} className="goal-row">
            <button className="goal-check" onClick={() => void toggle(g)} aria-label={t('goals.markDone')}>
              ○
            </button>
            <span className="goal-title">{g.title}</span>
          </li>
        ))}
        {done.map((g) => (
          <li key={g.id} className="goal-row goal-done">
            <button className="goal-check" onClick={() => void toggle(g)} aria-label={t('goals.markOpen')}>
              ●
            </button>
            <span className="goal-title">{g.title}</span>
            {justDone === g.id && <span className="goal-party">🎉 {t('goals.celebrate')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
