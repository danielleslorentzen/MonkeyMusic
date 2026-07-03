import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Screen } from './store';
import { initDb } from './db/client';
import { HomeScreen } from './features/home/HomeScreen';
import { RecordScreen } from './features/recorder/RecordScreen';
import { TunerScreen } from './features/tuner/TunerScreen';
import { MetronomeScreen } from './features/metronome/MetronomeScreen';
import { DoodlerScreen } from './features/doodler/DoodlerScreen';
import { LibraryScreen } from './features/library/LibraryScreen';

const SCREENS: Record<Screen, () => JSX.Element> = {
  home: HomeScreen,
  record: RecordScreen,
  tuner: TunerScreen,
  metronome: MetronomeScreen,
  doodler: DoodlerScreen,
  library: LibraryScreen,
};

const NAV: { screen: Screen; emoji: string; labelKey: string }[] = [
  { screen: 'home', emoji: '🏠', labelKey: 'nav.home' },
  { screen: 'record', emoji: '🎧', labelKey: 'nav.record' },
  { screen: 'doodler', emoji: '🎤', labelKey: 'nav.doodler' },
  { screen: 'tuner', emoji: '🎸', labelKey: 'nav.tuner' },
  { screen: 'metronome', emoji: '🥁', labelKey: 'nav.metronome' },
  { screen: 'library', emoji: '📚', labelKey: 'nav.library' },
];

export function App() {
  const { t } = useTranslation();
  const screen = useAppStore((s) => s.screen);
  const navigate = useAppStore((s) => s.navigate);
  const setStorage = useAppStore((s) => s.setStorage);

  useEffect(() => {
    void initDb().then(setStorage);
  }, [setStorage]);

  const Current = SCREENS[screen];

  return (
    <div className="app-shell">
      <main className="app-main">
        <Current />
      </main>
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button
            key={n.screen}
            className={`nav-btn ${screen === n.screen ? 'nav-btn-active' : ''}`}
            onClick={() => navigate(n.screen)}
            aria-label={t(n.labelKey)}
          >
            <span className="nav-emoji">{n.emoji}</span>
            <span className="nav-label">{t(n.labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
