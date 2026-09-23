import React, { useEffect, useRef } from 'react';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { AppState } from '../types';

interface Props {
  appState: AppState;
  prefersReducedMotion: boolean;
  scrollProgressRef?: React.MutableRefObject<number>;
}

export const CentralLogo: React.FC<Props> = ({ appState, prefersReducedMotion, scrollProgressRef }) => {
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (appState !== 'ready') return;
    const start = performance.now();
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const move = (e: PointerEvent) => {
      if (!fine || prefersReducedMotion || e.pointerType !== 'mouse') return;
      target.x = e.clientX / innerWidth * 2 - 1;
      target.y = e.clientY / innerHeight * 2 - 1;
    };
    const leave = () => { target.x = target.y = 0; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', leave);
    document.documentElement.addEventListener('pointerleave', leave);
    let raf = 0;
    let last = start;
    const update = (now: number) => {
      const p = Math.min(1, Math.max(0, scrollProgressRef?.current ?? 0));
      const fade = prefersReducedMotion ? 1 : 1 - Math.pow(1 - Math.min(1, (now - start) / 1400), 3);
      const follow = 1 - Math.exp(-Math.min(now - last, 50) / 100);
      last = now;
      current.x += (target.x - current.x) * follow;
      current.y += (target.y - current.y) * follow;
      if (outer.current) outer.current.style.opacity = String(fade);
      if (frame.current) {
        const end = innerWidth < 768 ? 48 : 38;
        const scale = (60 + (end - 60) * p) / 60;
        // Keep the original ink legible while allowing the signature to take focus.
        frame.current.style.opacity = String(1 - 0.68 * Math.min(1, Math.max(0, (p - 0.28) / 0.5)));
        frame.current.style.transform = `perspective(1200px) rotateX(${-current.y * 2 * (1-p)}deg) rotateY(${current.x * 3 * (1-p)}deg) scale(${scale})`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [appState, prefersReducedMotion, scrollProgressRef]);
  if (appState !== 'ready') return null;
  return <div ref={outer} id="central-logo-container" className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{ opacity: prefersReducedMotion ? 1 : 0 }}>
    <div ref={frame} id="parallax-wrapper" style={{ width: '60vw', aspectRatio: '1920 / 787', maxHeight: '70svh', willChange: 'transform, opacity' }}>
      <svg id="artdeejay-main-svg" viewBox={LOGO_VIEWBOX} className="w-full h-full block overflow-visible" role="img" aria-label="ArtDeejay">
        <path d={LOGO_FILLED_PATH} fill="#111111" fillRule="evenodd" clipRule="evenodd" />
      </svg>
    </div>
  </div>;
};
