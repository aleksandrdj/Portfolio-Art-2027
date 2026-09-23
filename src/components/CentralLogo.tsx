import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX, REVEAL_STROKE_PATHS } from '../data/logoData';
import { AppState, LiquidBlob } from '../types';

interface CentralLogoProps {
  appState: AppState;
  onIntroComplete: () => void;
  prefersReducedMotion: boolean;
  blobsRef?: React.MutableRefObject<LiquidBlob[]>;
  liquidCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  isWebGLActive?: boolean;
}

export const CentralLogo: React.FC<CentralLogoProps> = ({
  appState,
  onIntroComplete,
  prefersReducedMotion,
  blobsRef,
  isWebGLActive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parallaxWrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const maskBlobsGroupRef = useRef<SVGGElement | null>(null);
  const tipRef = useRef<SVGCircleElement | null>(null);
  const tipGlowRef = useRef<SVGCircleElement | null>(null);
  const introTlRef = useRef<gsap.core.Timeline | null>(null);
  const strokeElementsRef = useRef<(SVGPathElement | null)[]>([]);

  // Parallax state (smoothed via lerp in RAF)
  const mouseTargetRef = useRef({ x: 0, y: 0, active: false });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  // Logo base color state
  // During intro: white (#FFFFFF). During theme transition: transitions to #111111.
  const [logoFill, setLogoFill] = useState<string>(
    appState === 'ready' ? '#111111' : '#FFFFFF'
  );
  const [introMaskActive, setIntroMaskActive] = useState<boolean>(
    appState !== 'ready' && !prefersReducedMotion
  );

  // Detect touch device
  useEffect(() => {
    isTouchRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Parallax mouse listeners (active in ready state on non-touch devices)
  useEffect(() => {
    if (appState !== 'ready' || prefersReducedMotion || isTouchRef.current) return;

    const onMouseMove = (e: MouseEvent) => {
      // Normalize to [-1, 1] relative to center
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTargetRef.current = { x: nx, y: ny, active: true };
    };

    const onMouseLeave = () => {
      mouseTargetRef.current = { x: 0, y: 0, active: false };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [appState, prefersReducedMotion]);

  // Combined RAF loop for:
  // 1. Smooth 3D parallax damping
  // 2. Liquid inversion mask updating (syncing screen blobs into tilted SVG space)
  useEffect(() => {
    let animId: number;

    const updateLoop = () => {
      // 1. Parallax update
      if (appState === 'ready' && !prefersReducedMotion && !isTouchRef.current && parallaxWrapperRef.current) {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;

        // Smooth damping (lag factor ~0.06)
        current.x += (target.x - current.x) * 0.06;
        current.y += (target.y - current.y) * 0.06;

        // Max rotateY ±4 deg, rotateX ±3 deg, translation 4-6px
        const rotY = current.x * 4.0;
        const rotX = -current.y * 3.0;
        const transX = current.x * 5.0;
        const transY = current.y * 4.0;

        parallaxWrapperRef.current.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, 0)`;
      }

      // 2. Liquid Logo Inversion Mask Update
      if (appState === 'ready' && maskBlobsGroupRef.current && svgRef.current) {
        const svg = svgRef.current;
        const group = maskBlobsGroupRef.current;
        const blobs = blobsRef?.current;

        if (!blobs || blobs.length === 0) {
          if (group.hasChildNodes()) {
            group.innerHTML = '';
          }
        } else {
          try {
            const ctm = svg.getScreenCTM();
            if (ctm) {
              const inv = ctm.inverse();
              const pt = svg.createSVGPoint();

              // Scale factor from screen pixels to SVG user units
              const scale = Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b) || 1;

              // Build circle elements inside mask
              let circlesHtml = '';
              for (let i = 0; i < blobs.length; i++) {
                const b = blobs[i];
                if (b.alpha <= 0.01) continue;

                pt.x = b.x;
                pt.y = b.y;
                const svgP = pt.matrixTransform(inv);
                const svgR = (b.radius / scale) * (0.85 + b.alpha * 0.25);

                // Use alpha for opacity
                circlesHtml += `<circle cx="${svgP.x.toFixed(1)}" cy="${svgP.y.toFixed(1)}" r="${svgR.toFixed(1)}" fill="white" opacity="${b.alpha.toFixed(2)}" />`;
              }
              group.innerHTML = circlesHtml;
            }
          } catch {
            // Screen CTM might not be available during layout changes
          }
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [appState, prefersReducedMotion, blobsRef]);

  // Intro Animation Sequence (GSAP)
  useEffect(() => {
    if (appState === 'ready' || prefersReducedMotion) {
      setLogoFill('#111111');
      setIntroMaskActive(false);
      return;
    }

    const strokePaths = strokeElementsRef.current.filter(Boolean) as SVGPathElement[];
    if (strokePaths.length === 0) return;

    // Measure each stroke's total length and set stroke-dasharray / stroke-dashoffset
    const strokeLengths = strokePaths.map((path) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      return len;
    });

    const tip = tipRef.current;
    const tipGlow = tipGlowRef.current;

    // Position glowing tip at start of the first stroke
    if (strokePaths[0] && tip && tipGlow) {
      const startPt = strokePaths[0].getPointAtLength(0);
      tip.setAttribute('cx', `${startPt.x}`);
      tip.setAttribute('cy', `${startPt.y}`);
      tipGlow.setAttribute('cx', `${startPt.x}`);
      tipGlow.setAttribute('cy', `${startPt.y}`);
      tip.style.opacity = '0';
      tipGlow.style.opacity = '0';
    }

    // Build Master Timeline
    // 0 - 0.15s: black screen
    // 0.15 - 2.5s: stroke drawing with glowing tip
    // 2.5 - 2.85s: glow fades out, white logo holds
    // 2.85 - 3.65s: theme transition (bg black -> white, logo white -> black)
    // 3.65s: onComplete -> ready
    const tl = gsap.timeline({
      onComplete: () => {
        setIntroMaskActive(false);
        setLogoFill('#111111');
        onIntroComplete();
      },
    });
    introTlRef.current = tl;

    // Initial brief hold (0.15s)
    tl.to({}, { duration: 0.15 });

    // Fade in glowing tip
    if (tip && tipGlow) {
      tl.to([tip, tipGlow], {
        opacity: 1,
        duration: 0.1,
        ease: 'power2.out',
      });
    }

    // Total draw duration: 2.25s (from 0.25s to 2.5s)
    const TOTAL_DRAW_TIME = 2.25;

    // Chain each stroke sequentially
    strokePaths.forEach((path, idx) => {
      const info = REVEAL_STROKE_PATHS[idx];
      const len = strokeLengths[idx];
      const duration = TOTAL_DRAW_TIME * info.durationRatio;

      const progressObj = { value: 0 };

      tl.to(
        progressObj,
        {
          value: 1,
          duration,
          ease: 'power1.inOut',
          onUpdate: () => {
            const currentLen = progressObj.value * len;
            path.style.strokeDashoffset = `${len - currentLen}`;

            if (tip && tipGlow) {
              const pt = path.getPointAtLength(currentLen);
              tip.setAttribute('cx', `${pt.x}`);
              tip.setAttribute('cy', `${pt.y}`);
              tipGlow.setAttribute('cx', `${pt.x}`);
              tipGlow.setAttribute('cy', `${pt.y}`);
            }
          },
        },
        idx === 0 ? '-=0.05' : '+=0.01'
      );
    });

    // 2.5 - 2.85s: Fade out glowing tip and brief hold on white logo
    if (tip && tipGlow) {
      tl.to(
        [tip, tipGlow],
        {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.out',
        },
        '+=0.05'
      );
    }
    // Hold white logo cleanly on black
    tl.to({}, { duration: 0.15 });

    // 2.85 - 3.65s: Coordinated theme transition
    // As mandated: background becomes white, logo becomes #111111 without getting lost in gray
    tl.to(
      {},
      {
        duration: 0.75,
        ease: 'power2.inOut',
        onStart: () => {
          // Tell parent to start background transition to white
          document.documentElement.classList.add('transition-theme-white');
        },
        onUpdate: function () {
          const p = this.progress();
          // Delay logo color flip slightly so background is already bright enough
          // p from 0 to 0.4: stays #ffffff
          // p from 0.4 to 1.0: transitions smoothly from #ffffff to #111111
          if (p < 0.35) {
            setLogoFill('#FFFFFF');
          } else {
            const colorProgress = (p - 0.35) / 0.65;
            // Interpolate rgb(255, 255, 255) to rgb(17, 17, 17)
            const v = Math.round(255 - colorProgress * (255 - 17));
            const hex = `#${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}`;
            setLogoFill(hex);
          }
        },
      }
    );

    return () => {
      tl.kill();
    };
  }, [appState, prefersReducedMotion, onIntroComplete]);

  if (appState === 'ready' && isWebGLActive) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      id="central-logo-container"
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* Parallax Container: strictly centered, isolated transform */}
      <div
        ref={parallaxWrapperRef}
        id="parallax-wrapper"
        className="w-[82vw] md:w-[50vw] max-w-[850px] aspect-[1000/420] relative flex items-center justify-center will-change-transform"
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
          aria-label="ArtDeejay - Portfolio"
        >
          <defs>
            {/* Soft glowing filter for the drawing brush tip */}
            <filter id="tip-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intro Reveal Mask: Reveals the logo as guide paths are stroke-animated */}
            {introMaskActive && (
              <mask id="intro-signature-mask" maskUnits="userSpaceOnUse">
                {/* Black background hides unrevealed portions */}
                <rect width="1000" height="420" fill="black" />
                {/* Guide paths with round caps uncover the logo progressively */}
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

            {/* Liquid Inversion Mask: Used in 'ready' state for dynamic white logo inversion */}
            <mask id="liquid-logo-inversion-mask" maskUnits="userSpaceOnUse">
              <rect width="1000" height="420" fill="black" />
              {/* Dynamic metaball blobs injected here by RAF */}
              <g ref={maskBlobsGroupRef} filter="url(#inversion-metaball-filter)" />
            </mask>

            {/* Metaball threshold filter for the liquid mask to create smooth organic bridges */}
            <filter id="inversion-metaball-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="metaball"
              />
            </filter>
          </defs>

          {/* Layer 1: Base Logo Path */}
          {/* During intro: white. In ready state: crisp #111111 */}
          <path
            id="base-logo-path"
            d={LOGO_FILLED_PATH}
            fill={logoFill}
            mask={introMaskActive ? 'url(#intro-signature-mask)' : undefined}
            className="transition-none"
          />

          {/* Layer 2: White Inverted Logo Copy */}
          {/* Only rendered in ready state, masked by the dynamic liquid trail */}
          {appState === 'ready' && (
            <path
              id="inverted-white-logo-path"
              d={LOGO_FILLED_PATH}
              fill="#FFFFFF"
              mask="url(#liquid-logo-inversion-mask)"
              aria-hidden="true"
              className="pointer-events-none"
            />
          )}

          {/* Glowing Stroke Tip during Intro */}
          {introMaskActive && (
            <g id="glowing-brush-tip" className="pointer-events-none" aria-hidden="true">
              {/* Outer soft glow circle */}
              <circle
                ref={tipGlowRef}
                cx="0"
                cy="0"
                r="18"
                fill="white"
                filter="url(#tip-glow-filter)"
                opacity="0"
              />
              {/* Crisp white core center */}
              <circle
                ref={tipRef}
                cx="0"
                cy="0"
                r="5"
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
