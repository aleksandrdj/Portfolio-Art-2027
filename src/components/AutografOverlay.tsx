import React, { useEffect, useRef } from 'react';
import { AUTOGRAF_PATHS, AUTOGRAF_VIEWBOX } from '../data/autografData';

interface AutografOverlayProps {
  scrollProgressRef: React.MutableRefObject<number>;
  appState: string;
}

// Centerline guide stroke Part A (main handwriting)
const GUIDE_PATH_A =
  'M 10 295 C 35 285, 75 250, 130 195 C 190 140, 250 85, 290 52 C 315 42, 330 48, 335 70 C 315 105, 280 155, 240 210 C 205 265, 192 295, 205 295 C 220 280, 235 250, 245 230 C 265 185, 280 160, 295 165 C 285 210, 280 245, 295 255 C 310 230, 325 185, 335 140 C 345 125, 355 135, 345 185 C 335 225, 330 250, 345 255 C 365 220, 385 175, 405 145 C 425 130, 435 140, 420 175 C 395 225, 370 260, 345 275';

// Centerline guide stroke Part B (underline flourish and loop)
const GUIDE_PATH_B =
  'M 145 285 C 200 268, 270 245, 340 220 C 410 195, 470 175, 530 158 C 575 148, 586 150, 565 165 C 515 185, 450 208, 380 230 C 310 250, 240 268, 170 282 C 115 292, 95 294, 90 295';

export const AutografOverlay: React.FC<AutografOverlayProps> = ({
  scrollProgressRef,
  appState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathARef = useRef<SVGPathElement>(null);
  const pathBRef = useRef<SVGPathElement>(null);
  const fullMaskRef = useRef<SVGRectElement>(null);

  const lenARef = useRef<number>(2500);
  const lenBRef = useRef<number>(1500);

  // Measure path lengths on mount
  useEffect(() => {
    if (pathARef.current) {
      const lenA = pathARef.current.getTotalLength() || 2500;
      lenARef.current = lenA;
      pathARef.current.style.strokeDasharray = `${lenA}`;
      pathARef.current.style.strokeDashoffset = `${lenA}`;
    }
    if (pathBRef.current) {
      const lenB = pathBRef.current.getTotalLength() || 1500;
      lenBRef.current = lenB;
      pathBRef.current.style.strokeDasharray = `${lenB}`;
      pathBRef.current.style.strokeDashoffset = `${lenB}`;
    }
  }, []);

  // Update strokeDashoffset along centerline guides without triggering React re-renders
  useEffect(() => {
    if (appState !== 'ready') return;

    let animId: number;

    const updateFrame = () => {
      const p = scrollProgressRef.current;

      // Specification: reveal begins at scrollProgress = 0.25 and finishes at 0.90
      const startP = 0.25;
      const endP = 0.90;
      const revealProgress = Math.min(Math.max((p - startP) / (endP - startP), 0.0), 1.0);

      // Part A: 0.0 -> 0.55
      // Part B: 0.55 -> 1.0
      const split = 0.55;
      const progA = Math.min(Math.max(revealProgress / split, 0.0), 1.0);
      const progB = Math.min(Math.max((revealProgress - split) / (1.0 - split), 0.0), 1.0);

      if (pathARef.current) {
        const offsetA = lenARef.current * (1.0 - progA);
        pathARef.current.style.strokeDashoffset = `${offsetA}`;
      }

      if (pathBRef.current) {
        const offsetB = lenBRef.current * (1.0 - progB);
        pathBRef.current.style.strokeDashoffset = `${offsetB}`;
      }

      // If fully revealed (>= 0.90), unmask completely for any remaining micro-dots
      if (fullMaskRef.current) {
        fullMaskRef.current.style.opacity = revealProgress >= 0.98 ? '1' : '0';
      }

      // Container visibility
      if (containerRef.current) {
        containerRef.current.style.opacity = p < 0.23 ? '0' : '1';
      }

      animId = requestAnimationFrame(updateFrame);
    };

    animId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animId);
  }, [appState, scrollProgressRef]);

  if (appState !== 'ready') return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      <div
        className="relative flex items-center justify-center w-[66vw] md:w-[44vw] max-w-[720px]"
        style={{
          // Slightly above the center of the logo as requested
          transform: 'translateY(-14%)',
        }}
      >
        <svg
          viewBox={AUTOGRAF_VIEWBOX.viewBoxStr}
          className="w-full h-auto overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="autograf-reveal-mask" maskUnits="userSpaceOnUse">
              {/* Black background hides unrevealed paths */}
              <rect width="595" height="345" fill="black" />

              {/* Stroke A: Initial cursive flourish and letters */}
              <path
                ref={pathARef}
                d={GUIDE_PATH_A}
                fill="none"
                stroke="white"
                strokeWidth="56"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Stroke B: Underline flourish across and back */}
              <path
                ref={pathBRef}
                d={GUIDE_PATH_B}
                fill="none"
                stroke="white"
                strokeWidth="56"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Final complete unmask when fully drawn */}
              <rect
                ref={fullMaskRef}
                width="595"
                height="345"
                fill="white"
                style={{ opacity: 0, transition: 'opacity 0.2s ease-out' }}
              />
            </mask>
          </defs>

          {/* Original filled paths masked by progressive centerline strokes */}
          <g mask="url(#autograf-reveal-mask)">
            {AUTOGRAF_PATHS.map((pathD, idx) => (
              <path
                key={idx}
                d={pathD}
                fill="#65DFF0"
                style={{ filter: 'drop-shadow(0 2px 12px rgba(101, 223, 240, 0.45))' }}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};
