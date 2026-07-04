import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NoteEvent } from '@lyd/schema';
import { playNotes, type PlaybackHandle } from '../../audio/synth';
import { useAppStore } from '../../store';

/**
 * Chord mood palette (TDD §4.3): play chords by FEELING words. Names are
 * revealed only on request — sound before symbol, structurally.
 */

interface Mood {
  id: string;
  emoji: string;
  hue: number;
  /** Midi notes of the voicing. */
  notes: number[];
  /** The reveal: what this is called + the Phrasebook concept behind it. */
  chordName: string;
  conceptId: string;
}

const MOODS: Mood[] = [
  { id: 'cozy', emoji: '🧣', hue: 28, notes: [48, 60, 64, 67, 71], chordName: 'Cmaj7', conceptId: 'seventh-chord' },
  { id: 'sunny', emoji: '🌞', hue: 48, notes: [48, 60, 64, 67], chordName: 'C', conceptId: 'major-minor' },
  { id: 'tender', emoji: '🫂', hue: 210, notes: [45, 57, 60, 64], chordName: 'Am', conceptId: 'major-minor' },
  { id: 'floating', emoji: '🎈', hue: 185, notes: [48, 60, 62, 67, 74], chordName: 'Csus2 add9', conceptId: 'add9' },
  { id: 'waiting', emoji: '🚪', hue: 260, notes: [43, 55, 60, 62, 67], chordName: 'Gsus4', conceptId: 'suspended-chord' },
  { id: 'heroic', emoji: '🦸', hue: 0, notes: [36, 48, 55, 60, 64, 67], chordName: 'C (big)', conceptId: 'fifth' },
  { id: 'sneaky', emoji: '🐈‍⬛', hue: 300, notes: [45, 57, 60, 64, 67, 70], chordName: 'Am6/9-ish', conceptId: 'blue-note' },
  { id: 'wistful', emoji: '🍂', hue: 20, notes: [45, 57, 60, 64, 71], chordName: 'Am(add9)', conceptId: 'add9' },
  { id: 'spooky', emoji: '🕸️', hue: 270, notes: [43, 55, 59, 62, 65, 68], chordName: 'G7b9', conceptId: 'flat-nine' },
  { id: 'ancient', emoji: '🏔️', hue: 150, notes: [36, 43, 48, 55, 60, 67], chordName: 'C5 (open fifths)', conceptId: 'drone' },
  { id: 'jazzy', emoji: '🎷', hue: 330, notes: [43, 55, 59, 62, 65], chordName: 'G7', conceptId: 'seventh-chord' },
  { id: 'homesick', emoji: '🏡', hue: 90, notes: [41, 53, 57, 60, 65], chordName: 'F → home soon', conceptId: 'cadence' },
];

export function PaletteScreen() {
  const { t } = useTranslation();
  const openConcept = useAppStore((s) => s.openConcept);
  const [revealed, setRevealed] = useState<string | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);

  function play(mood: Mood) {
    playbackRef.current?.stop();
    const events: NoteEvent[] = mood.notes.map((midi, i) => ({
      midi,
      start: i * 0.04, // a gentle roll, like a strum
      duration: 2.2,
    }));
    playbackRef.current = playNotes(events);
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('palette.title')}</h1>
      <p className="hint">{t('palette.hint')}</p>
      <div className="mood-grid">
        {MOODS.map((m) => (
          <div key={m.id} className="mood-cell">
            <button
              className="mood-btn"
              style={{ background: `hsl(${m.hue} 45% 32%)` }}
              onClick={() => play(m)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-word">{t(`palette.mood.${m.id}`)}</span>
            </button>
            <button
              className="mood-reveal"
              onClick={() => setRevealed(revealed === m.id ? null : m.id)}
            >
              {revealed === m.id ? m.chordName : t('palette.whatsItCalled')}
            </button>
            {revealed === m.id && (
              <button className="mood-learn" onClick={() => openConcept(m.conceptId)}>
                {t('palette.learnMore')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
