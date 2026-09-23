import React, { useEffect, useRef, useState } from 'react';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { AppState } from '../types';
import { AutografSVG } from './AutografOverlay';

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
  // Parallax wrapper contains both the rectangle and the signature
  const parallaxWrapperRef = useRef<HTMLDivElement>(null);

  // Unified composition frame defining the physical bounds of the central plane
  const compositionFrameRef = useRef<HTMLDivElement>(null);

  // Rectangle plane elements
  const rectRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Smooth entrance fade-in (900ms cubic ease-out) when transitioning from intro to ready
  const [initialOpacity, setInitialOpacity] = useState<number>(() =>
    prefersReducedMotion ? 1.0 : 0.0
  );

  // Parallax mouse position
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  // Developer debug mode (toggleable via 'D' key or ?debug_autograf=true)
  const [debugActive, setDebugActive] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get('debug_autograf') === 'true';
    } catch {
      return false;
    }
  });
  const [manualProgress, setManualProgress] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setDebugActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Unified animation loop for geometry, colors, darkening, and 3D parallax
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

      // 1. Unified composition geometry calculation:
      // - progress 0 -> 0.30: scales from 1.0 (75vw) down to 0.80 (60vw)
      // - progress 0.30 -> 0.85: scales from 60vw down to final 34vw on desktop, 60vw on mobile
      // - progress >= 0.85: locked at final scale
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

      // Height constraint: exactly 1.55:1 aspect ratio, clamped by viewport height minus header space
      const maxAvailableHeight = window.innerHeight - 130;
      let calculatedWidthPx = (targetVw / 100) * window.innerWidth;
      const calculatedHeightPx = calculatedWidthPx / 1.55;

      if (calculatedHeightPx > maxAvailableHeight) {
        calculatedWidthPx = maxAvailableHeight * 1.55;
      }

      const finalHeightPx = calculatedWidthPx / 1.55;

      // 2. Composition frame sizing (scroll controls scale)
      if (compositionFrameRef.current) {
        compositionFrameRef.current.style.width = `${calculatedWidthPx.toFixed(1)}px`;
        compositionFrameRef.current.style.height = `${finalHeightPx.toFixed(1)}px`;
      }

      // 3. Rectangular plane darkening:
      // Starts after 20% scale reduction (p >= 0.30)
      let darkenT = 0.0;
      if (p > 0.30) {
        darkenT = Math.min((p - 0.30) / (0.85 - 0.30), 1.0);
      }

      // Background color transitions from white (255, 255, 255) to dark blue-gray (20, 37, 48)
      const bgR = Math.round(255 - (255 - 20) * darkenT);
      const bgG = Math.round(255 - (255 - 37) * darkenT);
      const bgB = Math.round(255 - (255 - 48) * darkenT);

      if (bgRef.current) {
        bgRef.current.style.backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;
      }

      // Final darkening overlay strength: reduced from 0.60 to ~0.48 as instructed
      const overlayOpacity = darkenT * 0.48;
      if (overlayRef.current) {
        overlayRef.current.style.opacity = `${overlayOpacity.toFixed(3)}`;
      }

      // 4. Smooth 3D tilt Parallax on the outer wrapper (desktop only)
      // Parallax and scroll scale are decoupled: scroll scales the frame, mouse tilts the outer wrapper
      if (!isTouchRef.current && !prefersReducedMotion && parallaxWrapperRef.current) {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;
        current.x += (target.x - current.x) * 0.05;
        current.y += (target.y - current.y) * 0.05;

        const rotY = current.x * 2.8; // max 2.8 deg
        const rotX = -current.y * 2.2; // max 2.2 deg
        const transX = current.x * 4.0; // max 4px
        const transY = current.y * 3.0;

        parallaxWrapperRef.current.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, 0)`;
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
      ref={parallaxWrapperRef}
      id="central-stage-wrapper"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center select-none will-change-transform"
      style={{
        opacity: initialOpacity,
      }}
      aria-hidden="true"
    >
      {/* Unified Composition Frame: Rectangle and Autograf share the exact same center and scale */}
      <div
        ref={compositionFrameRef}
        id="central-composition-frame"
        className="relative flex items-center justify-center will-change-[width,height]"
        style={{
          width: '75vw',
          aspectRatio: '1.55 / 1',
        }}
      >
        {/* ============================================================ */}
        {/* Layer A: Rectangular plane (aspect ratio ~1.55:1, square corners, no border, no shadow) */}
        {/* ============================================================ */}
        <div
          ref={rectRef}
          id="central-rectangular-plane"
          className="relative w-full h-full overflow-hidden rounded-none border-0 shadow-none"
        >
          {/* Isolated group containing background and difference logo */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{ isolation: 'isolate' }}
          >
            {/* Background layer */}
            <div
              ref={bgRef}
              className="absolute inset-0 bg-[#FFFFFF] transition-colors"
            />

            {/* Logo: Monochromatic SVG with mix-blend-mode: difference and delicate contrast edge */}
            <div className="relative z-10 flex items-center justify-center w-[80%] max-h-[85%] aspect-[1920/787] m-auto h-full">
              <svg
                viewBox={LOGO_VIEWBOX}
                className="w-full h-full block overflow-visible"
                role="img"
                aria-label="ArtDeejay"
                style={{
                  mixBlendMode: 'difference',
                  // Subtle dual contrast rim preventing washout in intermediate gray tones
                  filter:
                    'drop-shadow(0 0 1px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 1px rgba(255, 255, 255, 0.35))',
                }}
              >
                <path
                  d={LOGO_FILLED_PATH}
                  fill="#FFFFFF"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Darkening overlay on top of the isolated logo group */}
          <div
            ref={overlayRef}
            className="absolute inset-0 z-20 pointer-events-none bg-[#020e17]"
            style={{ opacity: 0 }}
          />
        </div>

        {/* ============================================================ */}
        {/* Layer B: Progressive Autograf Signature Overlay */}
        {/* Placed OUTSIDE the rectangle's overflow: hidden so flourishes can extend past edges */}
        {/* Sized to exactly 140% of the rectangle width and centered */}
        {/* Positioned above the darkening overlay so signature maintains luminous cyan */}
        {/* ============================================================ */}
        <div
          id="central-autograf-layer"
          className="absolute pointer-events-none z-30 flex items-center justify-center"
          style={{
            width: '140%',
            aspectRatio: '595 / 345',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <AutografSVG
            scrollProgressRef={scrollProgressRef}
            debugMode={debugActive}
            manualProgress={manualProgress}
          />
        </div>
      </div>

      {/* Developer Debug Panel (activated via 'D' key or ?debug_autograf=true) */}
      {debugActive && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-neutral-900/95 border border-cyan-500/40 text-xs text-white shadow-2xl font-mono flex flex-col gap-2.5 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center justify-between gap-4 font-bold text-cyan-400">
            <span>AUTOGRAF DEBUG MODE</span>
            <button
              onClick={() => setDebugActive(false)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              Close [D]
            </button>
          </div>
          <div className="text-[11px] text-neutral-400">
            Faint reference SVG is shown in red. Guide trajectories are colored.
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
            <input
              type="checkbox"
              checked={manualProgress !== null}
              onChange={(e) => setManualProgress(e.target.checked ? 0.5 : null)}
            />
            <span>Manual Progress Slider</span>
          </label>
          {manualProgress !== null && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>revealProgress:</span>
                <span className="text-cyan-300 font-bold">{manualProgress.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={manualProgress}
                onChange={(e) => setManualProgress(parseFloat(e.target.value))}
                className="w-56 cursor-pointer accent-cyan-400"
              />
              <div className="flex gap-1 mt-1 flex-wrap">
                {[0, 0.18, 0.32, 0.48, 0.62, 0.70, 0.85, 1.0].map((step) => (
                  <button
                    key={step}
                    onClick={() => setManualProgress(step)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyan-500/20 text-[10px] text-cyan-200 cursor-pointer"
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
