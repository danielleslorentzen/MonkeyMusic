import { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

/** Renders an ABC string as engraved notation via abcjs (P0's only renderer, TDD §9.1). */
export function AbcView({ abc }: { abc: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    abcjs.renderAbc(ref.current, abc, {
      responsive: 'resize',
      add_classes: true,
      paddingtop: 8,
      paddingbottom: 8,
    });
  }, [abc]);

  return <div className="abc-view" ref={ref} />;
}
