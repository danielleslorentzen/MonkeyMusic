import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, useIsKid, type Screen } from './store';
import { initDb } from './db/client';
import { bootstrapProfiles } from './profiles';
import { HomeScreen } from './features/home/HomeScreen';
import { RecordScreen } from './features/recorder/RecordScreen';
import { TunerScreen } from './features/tuner/TunerScreen';
import { MetronomeScreen } from './features/metronome/MetronomeScreen';
import { DoodlerScreen } from './features/doodler/DoodlerScreen';
import { LibraryScreen } from './features/library/LibraryScreen';
import { PhrasebookScreen } from './features/phrasebook/PhrasebookScreen';
import { PaletteScreen } from './features/palette/PaletteScreen';
import { GrimoireScreen } from './features/grimoire/GrimoireScreen';
import { GoalsScreen } from './features/goals/GoalsScreen';
import { GardenScreen } from './features/garden/GardenScreen';
import { ProfilesScreen } from './features/profiles/ProfilesScreen';

const SCREENS: Record<Screen, () => JSX.Element> = {
  home: HomeScreen,
  record: RecordScreen,
  tuner: TunerScreen,
  metronome: MetronomeScreen,
  doodler: DoodlerScreen,
  library: LibraryScreen,
  phrasebook: PhrasebookScreen,
  palette: PaletteScreen,
  grimoire: GrimoireScreen,
  goals: GoalsScreen,
  garden: GardenScreen,
  profiles: ProfilesScreen,
};

const ADULT_NAV: { screen: Screen; emoji: string; labelKey: string }[] = [
  { screen: 'home', emoji: '🏠', labelKey: 'nav.home' },
  { screen: 'record', emoji: '🎧', labelKey: 'nav.record' },
  { screen: 'doodler', emoji: '🎤', labelKey: 'nav.doodler' },
  { screen: 'grimoire', emoji: '🪄', labelKey: 'nav.spells' },
  { screen: 'phrasebook', emoji: '📖', labelKey: 'nav.learn' },
  { screen: 'library', emoji: '📚', labelKey: 'nav.library' },
];

// Kid profile: icon-first, fewer destinations, mood palette as home (TDD §5.4).
const KID_NAV: { screen: Screen; emoji: string; labelKey: string }[] = [
  { screen: 'palette', emoji: '🎨', labelKey: 'nav.moods' },
  { screen: 'doodler', emoji: '🎤', labelKey: 'nav.doodler' },
  { screen: 'grimoire', emoji: '🪄', labelKey: 'nav.spells' },
  { screen: 'garden', emoji: '🌱', labelKey: 'nav.garden' },
  { screen: 'profiles', emoji: '🙂', labelKey: 'nav.profiles' },
];

export function App() {
  const { t } = useTranslation();
  const screen = useAppStore((s) => s.screen);
  const navigate = useAppStore((s) => s.navigate);
  const setStorage = useAppStore((s) => s.setStorage);
  const setProfiles = useAppStore((s) => s.setProfiles);
  const isKid = useIsKid();

  useEffect(() => {
    void initDb().then(async (storage) => {
      setStorage(storage);
      const { profiles, currentId } = await bootstrapProfiles();
      setProfiles(profiles, currentId);
    });
  }, [setStorage, setProfiles]);

  const nav = isKid ? KID_NAV : ADULT_NAV;
  // A kid landing on a non-kid screen (e.g. right after switching) goes to their home.
  const effectiveScreen: Screen =
    isKid && !KID_NAV.some((n) => n.screen === screen) && screen !== 'phrasebook'
      ? 'palette'
      : screen;
  const Current = SCREENS[effectiveScreen];

  return (
    <div className={`app-shell ${isKid ? 'kid-mode' : ''}`}>
      <main className="app-main">
        <Current />
      </main>
      <nav className="bottom-nav">
        {nav.map((n) => (
          <button
            key={n.screen}
            className={`nav-btn ${effectiveScreen === n.screen ? 'nav-btn-active' : ''}`}
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
