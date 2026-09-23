import React, { useEffect, useRef } from 'react';
import { AUTOGRAF_PATHS, AUTOGRAF_VIEWBOX } from '../data/autografData';

interface AutografOverlayProps {
  scrollProgressRef: React.MutableRefObject<number>;
  appState: string;
}

// Precise centerline guide stroke 1: Capital flourish and main stem/loop of 'A'
const STROKE_1 =
  'M 10 295 C 12.5 293.3, 16.7 290.8, 25 285 C 33.3 279.2, 46.7 270.8, 60 260 C 73.3 249.2, 89.2 234.2, 105 220 C 120.8 205.8, 137.5 190.8, 155 175 C 172.5 159.2, 190.8 141.7, 210 125 C 229.2 108.3, 254.2 87.8, 270 75 C 285.8 62.2, 296.7 53.5, 305 48 C 313.3 42.5, 316.2 42.0, 320 42 C 323.8 42.0, 327.7 44.2, 328 48 C 328.3 51.8, 325.8 55.5, 322 65 C 318.2 74.5, 312.8 90.0, 305 105 C 297.2 120.0, 285.8 138.3, 275 155 C 264.2 171.7, 251.7 188.3, 240 205 C 228.3 221.7, 213.3 241.7, 205 255 C 196.7 268.3, 193.8 277.8, 190 285 C 186.2 292.2, 184.0 296.8, 182 298 C 180.0 299.2, 177.3 295.0, 178 292 C 178.7 289.0, 184.7 282.0, 186 280';

// Precise centerline guide stroke 2: Crossbar and cursive letters ("rtDeejay")
const STROKE_2 =
  'M 165 215 C 168.3 213.3, 176.7 208.3, 185 205 C 193.3 201.7, 206.7 195.8, 215 195 C 223.3 194.2, 230.0 197.5, 235 200 C 240.0 202.5, 241.2 213.3, 245 210 C 248.8 206.7, 254.2 185.8, 258 180 C 261.8 174.2, 265.2 170.8, 268 175 C 270.8 179.2, 272.7 194.2, 275 205 C 277.3 215.8, 279.2 238.3, 282 240 C 284.8 241.7, 288.7 226.7, 292 215 C 295.3 203.3, 298.7 180.0, 302 170 C 305.3 160.0, 309.3 152.5, 312 155 C 314.7 157.5, 315.8 173.3, 318 185 C 320.2 196.7, 322.2 225.8, 325 225 C 327.8 224.2, 331.7 195.0, 335 180 C 338.3 165.0, 341.7 144.2, 345 135 C 348.3 125.8, 353.8 118.3, 355 125 C 356.2 131.7, 354.2 156.7, 352 175 C 349.8 193.3, 339.8 231.7, 342 235 C 344.2 238.3, 357.8 210.0, 365 195 C 372.2 180.0, 379.2 155.0, 385 145 C 390.8 135.0, 395.8 131.7, 400 135 C 404.2 138.3, 406.3 164.2, 410 165 C 413.7 165.8, 418.3 146.7, 422 140 C 425.7 133.3, 430.3 127.5, 432 125';

// Precise centerline guide stroke 3: Sweeping underline flourish from right back to left
const STROKE_3 =
  'M 435 135 C 434.2 140.8, 434.2 157.5, 430 170 C 425.8 182.5, 418.3 198.3, 410 210 C 401.7 221.7, 391.7 231.7, 380 240 C 368.3 248.3, 355.0 254.7, 340 260 C 325.0 265.3, 306.7 268.7, 290 272 C 273.3 275.3, 257.5 277.8, 240 280 C 222.5 282.2, 203.3 284.7, 185 285 C 166.7 285.3, 147.5 284.5, 130 282 C 112.5 279.5, 95.0 270.3, 80 270 C 65.0 269.7, 50.8 275.8, 40 280 C 29.2 284.2, 19.2 292.5, 15 295';

export const AutografOverlay: React.FC<AutografOverlayProps> = ({
  scrollProgressRef,
  appState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const maskPath1Ref = useRef<SVGPathElement>(null);
  const maskPath2Ref = useRef<SVGPathElement>(null);
  const maskPath3Ref = useRef<SVGPathElement>(null);
  const visPath1Ref = useRef<SVGPathElement>(null);
  const visPath2Ref = useRef<SVGPathElement>(null);
  const visPath3Ref = useRef<SVGPathElement>(null);
  const penTipRef = useRef<SVGCircleElement>(null);
  const fullMaskRef = useRef<SVGRectElement>(null);

  const len1Ref = useRef<number>(1000);
  const len2Ref = useRef<number>(1100);
  const len3Ref = useRef<number>(750);

  // Measure path lengths on mount
  useEffect(() => {
    const initStroke = (
      maskEl: SVGPathElement | null,
      visEl: SVGPathElement | null,
      fallbackLen: number,
      lenRef: React.MutableRefObject<number>
    ) => {
      let l = fallbackLen;
      if (maskEl) {
        try {
          const measured = maskEl.getTotalLength();
          if (measured && !isNaN(measured) && measured > 0) l = measured;
        } catch {
          // fallback
        }
        lenRef.current = l;
        maskEl.style.strokeDasharray = `${l}`;
        maskEl.style.strokeDashoffset = `${l}`;
      }
      if (visEl) {
        visEl.style.strokeDasharray = `${l}`;
        visEl.style.strokeDashoffset = `${l}`;
      }
    };

    initStroke(maskPath1Ref.current, visPath1Ref.current, 1000, len1Ref);
    initStroke(maskPath2Ref.current, visPath2Ref.current, 1100, len2Ref);
    initStroke(maskPath3Ref.current, visPath3Ref.current, 750, len3Ref);
  }, []);

  // Update stroke curves drawing in real time along with scroll progress
  useEffect(() => {
    if (appState !== 'ready') return;

    let animId: number;

    const updateFrame = () => {
      const p = scrollProgressRef.current;

      // Autograph curve drawing starts around p = 0.14 and finishes by p = 0.90
      const startP = 0.14;
      const endP = 0.90;
      const revealProgress = Math.min(Math.max((p - startP) / (endP - startP), 0.0), 1.0);

      // 3 sequential stroke curve segments:
      // Stroke 1: 0.0 -> 0.38
      // Stroke 2: 0.38 -> 0.74
      // Stroke 3: 0.74 -> 1.0
      const split1 = 0.38;
      const split2 = 0.74;

      const prog1 = Math.min(Math.max(revealProgress / split1, 0.0), 1.0);
      const prog2 = Math.min(Math.max((revealProgress - split1) / (split2 - split1), 0.0), 1.0);
      const prog3 = Math.min(Math.max((revealProgress - split2) / (1.0 - split2), 0.0), 1.0);

      let activePt: { x: number; y: number } | null = null;

      if (maskPath1Ref.current && visPath1Ref.current) {
        const offset1 = len1Ref.current * (1.0 - prog1);
        maskPath1Ref.current.style.strokeDashoffset = `${offset1}`;
        visPath1Ref.current.style.strokeDashoffset = `${offset1}`;
        if (prog1 > 0 && prog1 < 1.0) {
          try {
            activePt = maskPath1Ref.current.getPointAtLength(prog1 * len1Ref.current);
          } catch {
            // ignore
          }
        }
      }

      if (maskPath2Ref.current && visPath2Ref.current) {
        const offset2 = len2Ref.current * (1.0 - prog2);
        maskPath2Ref.current.style.strokeDashoffset = `${offset2}`;
        visPath2Ref.current.style.strokeDashoffset = `${offset2}`;
        if (prog1 >= 1.0 && prog2 > 0 && prog2 < 1.0) {
          try {
            activePt = maskPath2Ref.current.getPointAtLength(prog2 * len2Ref.current);
          } catch {
            // ignore
          }
        }
      }

      if (maskPath3Ref.current && visPath3Ref.current) {
        const offset3 = len3Ref.current * (1.0 - prog3);
        maskPath3Ref.current.style.strokeDashoffset = `${offset3}`;
        visPath3Ref.current.style.strokeDashoffset = `${offset3}`;
        if (prog2 >= 1.0 && prog3 > 0 && prog3 < 1.0) {
          try {
            activePt = maskPath3Ref.current.getPointAtLength(prog3 * len3Ref.current);
          } catch {
            // ignore
          }
        }
      }

      // Pen tip position tracing the leading edge of the active curve (matte, no glow)
      if (penTipRef.current) {
        if (activePt && revealProgress > 0.01 && revealProgress < 0.98) {
          penTipRef.current.setAttribute('cx', `${activePt.x.toFixed(1)}`);
          penTipRef.current.setAttribute('cy', `${activePt.y.toFixed(1)}`);
          penTipRef.current.style.opacity = '1';
        } else {
          penTipRef.current.style.opacity = '0';
        }
      }

      // If fully revealed (>= 0.98), unmask completely for 100% crisp vector display
      if (fullMaskRef.current) {
        fullMaskRef.current.style.opacity = revealProgress >= 0.98 ? '1' : '0';
      }

      // Container overall opacity fade in between p = 0.12 and 0.18
      if (containerRef.current) {
        if (p < 0.12) {
          containerRef.current.style.opacity = '0';
        } else {
          const fadeT = Math.min((p - 0.12) / 0.06, 1.0);
          containerRef.current.style.opacity = `${fadeT}`;
        }
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
      id="autograf-overlay-container"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center will-change-transform select-none"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      <div
        className="relative flex items-center justify-center w-[66vw] md:w-[46vw] max-w-[760px]"
        style={{
          // Perfectly positioned right across the central logo
          transform: 'translateY(-2%)',
        }}
      >
        <svg
          viewBox={AUTOGRAF_VIEWBOX.viewBoxStr}
          className="w-full h-auto overflow-visible block"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="autograf-reveal-mask" maskUnits="userSpaceOnUse">
              {/* Black background initially hides unrevealed paths */}
              <rect width="595" height="345" fill="black" />

              {/* Mask Stroke 1: Capital flourish and main stem of 'A' */}
              <path
                ref={maskPath1Ref}
                d={STROKE_1}
                fill="none"
                stroke="white"
                strokeWidth="56"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Mask Stroke 2: Crossbar and cursive letters ("rtDeejay") */}
              <path
                ref={maskPath2Ref}
                d={STROKE_2}
                fill="none"
                stroke="white"
                strokeWidth="52"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Mask Stroke 3: Sweeping underline flourish */}
              <path
                ref={maskPath3Ref}
                d={STROKE_3}
                fill="none"
                stroke="white"
                strokeWidth="54"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Full unmask when signature drawing reaches completion */}
              <rect
                ref={fullMaskRef}
                width="595"
                height="345"
                fill="white"
                style={{ opacity: 0, transition: 'opacity 0.25s ease-out' }}
              />
            </mask>
          </defs>

          {/* Layer A: Full calligraphy body revealed by the curve mask (crisp cyan, matte, zero glow) */}
          <g mask="url(#autograf-reveal-mask)">
            {AUTOGRAF_PATHS.map((pathD, idx) => (
              <path
                key={idx}
                d={pathD}
                fill="#65DFF0"
                style={{
                  filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.40))',
                }}
              />
            ))}
          </g>

          {/* Layer B: Visible Vector Lines of Curves that trace the cursive path (matte cyan, zero glow) */}
          <g style={{ filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35))' }}>
            <path
              ref={visPath1Ref}
              d={STROKE_1}
              fill="none"
              stroke="#65DFF0"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              ref={visPath2Ref}
              d={STROKE_2}
              fill="none"
              stroke="#65DFF0"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              ref={visPath3Ref}
              d={STROKE_3}
              fill="none"
              stroke="#65DFF0"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Leading Pen Tip: Solid cyan dot without glow */}
          <circle
            ref={penTipRef}
            cx="0"
            cy="0"
            r="3.5"
            fill="#65DFF0"
            style={{
              opacity: 0,
              transition: 'opacity 0.15s ease-out',
            }}
          />
        </svg>
      </div>
    </div>
  );
};
