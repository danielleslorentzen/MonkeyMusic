import { useTranslation } from 'react-i18next';
import { useAppStore, type Screen } from '../../store';

const CARDS: { screen: Screen; emoji: string; titleKey: string; subKey: string }[] = [
  { screen: 'record', emoji: '🎧', titleKey: 'home.record.title', subKey: 'home.record.subtitle' },
  { screen: 'doodler', emoji: '🎤', titleKey: 'home.doodler.title', subKey: 'home.doodler.subtitle' },
  { screen: 'tuner', emoji: '🎸', titleKey: 'home.tuner.title', subKey: 'home.tuner.subtitle' },
  { screen: 'metronome', emoji: '🥁', titleKey: 'home.metronome.title', subKey: 'home.metronome.subtitle' },
  { screen: 'library', emoji: '📚', titleKey: 'home.library.title', subKey: 'home.library.subtitle' },
];

export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useAppStore((s) => s.navigate);
  const storage = useAppStore((s) => s.storage);

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <h1 className="app-title">{t('app.name')}</h1>
        <p className="app-tagline">{t('app.tagline')}</p>
        <p className="offline-badge">🔒 {t('app.offlineBadge')}</p>
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
