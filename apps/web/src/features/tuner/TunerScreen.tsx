import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  midiName,
  nearestString,
  startTuner,
  TUNER_PRESETS,
  type TunerEngine,
  type TunerReading,
} from '../../audio/tuner';

export function TunerScreen() {
  const { t } = useTranslation();
  const [presetId, setPresetId] = useState('chromatic');
  const [reading, setReading] = useState<TunerReading>({ freq: null, clarity: 0, midi: null, cents: null });
  const [running, setRunning] = useState(false);
  const [showNames, setShowNames] = useState(true);
  const [micError, setMicError] = useState(false);
  const engineRef = useRef<TunerEngine | null>(null);

  const preset = TUNER_PRESETS.find((p) => p.id === presetId)!;

  useEffect(
    () => () => {
      engineRef.current?.stop();
    },
    [],
  );

  async function toggle() {
    if (running) {
      engineRef.current?.stop();
      engineRef.current = null;
      setRunning(false);
      setReading({ freq: null, clarity: 0, midi: null, cents: null });
      return;
    }
    try {
      engineRef.current = await startTuner(setReading);
      setMicError(false);
      setRunning(true);
    } catch {
      setMicError(true);
    }
  }

  // In string-preset mode, aim at the nearest string; chromatic aims at nearest note.
  let targetMidi = reading.midi;
  let cents = reading.cents;
  if (reading.freq !== null && preset.strings) {
    const ns = nearestString(preset, reading.freq);
    if (ns && Math.abs(ns.cents) <= 120) {
      targetMidi = ns.midi;
      cents = ns.cents;
    }
  }

  const inTune = cents !== null && Math.abs(cents) <= 5;
  const namesVisible = preset.voice ? showNames : true;

  return (
    <div className="screen">
      <h1 className="screen-title">{t('tuner.title')}</h1>

      <div className="chip-row">
        {TUNER_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`chip ${p.id === presetId ? 'chip-active' : ''}`}
            onClick={() => setPresetId(p.id)}
          >
            {t(`tuner.preset.${p.id}`)}
          </button>
        ))}
      </div>

      {preset.voice && (
        <label className="toggle-row">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          {t('tuner.showNames')}
        </label>
      )}

      <div className={`tuner-display ${inTune ? 'tuner-in-tune' : ''}`}>
        {reading.freq === null ? (
          <p className="tuner-idle">{running ? t('tuner.listening') : '·  ·  ·'}</p>
        ) : (
          <>
            <div className="tuner-note">
              {namesVisible && targetMidi !== null ? midiName(targetMidi) : '●'}
            </div>
            <div className="tuner-meter">
              <div className="tuner-meter-track">
                <div className="tuner-meter-center" />
                <div
                  className="tuner-meter-needle"
                  style={{ left: `${50 + Math.max(-50, Math.min(50, cents ?? 0))}%` }}
                />
              </div>
              <p className="tuner-verdict">
                {inTune ? `✨ ${t('tuner.inTune')}` : (cents ?? 0) < 0 ? t('tuner.low') : t('tuner.high')}
              </p>
            </div>
            {namesVisible && <p className="hint">{reading.freq.toFixed(1)} Hz</p>}
          </>
        )}
      </div>

      {preset.strings && (
        <div className="string-row">
          {preset.strings.map((s) => (
            <span key={s} className={`string-pill ${s === targetMidi ? 'string-active' : ''}`}>
              {midiName(s)}
            </span>
          ))}
        </div>
      )}

      {micError && <p className="error-text">{t('tuner.micDenied')}</p>}

      <button className={`btn ${running ? 'btn-ghost' : 'btn-primary'}`} onClick={toggle}>
        {running ? t('tuner.stop') : t('tuner.start')}
      </button>
    </div>
  );
}
