import React, { useEffect, useRef, useState } from 'react';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { AppState } from '../types';

interface CentralStageProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  scrollProgressRef: React.MutableRefObject<number>;
}

export const CentralStage: React.FC<CentralStageProps> = ({
  appState,
  prefersReducedMotion,
  scrollProgressRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Smooth entrance fade-in (900ms cubic ease-out) when transitioning from intro to ready
  const [initialOpacity, setInitialOpacity] = useState<number>(() =>
    prefersReducedMotion ? 1.0 : 0.0
  );

  // Parallax target/current
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Fade-in when ready
  useEffect(() => {
    if (appState !== 'ready') {
      setInitialOpacity(0.0);
      return;
    }

    if (prefersReducedMotion) {
      setInitialOpacity(1.0);
      return;
    }

    const start = performance.now();
    const duration = 900;
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(Math.max(elapsed / duration, 0), 1.0);
      const eased = 1 - Math.pow(1 - p, 3);
      setInitialOpacity(eased);

      if (p < 1.0) {
        frameId = requestAnimationFrame(tick);
      } else {
        setInitialOpacity(1.0);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [appState, prefersReducedMotion]);

  // Animation frame loop for continuous scroll scaling, darkening, and smooth parallax
  useEffect(() => {
    if (appState !== 'ready') return;

    const onMouseMove = (e: MouseEvent) => {
      if (isTouchRef.current || prefersReducedMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTargetRef.current = { x: nx, y: ny };
    };

    const onMouseLeave = () => {
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);

    let animId: number;

    const loop = () => {
      const p = Math.min(Math.max(scrollProgressRef.current, 0.0), 1.0);
      const isMobile = window.innerWidth < 768;

      // 1. Calculate rectangular plane width based on scroll sequence:
      // - progress 0 -> 0.30: scales from 1.0 (75vw) down to 0.8 (60vw)
      // - progress 0.30 -> 0.85: scales from 60vw to final 34vw on desktop, 60vw on mobile
      // - progress 0.85 -> 1.0: final width locked
      let targetVw = 75;
      if (p <= 0.30) {
        const t = p / 0.30;
        targetVw = 75 - (75 - 60) * t; // 75 -> 60
      } else if (p <= 0.85) {
        const t = (p - 0.30) / (0.85 - 0.30);
        const finalVw = isMobile ? 60 : 34;
        targetVw = 60 - (60 - finalVw) * t;
      } else {
        targetVw = isMobile ? 60 : 34;
      }

      // Height constraint: 1.55:1 aspect ratio, bounded by screen height minus header
      const maxAvailableHeight = window.innerHeight - 130;
      let calculatedWidthPx = (targetVw / 100) * window.innerWidth;
      const calculatedHeightPx = calculatedWidthPx / 1.55;

      if (calculatedHeightPx > maxAvailableHeight) {
        calculatedWidthPx = maxAvailableHeight * 1.55;
      }

      // 2. Rectangular plane darkening: starts after -20% scale reduction (p >= 0.30)
      // - p <= 0.30: pure white background (#FFFFFF), opacity 0 for dark overlay
      // - p 0.30 -> 0.85: background transitions to muted blue-gray #142530, overlay opacity 0 -> 0.60
      // - logo changes from #111111 to bright #F0F6FA so it stays visible through the dark overlay
      let darkenT = 0.0;
      if (p > 0.30) {
        darkenT = Math.min((p - 0.30) / (0.85 - 0.30), 1.0);
      }

      // Interpolate background color from white (255, 255, 255) to muted blue-gray (20, 37, 48)
      const bgR = Math.round(255 - (255 - 20) * darkenT);
      const bgG = Math.round(255 - (255 - 37) * darkenT);
      const bgB = Math.round(255 - (255 - 48) * darkenT);

      // Interpolate logo color from dark #111111 to crisp light #F0F6FA (240, 246, 250)
      const logoR = Math.round(17 + (240 - 17) * darkenT);
      const logoG = Math.round(17 + (246 - 17) * darkenT);
      const logoB = Math.round(17 + (250 - 17) * darkenT);

      // Dark overlay opacity up to 0.60
      const overlayOpacity = darkenT * 0.60;

      // Apply styles to rectangle
      if (rectRef.current) {
        rectRef.current.style.width = `${calculatedWidthPx.toFixed(1)}px`;
        rectRef.current.style.height = `${(calculatedWidthPx / 1.55).toFixed(1)}px`;
      }

      if (bgRef.current) {
        bgRef.current.style.backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;
      }

      if (pathRef.current) {
        pathRef.current.style.fill = `rgb(${logoR}, ${logoG}, ${logoB})`;
      }

      if (overlayRef.current) {
        overlayRef.current.style.opacity = `${overlayOpacity.toFixed(3)}`;
      }

      // 3. Smooth gentle parallax (only on desktop when interaction is allowed)
      if (!isTouchRef.current && !prefersReducedMotion && containerRef.current) {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;
        current.x += (target.x - current.x) * 0.05;
        current.y += (target.y - current.y) * 0.05;

        const rotY = current.x * 3.0; // max 3 deg
        const rotX = -current.y * 2.5; // max 2.5 deg
        const transX = current.x * 4.0; // max 4px
        const transY = current.y * 3.0;

        containerRef.current.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, 0)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animId);
    };
  }, [appState, prefersReducedMotion, scrollProgressRef]);

  if (appState !== 'ready') return null;

  return (
    <div
      ref={containerRef}
      id="central-stage-container"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center select-none will-change-transform"
      style={{
        opacity: initialOpacity,
      }}
      aria-hidden="true"
    >
      {/* Rectangular plane (aspect ratio ~1.55:1, square corners, no border, no shadow) */}
      <div
        ref={rectRef}
        id="central-rectangular-plane"
        className="relative flex items-center justify-center overflow-hidden rounded-none border-0 shadow-none will-change-[width,height]"
        style={{
          width: '75vw',
          aspectRatio: '1.55 / 1',
        }}
      >
        {/* Layer 1: Solid plane background (transitions from pure white to muted blue-gray #142530) */}
        <div
          ref={bgRef}
          className="absolute inset-0 bg-[#FFFFFF] transition-colors"
        />

        {/* Layer 2: Main Logo (occupies exactly 80% of rectangle width, perfectly centered) */}
        <div className="relative z-10 flex items-center justify-center w-[80%] max-h-[85%] aspect-[1920/787]">
          <svg
            viewBox={LOGO_VIEWBOX}
            className="w-full h-full block overflow-visible"
            role="img"
            aria-label="ArtDeejay"
          >
            <path
              ref={pathRef}
              d={LOGO_FILLED_PATH}
              fill="#111111"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Layer 3: Darkening overlay on top of logo (opacity 0 -> 0.60 after scale=0.8) */}
        <div
          ref={overlayRef}
          className="absolute inset-0 z-20 pointer-events-none bg-[#020e17]"
          style={{ opacity: 0 }}
        />
      </div>
    </div>
  );
};
