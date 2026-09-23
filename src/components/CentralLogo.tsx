import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { AppState } from '../types';

interface CentralLogoProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  scrollProgressRef?: React.MutableRefObject<number>;
}

export const CentralLogo: React.FC<CentralLogoProps> = ({
  appState,
  prefersReducedMotion,
  scrollProgressRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parallaxWrapperRef = useRef<HTMLDivElement | null>(null);
  const fillPathRef = useRef<SVGPathElement | null>(null);
  const strokePathRef = useRef<SVGPathElement | null>(null);

  const pathLengthRef = useRef<number>(25000);
  const animStartTimeRef = useRef<number | null>(null);

  // Parallax state
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Measure path length on mount
  useLayoutEffect(() => {
    if (strokePathRef.current) {
      try {
        const len = strokePathRef.current.getTotalLength();
        if (len && !isNaN(len) && len > 0) {
          pathLengthRef.current = len;
          strokePathRef.current.style.strokeDasharray = `${len}`;
          strokePathRef.current.style.strokeDashoffset = prefersReducedMotion ? '0' : `${len}`;
        }
      } catch {
        // Fallback default
        strokePathRef.current.style.strokeDasharray = '25000';
        strokePathRef.current.style.strokeDashoffset = prefersReducedMotion ? '0' : '25000';
      }
    }
    if (fillPathRef.current) {
      fillPathRef.current.style.opacity = prefersReducedMotion ? '1' : '0';
    }
  }, [prefersReducedMotion]);

  // Mouse parallax listeners
  useEffect(() => {
    if (isTouchRef.current || prefersReducedMotion) return;

    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTargetRef.current = { x: nx, y: ny };
    };

    const onMouseLeave = () => {
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [prefersReducedMotion]);

  // Main animation and scroll update loop
  useEffect(() => {
    if (appState !== 'ready') return;

    let animId: number;
    const duration = prefersReducedMotion ? 0 : 1350; // 1350ms graceful line drawing

    const loop = () => {
      const now = performance.now();
      if (animStartTimeRef.current === null) {
        animStartTimeRef.current = now;
      }

      // Parallax smoothing
      if (parallaxWrapperRef.current) {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;
        current.x += (target.x - current.x) * 0.06;
        current.y += (target.y - current.y) * 0.06;

        const rotY = current.x * 4.0; // max 4 degrees
        const rotX = -current.y * 3.0; // max 3 degrees
        const transX = current.x * 5.0; // max 5 CSS px
        const transY = current.y * 4.0;

        parallaxWrapperRef.current.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, 0)`;
      }

      // Line drawing progression
      const elapsed = now - animStartTimeRef.current;
      const autoP = duration === 0 ? 1.0 : Math.min(Math.max(elapsed / duration, 0.0), 1.0);
      // Cubic ease-out: 1 - (1 - p)^3
      const easedAuto = 1.0 - Math.pow(1.0 - autoP, 3);

      const scrollP = scrollProgressRef ? Math.min(Math.max(scrollProgressRef.current, 0.0), 1.0) : 0.0;
      // Scroll speedup: if user immediately scrolls down, the line finishes drawing dynamically
      const scrollBoost = Math.min(scrollP * 3.5, 1.0);
      const drawProgress = Math.min(1.0, Math.max(easedAuto, scrollBoost));

      // Update stroke dashoffset (line drawing)
      if (strokePathRef.current) {
        const len = pathLengthRef.current || 25000;
        const offset = len * (1.0 - drawProgress);
        strokePathRef.current.style.strokeDashoffset = `${offset}`;
      }

      // Update solid black fill (fades in as line drawing nears completion)
      if (fillPathRef.current) {
        const fillAlpha = Math.min(Math.max((drawProgress - 0.55) / 0.45, 0.0), 1.0);
        fillPathRef.current.style.opacity = `${fillAlpha}`;
      }

      // Dynamic scale and opacity on scroll: gracefully scales from 60vw to 38vw and drops opacity to 15%
      if (parallaxWrapperRef.current) {
        const isMobile = window.innerWidth < 768;
        const startVw = 60;
        const endVw = isMobile ? 48 : 38;
        const currentVw = startVw + (endVw - startVw) * scrollP;
        parallaxWrapperRef.current.style.width = `${currentVw}vw`;

        // Opacity smoothly drops from 1.0 down to 0.15 (15%) as user scrolls
        const scrollT = Math.min(Math.max(scrollP / 0.65, 0.0), 1.0);
        const easeT = scrollT * scrollT * (3.0 - 2.0 * scrollT);
        const logoOpacity = 1.0 - (1.0 - 0.15) * easeT;
        parallaxWrapperRef.current.style.opacity = `${logoOpacity.toFixed(3)}`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [appState, prefersReducedMotion, scrollProgressRef]);

  // Hidden during intro stages
  if (appState !== 'ready') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id="central-logo-container"
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none overflow-hidden"
    >
      {/* Centered with 60vw width, matching viewBox aspect ratio 1920 / 787 */}
      <div
        ref={parallaxWrapperRef}
        id="parallax-wrapper"
        className="w-[60vw] max-h-[85dvh] aspect-[1920/787] relative flex items-center justify-center will-change-transform"
        style={{
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
        }}
      >
        <svg
          id="artdeejay-main-svg"
          viewBox={LOGO_VIEWBOX}
          className="w-full h-full block overflow-visible"
          role="img"
          aria-label="ArtDeejay"
        >
          {/* Solid black fill that emerges as line drawing completes */}
          <path
            ref={fillPathRef}
            id="base-logo-fill"
            d={LOGO_FILLED_PATH}
            fill="#000000"
            fillRule="evenodd"
            clipRule="evenodd"
            style={{ opacity: 0 }}
          />

          {/* Crisp black line drawing that outlines all letter contours */}
          <path
            ref={strokePathRef}
            id="base-logo-stroke"
            d={LOGO_FILLED_PATH}
            fill="none"
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

