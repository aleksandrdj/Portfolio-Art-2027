import React, { useEffect, useRef } from 'react';
import { AUTOGRAF_PATHS, AUTOGRAF_VIEWBOX } from '../data/autografData';

interface AutografOverlayProps {
  scrollProgressRef: React.MutableRefObject<number>;
  appState: string;
}

// Centerline guide strokes along actual ink trajectories:
// Segment 0A: Initial cursive upward flourish and main ascender/descender of first letter
const GUIDE_0A =
  'M 10 295 C 10 305, 18 305, 25 298 C 45 280, 85 245, 140 195 C 195 145, 260 85, 305 50 C 315 42, 325 40, 326 50 C 326 60, 318 80, 300 115 C 275 160, 235 230, 205 275 C 195 290, 182 298, 185 292';

// Segment 0B: Connecting loops and middle lowercase cursive letters
const GUIDE_0B =
  'M 185 292 C 188 285, 200 270, 218 245 C 238 215, 265 170, 280 165 C 290 162, 285 190, 275 225 C 270 245, 275 258, 290 255 C 305 240, 320 195, 335 150 C 345 125, 355 120, 356 130 C 356 145, 345 180, 335 220 C 330 245, 340 255, 355 245';

// Segment 0C: Right cursive terminal loop and flourish
const GUIDE_0C =
  'M 355 245 C 375 220, 405 160, 428 125 C 435 122, 436 130, 430 145 C 420 175, 395 225, 365 265 C 350 280, 338 285, 335 280';

// Segment 1A: Dynamic lower underline stroke gliding smoothly left to right
const GUIDE_1A =
  'M 145 285 C 210 265, 310 235, 410 198 C 490 168, 550 150, 582 152';

// Segment 1B: Terminal flourish loop on the right and fast whip-back return to the left
const GUIDE_1B =
  'M 582 152 C 588 155, 586 165, 570 174 C 520 198, 440 225, 360 250 C 270 272, 180 288, 120 295 C 100 297, 92 295, 92 293';

export const AutografOverlay: React.FC<AutografOverlayProps> = ({
  scrollProgressRef,
  appState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const path0ARef = useRef<SVGPathElement>(null);
  const path0BRef = useRef<SVGPathElement>(null);
  const path0CRef = useRef<SVGPathElement>(null);
  const path1ARef = useRef<SVGPathElement>(null);
  const path1BRef = useRef<SVGPathElement>(null);

  const fullMask0Ref = useRef<SVGRectElement>(null);
  const fullMask1Ref = useRef<SVGRectElement>(null);

  const len0ARef = useRef<number>(1000);
  const len0BRef = useRef<number>(1000);
  const len0CRef = useRef<number>(800);
  const len1ARef = useRef<number>(800);
  const len1BRef = useRef<number>(1000);

  // Measure path lengths on mount and initialize stroke-dash properties
  useEffect(() => {
    const setupPath = (path: SVGPathElement | null, lenRef: React.MutableRefObject<number>, fallback: number) => {
      if (!path) return;
      const len = path.getTotalLength() || fallback;
      lenRef.current = len;
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
    };

    setupPath(path0ARef.current, len0ARef, 1000);
    setupPath(path0BRef.current, len0BRef, 1000);
    setupPath(path0CRef.current, len0CRef, 800);
    setupPath(path1ARef.current, len1ARef, 800);
    setupPath(path1BRef.current, len1BRef, 1000);
  }, []);

  // Update strokeDashoffsets based on single unified scrollProgress
  useEffect(() => {
    if (appState !== 'ready') return;

    let animId: number;

    const updateFrame = () => {
      const p = Math.min(Math.max(scrollProgressRef.current, 0.0), 1.0);
      const isMobile = window.innerWidth < 768;

      // Specification:
      // progress 0 - 0.30: scale reaches 0.80; autograf is COMPLETELY HIDDEN.
      // progress 0.30 - 0.85: gradual continuous writing of the signature.
      // progress 0.85 - 1.0: final state locked and preserved.
      const START_P = 0.30;
      const END_P = 0.85;

      if (p <= START_P) {
        if (containerRef.current) {
          containerRef.current.style.display = 'none';
        }
        animId = requestAnimationFrame(updateFrame);
        return;
      }

      if (containerRef.current) {
        containerRef.current.style.display = 'flex';
      }

      // 1. Calculate dynamic responsive width: exactly ~140% of the rectangular plane width
      // Rectangle width:
      // p <= 0.30: 60vw
      // p 0.30 -> 0.85: 60vw -> (isMobile ? 60vw : 34vw)
      // p >= 0.85: (isMobile ? 60vw : 34vw)
      let rectVw = 60;
      if (p <= END_P) {
        const t = (p - START_P) / (END_P - START_P);
        const finalRectVw = isMobile ? 60 : 34;
        rectVw = 60 - (60 - finalRectVw) * t;
      } else {
        rectVw = isMobile ? 60 : 34;
      }

      // Autograf width = 140% of rectangle width, clamped to max 94vw on screen
      const autografVw = Math.min(rectVw * 1.40, 94);

      if (wrapperRef.current) {
        wrapperRef.current.style.width = `${autografVw.toFixed(1)}vw`;
      }

      // 2. Sequential pen movement along the 5 centerline segments
      const revealProgress = Math.min(Math.max((p - START_P) / (END_P - START_P), 0.0), 1.0);

      // Timing allocation for the continuous pen stroke:
      // Segment 0A: 0.00 -> 0.22 (Main ascender of first letter)
      // Segment 0B: 0.22 -> 0.40 (Middle cursive letters)
      // Segment 0C: 0.40 -> 0.54 (Terminal loop of letters)
      // Segment 1A: 0.54 -> 0.78 (Underline flourish from left to right)
      // Segment 1B: 0.78 -> 1.00 (Flourish loop and whip-back to the left)
      const subProg = (val: number, start: number, end: number) =>
        Math.min(Math.max((val - start) / (end - start), 0.0), 1.0);

      const prog0A = subProg(revealProgress, 0.00, 0.22);
      const prog0B = subProg(revealProgress, 0.22, 0.40);
      const prog0C = subProg(revealProgress, 0.40, 0.54);
      const prog1A = subProg(revealProgress, 0.54, 0.78);
      const prog1B = subProg(revealProgress, 0.78, 1.00);

      if (path0ARef.current) {
        path0ARef.current.style.strokeDashoffset = `${len0ARef.current * (1.0 - prog0A)}`;
      }
      if (path0BRef.current) {
        path0BRef.current.style.strokeDashoffset = `${len0BRef.current * (1.0 - prog0B)}`;
      }
      if (path0CRef.current) {
        path0CRef.current.style.strokeDashoffset = `${len0CRef.current * (1.0 - prog0C)}`;
      }
      if (path1ARef.current) {
        path1ARef.current.style.strokeDashoffset = `${len1ARef.current * (1.0 - prog1A)}`;
      }
      if (path1BRef.current) {
        path1BRef.current.style.strokeDashoffset = `${len1BRef.current * (1.0 - prog1B)}`;
      }

      // Complete unmasking when signature writing is finished (reveals any microscopic vector dots)
      const isComplete = revealProgress >= 0.99;
      if (fullMask0Ref.current) {
        fullMask0Ref.current.style.opacity = isComplete ? '1' : '0';
      }
      if (fullMask1Ref.current) {
        fullMask1Ref.current.style.opacity = isComplete ? '1' : '0';
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
      id="autograf-stage-container"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center select-none"
      style={{ display: 'none' }}
      aria-hidden="true"
    >
      {/* Wrapper aligned with central composition, sized to ~140% of rectangle */}
      <div
        ref={wrapperRef}
        id="autograf-aspect-wrapper"
        className="relative flex items-center justify-center aspect-[595/345] will-change-[width]"
        style={{
          width: '84vw',
          maxWidth: '94vw',
        }}
      >
        <svg
          viewBox={AUTOGRAF_VIEWBOX.viewBoxStr}
          className="w-full h-full block overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Mask for Part 0 (Main handwriting text): Segments 0A, 0B, 0C */}
            <mask id="autograf-mask-upper" maskUnits="userSpaceOnUse">
              <rect width="595" height="345" fill="black" />

              <path
                ref={path0ARef}
                d={GUIDE_0A}
                fill="none"
                stroke="white"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                ref={path0BRef}
                d={GUIDE_0B}
                fill="none"
                stroke="white"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                ref={path0CRef}
                d={GUIDE_0C}
                fill="none"
                stroke="white"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <rect
                ref={fullMask0Ref}
                width="595"
                height="345"
                fill="white"
                style={{ opacity: 0 }}
              />
            </mask>

            {/* Mask for Part 1 (Underline and loop flourish): Segments 1A, 1B */}
            <mask id="autograf-mask-flourish" maskUnits="userSpaceOnUse">
              <rect width="595" height="345" fill="black" />

              <path
                ref={path1ARef}
                d={GUIDE_1A}
                fill="none"
                stroke="white"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                ref={path1BRef}
                d={GUIDE_1B}
                fill="none"
                stroke="white"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <rect
                ref={fullMask1Ref}
                width="595"
                height="345"
                fill="white"
                style={{ opacity: 0 }}
              />
            </mask>
          </defs>

          {/* Original filled paths: Part 0 masked by upper guides, Part 1 masked by flourish guides */}
          <path
            d={AUTOGRAF_PATHS[0]}
            fill="#65DFF0"
            mask="url(#autograf-mask-upper)"
          />
          <path
            d={AUTOGRAF_PATHS[1]}
            fill="#65DFF0"
            mask="url(#autograf-mask-flourish)"
          />
        </svg>
      </div>
    </div>
  );
};
