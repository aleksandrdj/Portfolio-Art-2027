import React, { useEffect, useId, useRef } from 'react';
import { AUTOGRAF_PATHS, AUTOGRAF_VIEWBOX } from '../data/autografData';

// Traced against the supplied 595 x 345 artwork, not the ArtDeejay wordmark.
// The guides are masks only: the original filled paths always define the ink.
const strokes = [
  { d: 'M 13 298 L 317 45 Q 326 38 320 50 L 184 294', width: 11, start: 0, end: .34 },
  { d: 'M 184 294 L 350 122 Q 357 116 351 128 L 283 220 Q 277 228 286 221 L 344 175 Q 350 170 341 183 L 268 278 Q 263 284 272 278 L 430 125', width: 11, start: .34, end: .65 },
  { d: 'M 430 125 Q 334 137 157 213', width: 11, start: .65, end: .77 },
  { d: 'M 100 292 Q 320 237 579 150 Q 589 146 577 146 L 439 147 Q 425 146 421 164', width: 11, start: .77, end: 1 },
];
interface Props {
  scrollProgressRef: React.MutableRefObject<number>;
  appState: string;
}
export const AutografOverlay: React.FC<Props> = ({ scrollProgressRef, appState }) => {
  const id = useId().replace(/:/g, '');
  const container = useRef<HTMLDivElement>(null);
  const guides = useRef<(SVGPathElement | null)[]>([]);
  useEffect(() => {
    if (appState !== 'ready') return;
    let raf = 0;
    const update = () => {
      const p = Math.min(1, Math.max(0, (scrollProgressRef.current - .30) / .58));
      if (container.current) container.current.style.visibility = p > 0 ? 'visible' : 'hidden';
      strokes.forEach((stroke, i) => {
        const t = Math.min(1, Math.max(0, (p - stroke.start) / (stroke.end - stroke.start)));
        const el = guides.current[i];
        if (el) {
          el.style.strokeDashoffset = String(1 - t);
          el.style.visibility = t > 0 ? 'visible' : 'hidden';
        }
      });
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [appState, scrollProgressRef]);
  if (appState !== 'ready') return null;
  return <div ref={container} id="autograf-overlay-container" className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center select-none" style={{ visibility: 'hidden' }} aria-hidden="true">
    <div className="w-[76vw] md:w-[48vw] max-w-[820px]" style={{ transform: 'translateY(-2%)' }}>
      <svg viewBox={AUTOGRAF_VIEWBOX.viewBoxStr} className="w-full h-auto block overflow-visible" fill="none">
        <defs>
          <mask id={id} x="0" y="0" width="595" height="345" maskUnits="userSpaceOnUse" style={{ maskType: 'luminance' }}>
            <rect width="595" height="345" fill="black" />
            {strokes.map((s, i) => <path key={i} ref={el => { guides.current[i] = el; }} d={s.d} pathLength={1} strokeDasharray="1 1" strokeDashoffset="1" fill="none" stroke="white" strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" style={{ visibility: 'hidden' }} />)}
          </mask>
        </defs>
        <g mask={`url(#${id})`}>
          {AUTOGRAF_PATHS.map((d, i) => <path key={i} d={d} fill="#C5F5FA" />)}
        </g>
      </svg>
    </div>
  </div>;

};
