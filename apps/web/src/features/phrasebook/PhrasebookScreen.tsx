import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CONCEPTS } from '@lyd/phrasebook';
import { listConceptsSeen } from '../../db/repo';
import { useAppStore } from '../../store';
import { ConceptCard } from '../../components/ConceptCard';

/** The Phrasebook: offline concept cards, feeling-first (TDD §4.2). */
export function PhrasebookScreen() {
  const { t } = useTranslation();
  const openConceptId = useAppStore((s) => s.openConceptId);
  const [openId, setOpenId] = useState<string | null>(openConceptId);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    void listConceptsSeen().then(setSeen);
  }, [openId]);

  useEffect(() => {
    if (openConceptId) setOpenId(openConceptId);
  }, [openConceptId]);

  const open = CONCEPTS.find((c) => c.id === openId);

  if (open) {
    return (
      <div className="screen">
        <button className="btn btn-ghost" onClick={() => setOpenId(null)}>
          ← {t('common.back')}
        </button>
        <h1 className="screen-title">{open.name}</h1>
        <ConceptCard concept={open} context="phrasebook" />
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('phrasebook.title')}</h1>
      <p className="hint">{t('phrasebook.hint')}</p>
      <p className="hint">
        {t('phrasebook.progress', { seen: seen.size, total: CONCEPTS.length })}
      </p>
      <ul className="item-list">
        {CONCEPTS.map((c) => (
          <li key={c.id}>
            <button className="item-row" onClick={() => setOpenId(c.id)}>
              <span className="item-title">
                {seen.has(c.id) ? '✨' : '·'} {c.name}
              </span>
              <span className="item-sub">{c.feeling}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
