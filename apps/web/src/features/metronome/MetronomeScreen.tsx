import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { METERS, tapTempo } from '../../audio/meters';
import { Metronome } from '../../audio/metronome';

export function MetronomeScreen() {
  const { t } = useTranslation();
  const [bpm, setBpm] = useState(100);
  const [meterId, setMeterId] = useState('4_4');
  const [swing, setSwing] = useState(0);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(-1);
  const metroRef = useRef<Metronome | null>(null);
  const tapsRef = useRef<number[]>([]);

  const meter = METERS.find((m) => m.id === meterId)!;

  useEffect(() => {
    metroRef.current?.update({ bpm, meter, swing: meter.swingable ? swing : 0 });
  }, [bpm, meter, swing]);

  useEffect(
    () => () => {
      metroRef.current?.stop();
    },
    [],
  );

  function toggle() {
    if (running) {
      metroRef.current?.stop();
      setRunning(false);
      setFlash(-1);
      return;
    }
    const m = new Metronome({ bpm, meter, swing: meter.swingable ? swing : 0 });
    let tickCount = 0;
    m.onTick = () => {
      setFlash(tickCount % meter.ticks);
      tickCount++;
    };
    metroRef.current = m;
    m.start();
    setRunning(true);
  }

  function tap() {
    tapsRef.current.push(performance.now());
    const estimated = tapTempo(tapsRef.current);
    if (estimated) setBpm(Math.max(30, Math.min(260, estimated)));
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('metronome.title')}</h1>

      <div className="bpm-display">
        <span className="bpm-value">{bpm}</span>
        <span className="bpm-label">{t('metronome.bpm')}</span>
      </div>

      <input
        className="slider"
        type="range"
        min={30}
        max={260}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
      />

      <div className="beat-dots">
        {Array.from({ length: meter.ticks }, (_, i) => (
          <span
            key={i}
            className={`beat-dot ${i === flash ? 'beat-dot-on' : ''} ${
              meter.accents[i] === 2 ? 'beat-dot-accent' : ''
            }`}
          />
        ))}
      </div>

      <div className="chip-row">
        {METERS.map((m) => (
          <button
            key={m.id}
            className={`chip ${m.id === meterId ? 'chip-active' : ''}`}
            onClick={() => setMeterId(m.id)}
          >
            {t(`metronome.meter.${m.id}`)}
          </button>
        ))}
      </div>

      {meter.swingable && (
        <label className="swing-row">
          <span>{t('metronome.swing')}</span>
          <input
            className="slider"
            type="range"
            min={0}
            max={100}
            value={swing * 100}
            onChange={(e) => setSwing(Number(e.target.value) / 100)}
          />
          <span className="hint">{t('metronome.swingHint')}</span>
        </label>
      )}

      <div className="button-row">
        <button className={`btn ${running ? 'btn-ghost' : 'btn-primary'}`} onClick={toggle}>
          {running ? `⏹ ${t('metronome.stop')}` : `▶ ${t('metronome.start')}`}
        </button>
        <button className="btn btn-ghost" onClick={tap}>
          👆 {t('metronome.tap')}
        </button>
      </div>
    </div>
  );
}
