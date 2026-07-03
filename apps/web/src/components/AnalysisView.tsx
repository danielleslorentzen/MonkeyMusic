import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisJson } from '@lyd/schema';
import { chordChartAbc } from '@lyd/notation';
import { AbcView } from './AbcView';
import { ChordTimeline } from './ChordTimeline';

function confidenceKey(c: number): string {
  return c > 0.75 ? 'results.confidence.high' : c > 0.45 ? 'results.confidence.mid' : 'results.confidence.low';
}

/** Key + tempo + vibe badges, chord journey, and a toggleable chord chart. */
export function AnalysisView({ analysis, title }: { analysis: AnalysisJson; title: string }) {
  const { t } = useTranslation();
  const [showChart, setShowChart] = useState(false);

  const chartAbc = useMemo(
    () =>
      chordChartAbc(analysis.chords, {
        title,
        bpm: analysis.tempo.bpm || 120,
        beatsPerBar: 4,
      }),
    [analysis, title],
  );

  const keyLabel = t(
    analysis.key.mode === 'major' ? 'results.majorKey' : 'results.minorKey',
    { tonic: analysis.key.tonic },
  );

  return (
    <div className="analysis-view">
      <div className="badge-row">
        <div className="badge">
          <span className="badge-label">{t('results.key')}</span>
          <span className="badge-value">{keyLabel}</span>
          <span className="badge-sub">{t(confidenceKey(analysis.key.confidence))}</span>
        </div>
        <div className="badge">
          <span className="badge-label">{t('results.tempo')}</span>
          <span className="badge-value">{Math.round(analysis.tempo.bpm)}</span>
          <span className="badge-sub">{t('results.bpm', { bpm: Math.round(analysis.tempo.bpm) })}</span>
        </div>
        <div className="badge">
          <span className="badge-label">{t('results.brightness')}</span>
          <span className="badge-value badge-vibe">
            {t(`results.brightness.${analysis.timbre.brightness}`)}
          </span>
        </div>
      </div>

      <h3 className="section-title">{t('results.timeline')}</h3>
      <ChordTimeline segments={analysis.chords} />

      <button className="btn btn-ghost" onClick={() => setShowChart((v) => !v)}>
        {t('results.chart')} {showChart ? '▴' : '▾'}
      </button>
      {showChart && <AbcView abc={chartAbc} />}
    </div>
  );
}
