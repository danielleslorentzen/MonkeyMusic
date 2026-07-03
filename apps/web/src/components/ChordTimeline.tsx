import type { ChordSegment } from '@lyd/schema';
import { chordDisplayName } from '@lyd/notation';

const PC_HUES: Record<string, number> = {
  C: 20, 'C#': 50, D: 80, 'D#': 110, E: 140, F: 170,
  'F#': 200, G: 230, 'G#': 260, A: 290, 'A#': 320, B: 350,
};

function segColor(label: string): string {
  if (label === 'N') return 'var(--surface-2)';
  const m = label.match(/^([A-G]#?)/);
  const hue = m ? PC_HUES[m[1]] : 0;
  const minor = label.endsWith('min');
  return `hsl(${hue} ${minor ? 32 : 52}% ${minor ? 30 : 38}%)`;
}

/** The "chord journey": proportional colored blocks, one per chord segment. */
export function ChordTimeline({ segments }: { segments: ChordSegment[] }) {
  const total = segments.length ? segments[segments.length - 1].end : 1;
  return (
    <div className="chord-timeline" role="img" aria-label="chord timeline">
      {segments.map((s, i) => (
        <div
          key={i}
          className="chord-seg"
          style={{
            width: `${(((s.end - s.start) / total) * 100).toFixed(2)}%`,
            background: segColor(s.label),
          }}
          title={`${chordDisplayName(s.label)} · ${s.start.toFixed(1)}–${s.end.toFixed(1)}s`}
        >
          <span className="chord-seg-label">{chordDisplayName(s.label)}</span>
        </div>
      ))}
    </div>
  );
}
