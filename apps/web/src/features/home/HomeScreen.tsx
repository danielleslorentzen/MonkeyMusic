import { useTranslation } from 'react-i18next';
import { useAppStore, useCurrentProfile, type Screen } from '../../store';

const CARDS: { screen: Screen; emoji: string; titleKey: string; subKey: string }[] = [
  { screen: 'record', emoji: '🎧', titleKey: 'home.record.title', subKey: 'home.record.subtitle' },
  { screen: 'doodler', emoji: '🎤', titleKey: 'home.doodler.title', subKey: 'home.doodler.subtitle' },
  { screen: 'grimoire', emoji: '🪄', titleKey: 'home.grimoire.title', subKey: 'home.grimoire.subtitle' },
  { screen: 'palette', emoji: '🎨', titleKey: 'home.palette.title', subKey: 'home.palette.subtitle' },
  { screen: 'phrasebook', emoji: '📖', titleKey: 'home.phrasebook.title', subKey: 'home.phrasebook.subtitle' },
  { screen: 'tuner', emoji: '🎸', titleKey: 'home.tuner.title', subKey: 'home.tuner.subtitle' },
  { screen: 'metronome', emoji: '🥁', titleKey: 'home.metronome.title', subKey: 'home.metronome.subtitle' },
  { screen: 'goals', emoji: '🧭', titleKey: 'home.goals.title', subKey: 'home.goals.subtitle' },
  { screen: 'garden', emoji: '🌱', titleKey: 'home.garden.title', subKey: 'home.garden.subtitle' },
  { screen: 'library', emoji: '📚', titleKey: 'home.library.title', subKey: 'home.library.subtitle' },
];

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useAppStore((s) => s.navigate);
  const storage = useAppStore((s) => s.storage);
  const profile = useCurrentProfile();

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <h1 className="app-title">{t('app.name')}</h1>
        <p className="app-tagline">{t('app.tagline')}</p>
        <div className="home-header-row">
          <p className="offline-badge">🔒 {t('app.offlineBadge')}</p>
          {profile && (
            <button className="profile-chip" onClick={() => navigate('profiles')}>
              {profile.emoji} {profile.name}
            </button>
          )}
        </div>
      </header>

      {storage === 'memory' && <p className="warning-banner">{t('app.storage.memory')}</p>}

      <h2 className="home-greeting">{t('home.greeting')}</h2>
      <div className="home-cards">
        {CARDS.map((c) => (
          <button key={c.screen} className="home-card" onClick={() => navigate(c.screen)}>
            <span className="home-card-emoji">{c.emoji}</span>
            <span className="home-card-title">{t(c.titleKey)}</span>
            <span className="home-card-sub">{t(c.subKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
