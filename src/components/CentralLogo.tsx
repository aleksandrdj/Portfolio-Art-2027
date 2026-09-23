import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX, REVEAL_STROKE_PATHS } from '../data/logoData';
import { AppState } from '../types';

interface CentralLogoProps {
  appState: AppState;
  onThemeTransitionStart?: () => void;
  onIntroComplete: () => void;
  prefersReducedMotion: boolean;
  isWebGLActive?: boolean;
  isWebGLReadyFrameDrawn?: boolean;
}

export const CentralLogo: React.FC<CentralLogoProps> = ({
  appState,
  onThemeTransitionStart,
  onIntroComplete,
  prefersReducedMotion,
  isWebGLActive = false,
  isWebGLReadyFrameDrawn = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parallaxWrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tipRef = useRef<SVGCircleElement | null>(null);
  const tipGlowRef = useRef<SVGCircleElement | null>(null);
  const strokeElementsRef = useRef<(SVGPathElement | null)[]>([]);

  // Parallax state for DOM fallback
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  // Stable callbacks references so changing callbacks or appState never recreates timeline
  const callbacksRef = useRef({ onThemeTransitionStart, onIntroComplete });
  useEffect(() => {
    callbacksRef.current = { onThemeTransitionStart, onIntroComplete };
  });

  // Base logo color: white during intro, #111111 after transition
  const [logoFill, setLogoFill] = useState<string>(
    prefersReducedMotion || appState === 'ready' ? '#111111' : '#FFFFFF'
  );
  const [introMaskActive, setIntroMaskActive] = useState<boolean>(
    !prefersReducedMotion && appState !== 'ready'
  );

  // Detect touch device
  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // GSAP Intro Timeline
  useEffect(() => {
    if (prefersReducedMotion) {
      setLogoFill('#111111');
      setIntroMaskActive(false);
      callbacksRef.current.onIntroComplete();
      return;
    }

    setIntroMaskActive(true);
    setLogoFill('#FFFFFF');

    // Get reveal stroke paths
    let strokePaths = strokeElementsRef.current.filter(Boolean) as SVGPathElement[];
    if (strokePaths.length === 0 && svgRef.current) {
      strokePaths = Array.from(
        svgRef.current.querySelectorAll('#intro-signature-mask path')
      ) as SVGPathElement[];
    }

    if (strokePaths.length === 0) return;

    // Safely measure stroke lengths
    const strokeLengths = strokePaths.map((path) => {
      let len = 0;
      try {
        len = path.getTotalLength();
      } catch {
        len = 500;
      }
      const safeLen = len > 1 ? len : 500;
      path.style.strokeDasharray = `${safeLen}`;
      path.style.strokeDashoffset = `${safeLen}`;
      return safeLen;
    });

    const tip = tipRef.current;
    const tipGlow = tipGlowRef.current;

    if (strokePaths[0] && tip && tipGlow) {
      let startPt = { x: 203, y: 278 };
      try {
        startPt = strokePaths[0].getPointAtLength(0);
      } catch {
        // fallback
      }
      tip.setAttribute('cx', `${startPt.x}`);
      tip.setAttribute('cy', `${startPt.y}`);
      tipGlow.setAttribute('cx', `${startPt.x}`);
      tipGlow.setAttribute('cy', `${startPt.y}`);
    }

    // Build Master Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        // Reveal 100% of the SVG logo at completion
        setIntroMaskActive(false);
        setLogoFill('#111111');
        callbacksRef.current.onIntroComplete();
      },
    });

    // 1. Initial black screen hold (0.15s)
    tl.to({}, { duration: 0.15 });

    // 2. Fade in small brush tip (0.1s)
    if (tip && tipGlow) {
      tl.to([tip, tipGlow], {
        opacity: 0.9,
        duration: 0.1,
        ease: 'power1.out',
      });
    }

    // 3. Sequential calligraphy drawing (duration: 2.25s)
    const TOTAL_DRAW_TIME = 2.25;
    strokePaths.forEach((path, idx) => {
      const info = REVEAL_STROKE_PATHS[idx] || { durationRatio: 1 / strokePaths.length };
      const len = strokeLengths[idx];
      const duration = TOTAL_DRAW_TIME * info.durationRatio;

      tl.to(
        {},
        {
          duration,
          ease: 'power1.inOut',
          onUpdate: function () {
            const p = this.progress();
            const currentLen = p * len;
            path.style.strokeDashoffset = `${len - currentLen}`;

            if (tip && tipGlow) {
              try {
                const pt = path.getPointAtLength(currentLen);
                tip.setAttribute('cx', `${pt.x}`);
                tip.setAttribute('cy', `${pt.y}`);
                tipGlow.setAttribute('cx', `${pt.x}`);
                tipGlow.setAttribute('cy', `${pt.y}`);
              } catch {
                // ignore
              }
            }
          },
          onComplete: () => {
            path.style.strokeDashoffset = '0';
          },
        },
        idx === 0 ? undefined : '>-0.01'
      );
    });

    // 4. Fade out glowing tip (0.15s)
    if (tip && tipGlow) {
      tl.to(
        [tip, tipGlow],
        {
          opacity: 0,
          duration: 0.15,
          ease: 'power2.out',
        },
        '+=0.05'
      );
    }

    // Fully unmask logo before hold & theme transition as required
    tl.call(() => {
      setIntroMaskActive(false);
    });

    // 5. Brief hold on white signature over black (0.2s)
    tl.to({}, { duration: 0.2 });

    // 6. Theme transition (0.8s): black background transitions to white, logo to #111111
    tl.to(
      {},
      {
        duration: 0.8,
        ease: 'power2.inOut',
        onStart: () => {
          callbacksRef.current.onThemeTransitionStart?.();
        },
        onUpdate: function () {
          const p = this.progress();
          if (p < 0.35) {
            setLogoFill('#FFFFFF');
          } else {
            const colorProgress = (p - 0.35) / 0.65;
            const v = Math.round(255 - colorProgress * (255 - 17));
            const hex = `#${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}`;
            setLogoFill(hex);
          }
        },
      }
    );

    // Pause / Resume on visibilitychange
    const onVisibilityChange = () => {
      if (document.hidden) {
        tl.pause();
      } else {
        tl.resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      tl.kill();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [prefersReducedMotion]);

  // Fallback DOM 3D Parallax: only runs if WebGL is NOT active and in ready state
  useEffect(() => {
    if (isWebGLActive || appState !== 'ready' || prefersReducedMotion || isTouchRef.current) {
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

        const rotY = current.x * 4.0;
        const rotX = -current.y * 3.0;
        const transX = current.x * 5.0;
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
  }, [isWebGLActive, appState, prefersReducedMotion]);

  // Seamless Handover (Requirement 3):
  // DOM logo unmounts ONLY when WebGL has confirmed its first ready frame is drawn on screen.
  // If WebGL is unavailable or lost, DOM logo remains active as fallback.
  if (appState === 'ready' && isWebGLActive && isWebGLReadyFrameDrawn) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id="central-logo-container"
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* Parallax Container: centered with matching aspect ratio 1920 / 787 */}
      <div
        ref={parallaxWrapperRef}
        id="parallax-wrapper"
        className="w-[82vw] md:w-[50vw] max-w-[850px] aspect-[1920/787] relative flex items-center justify-center will-change-transform"
        style={{
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
        }}
      >
        <svg
          ref={svgRef}
          id="artdeejay-main-svg"
          viewBox={LOGO_VIEWBOX}
          className="w-full h-full block overflow-visible"
          role="img"
          aria-label="ArtDeejay"
        >
          <defs>
            {/* Small subtle glow filter for drawing brush tip */}
            <filter id="tip-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intro Reveal Mask: Uncovers the logo as stroke paths are animated */}
            {introMaskActive && (
              <mask id="intro-signature-mask" maskUnits="userSpaceOnUse">
                {/* Black background hides unrevealed portions */}
                <rect width="1920" height="787" fill="black" />
                {/* Guide paths uncover the logo progressively */}
                {REVEAL_STROKE_PATHS.map((stroke, index) => (
                  <path
                    key={stroke.id}
                    ref={(el) => {
                      strokeElementsRef.current[index] = el;
                    }}
                    d={stroke.d}
                    fill="none"
                    stroke="white"
                    strokeWidth={stroke.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </mask>
            )}
          </defs>

          {/* Base Logo Path with evenodd rule and clip-rule */}
          <path
            id="base-logo-path"
            d={LOGO_FILLED_PATH}
            fill={logoFill}
            fillRule="evenodd"
            clipRule="evenodd"
            mask={introMaskActive ? 'url(#intro-signature-mask)' : undefined}
          />

          {/* Glowing Brush Tip during Intro: small, refined tip without large balls */}
          {introMaskActive && (
            <g id="glowing-brush-tip" className="pointer-events-none" aria-hidden="true">
              <circle
                ref={tipGlowRef}
                cx="0"
                cy="0"
                r="10"
                fill="white"
                filter="url(#tip-glow-filter)"
                opacity="0"
              />
              <circle
                ref={tipRef}
                cx="0"
                cy="0"
                r="3.5"
                fill="white"
                opacity="0"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
