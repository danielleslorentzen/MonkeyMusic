import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Concept } from '@lyd/schema';
import { abcToNotes } from '@lyd/notation';
import { playNotes, type PlaybackHandle } from '../audio/synth';
import { markConceptSeen } from '../db/repo';
import { AbcView } from './AbcView';

/**
 * One Phrasebook card: sound first (big play button), words after.
 * Opening a card marks the concept as "seen" — which can unseal spells.
 */
export function ConceptCard({ concept, context }: { concept: Concept; context: string }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const playbackRef = useRef<PlaybackHandle | null>(null);

  useEffect(() => {
    void markConceptSeen(concept.id, context);
    return () => playbackRef.current?.stop();
  }, [concept.id, context]);

  function togglePlay() {
    if (playing) {
      playbackRef.current?.stop();
      setPlaying(false);
      return;
    }
    const notes = abcToNotes(concept.abc);
    if (!notes.length) return;
    playbackRef.current = playNotes(notes, () => setPlaying(false));
    setPlaying(true);
  }

  return (
    <div className="concept-card">
      <p className="concept-feeling">“{concept.feeling}”</p>
      <button className="btn btn-primary" onClick={togglePlay}>
        {playing ? `⏹ ${t('phrasebook.stop')}` : `▶ ${t('phrasebook.hearIt')}`}
      </button>
      <AbcView abc={concept.abc} />
      <p className="concept-desc">{concept.description}</p>
      <div className="concept-block">
        <span className="concept-block-label">{t('phrasebook.heard')}</span>
        <p>{concept.heard}</p>
      </div>
      <div className="concept-block concept-try">
        <span className="concept-block-label">{t('phrasebook.try')}</span>
        <p>{concept.try}</p>
      </div>
    </div>
  );
}
