import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  listAbcArtifacts, listConceptsSeen, listGoals, listRecordings, listSessions,
} from '../../db/repo';

/**
 * The garden (TDD §4.4): a streak-free progress view. Every session grows a
 * flower, every doodle a butterfly, every recording a tree, every concept a
 * star, every finished goal a sun. Nothing ever wilts — deliberately.
 */

interface GardenData {
  sessions: number;
  doodles: number;
  recordings: number;
  concepts: number;
  goalsDone: number;
  seeds: string[]; // ids, for deterministic placement
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function GardenScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<GardenData | null>(null);

  useEffect(() => {
    void (async () => {
      const [sessions, doodles, recordings, concepts, goals] = await Promise.all([
        listSessions(), listAbcArtifacts(), listRecordings(), listConceptsSeen(), listGoals(),
      ]);
      setData({
        sessions: sessions.length,
        doodles: doodles.length,
        recordings: recordings.length,
        concepts: concepts.size,
        goalsDone: goals.filter((g) => g.status === 'done').length,
        seeds: [
          ...sessions.map((s) => `s${s.id}`),
          ...doodles.map((d) => `d${d.id}`),
          ...recordings.map((r) => `r${r.id}`),
          ...[...concepts].map((c) => `c${c}`),
          ...goals.filter((g) => g.status === 'done').map((g) => `g${g.id}`),
        ],
      });
    })();
  }, []);

  if (!data) return <div className="screen"><p className="hint">{t('common.loading')}</p></div>;

  const total = data.seeds.length;

  return (
    <div className="screen">
      <h1 className="screen-title">{t('garden.title')}</h1>
      <p className="hint">{total === 0 ? t('garden.empty') : t('garden.hint')}</p>

      <svg className="garden-svg" viewBox="0 0 400 260" role="img" aria-label={t('garden.title')}>
        {/* sky */}
        <rect width="400" height="200" fill="#241b31" />
        {/* concept stars */}
        {data.seeds.filter((s) => s.startsWith('c')).map((s) => {
          const h = hash(s);
          const x = 12 + (h % 376);
          const y = 10 + ((h >> 8) % 110);
          return <text key={s} x={x} y={y} fontSize={8 + ((h >> 16) % 5)}>✦</text>;
        })}
        {/* goal suns */}
        {data.seeds.filter((s) => s.startsWith('g')).map((s, i) => (
          <text key={s} x={330 - i * 26} y={38} fontSize="20">🌞</text>
        ))}
        {/* ground */}
        <rect y="200" width="400" height="60" fill="#2f3d24" />
        <rect y="196" width="400" height="6" rx="3" fill="#3c4f2d" />
        {/* recording trees */}
        {data.seeds.filter((s) => s.startsWith('r')).map((s) => {
          const h = hash(s);
          const x = 20 + (h % 360);
          return <text key={s} x={x} y={206} fontSize="26">🌳</text>;
        })}
        {/* session flowers */}
        {data.seeds.filter((s) => s.startsWith('s')).map((s) => {
          const h = hash(s);
          const x = 8 + (h % 380);
          const flower = ['🌸', '🌼', '🌷', '🪻', '🌻'][(h >> 8) % 5];
          return <text key={s} x={x} y={232 + ((h >> 12) % 20)} fontSize="16">{flower}</text>;
        })}
        {/* doodle butterflies */}
        {data.seeds.filter((s) => s.startsWith('d')).map((s) => {
          const h = hash(s);
          const x = 15 + (h % 370);
          const y = 130 + ((h >> 8) % 60);
          return <text key={s} x={x} y={y} fontSize="14">🦋</text>;
        })}
      </svg>

      <div className="garden-legend">
        <span>🌸 {t('garden.legend.sessions', { n: data.sessions })}</span>
        <span>🦋 {t('garden.legend.doodles', { n: data.doodles })}</span>
        <span>🌳 {t('garden.legend.recordings', { n: data.recordings })}</span>
        <span>✦ {t('garden.legend.concepts', { n: data.concepts })}</span>
        <span>🌞 {t('garden.legend.goals', { n: data.goalsDone })}</span>
      </div>
    </div>
  );
}
