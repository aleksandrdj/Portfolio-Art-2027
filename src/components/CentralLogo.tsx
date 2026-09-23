import React, { useEffect, useRef, useState } from 'react';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { AppState } from '../types';

interface CentralLogoProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  isWebGLActive?: boolean;
  isWebGLReadyFrameDrawn?: boolean;
}

export const CentralLogo: React.FC<CentralLogoProps> = ({
  appState,
  prefersReducedMotion,
  isWebGLActive = false,
  isWebGLReadyFrameDrawn = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parallaxWrapperRef = useRef<HTMLDivElement | null>(null);

  // Parallax state for DOM fallback
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  // Smooth fade-in over 900ms with cubic ease-out when entering ready state
  const [opacity, setOpacity] = useState<number>(() => (prefersReducedMotion ? 1.0 : 0.0));
  const [isParallaxActive, setIsParallaxActive] = useState<boolean>(() => prefersReducedMotion);

  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Fade in animation when appState reaches 'ready' (900ms cubic ease-out)
  useEffect(() => {
    if (appState !== 'ready') {
      setOpacity(0.0);
      setIsParallaxActive(false);
      return;
    }

    if (prefersReducedMotion) {
      setOpacity(1.0);
      setIsParallaxActive(true);
      return;
    }

    setOpacity(0.0);
    setIsParallaxActive(false);

    const start = performance.now();
    const duration = 900; // 900ms smooth ease-out fade-in without zoom
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(Math.max(elapsed / duration, 0), 1.0);
      // Cubic ease-out: 1 - (1 - p)^3
      const eased = 1 - Math.pow(1 - p, 3);
      setOpacity(eased);

      if (p < 1.0) {
        frameId = requestAnimationFrame(tick);
      } else {
        setOpacity(1.0);
        setIsParallaxActive(true);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [appState, prefersReducedMotion]);

  // Smooth DOM Parallax (Active strictly after logo appearance is complete)
  useEffect(() => {
    if (appState !== 'ready' || !isParallaxActive || isTouchRef.current || prefersReducedMotion) {
      return;
    }

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

    let animId: number;
    const loop = () => {
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
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animId);
    };
  }, [appState, isParallaxActive, prefersReducedMotion]);

  // Hidden during intro stages
  if (appState !== 'ready') {
    return null;
  }

  // Seamless Handover: DOM logo unmounts ONLY when WebGL has confirmed its first ready frame is drawn.
  // If WebGL is unavailable or lost, DOM logo remains active as fallback.
  if (isWebGLActive && isWebGLReadyFrameDrawn) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id="central-logo-container"
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* Centered with exactly 60vw width, matching viewBox aspect ratio 1920 / 787 */}
      <div
        ref={parallaxWrapperRef}
        id="parallax-wrapper"
        className="w-[60vw] max-h-[85dvh] aspect-[1920/787] relative flex items-center justify-center will-change-transform"
        style={{
          opacity,
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
          <path
            id="base-logo-path"
            d={LOGO_FILLED_PATH}
            fill="#111111"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
};
