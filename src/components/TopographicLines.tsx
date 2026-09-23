import React, { useEffect, useRef } from 'react';

interface TopographicLinesProps {
  isVisible: boolean;
  prefersReducedMotion: boolean;
}

export const TopographicLines: React.FC<TopographicLinesProps> = ({
  isVisible,
  prefersReducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Contours definition: each contour is a smooth spline through key parametric points
    // We create 6 organic lines that weave across the screen and beyond bounds
    const baseLines = [
      {
        baseY: 0.18,
        amplitude: 0.12,
        freq: 1.4,
        speed: 0.024,
        phase: 0.0,
        ribbon: false,
        width: 0.85,
        opacity: 0.11,
      },
      {
        baseY: 0.32,
        amplitude: 0.15,
        freq: 1.1,
        speed: 0.018,
        phase: 1.8,
        ribbon: true,
        ribbonWidth: 42,
        width: 0.9,
        opacity: 0.09,
      },
      {
        baseY: 0.52,
        amplitude: 0.18,
        freq: 0.9,
        speed: 0.022,
        phase: 3.5,
        ribbon: false,
        width: 0.8,
        opacity: 0.10,
      },
      {
        baseY: 0.68,
        amplitude: 0.14,
        freq: 1.3,
        speed: 0.019,
        phase: 5.1,
        ribbon: true,
        ribbonWidth: 54,
        width: 0.85,
        opacity: 0.08,
      },
      {
        baseY: 0.84,
        amplitude: 0.13,
        freq: 1.6,
        speed: 0.026,
        phase: 2.2,
        ribbon: false,
        width: 0.85,
        opacity: 0.11,
      },
    ];

    // Additional nested organic loop in upper-left / mid-right
    const loops = [
      {
        cx: 0.22,
        cy: 0.28,
        rx: 0.16,
        ry: 0.11,
        speed: 0.02,
        phase: 0.5,
      },
      {
        cx: 0.80,
        cy: 0.65,
        rx: 0.19,
        ry: 0.13,
        speed: 0.017,
        phase: 4.1,
      },
    ];

    const startTime = performance.now();

    const render = (now: number) => {
      if (!ctx || width === 0 || height === 0) return;

      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw ribbon fills (subtle wide curved bands, 2-3% opacity)
      baseLines
        .filter((l) => l.ribbon)
        .forEach((line) => {
          const t = prefersReducedMotion ? 0 : elapsed * line.speed;
          ctx.beginPath();

          const steps = 36;
          const topPts: { x: number; y: number }[] = [];
          const botPts: { x: number; y: number }[] = [];

          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const x = (u * 1.2 - 0.1) * width;
            const wave =
              Math.sin(u * Math.PI * 2 * line.freq + t + line.phase) *
                line.amplitude *
                height +
              Math.sin(u * Math.PI * 4 + t * 0.7) * 0.03 * height;
            const y = line.baseY * height + wave;
            topPts.push({ x, y: y - (line.ribbonWidth || 30) * 0.5 });
            botPts.push({ x, y: y + (line.ribbonWidth || 30) * 0.5 });
          }

          ctx.moveTo(topPts[0].x, topPts[0].y);
          for (let i = 1; i < topPts.length - 1; i++) {
            const xc = (topPts[i].x + topPts[i + 1].x) / 2;
            const yc = (topPts[i].y + topPts[i + 1].y) / 2;
            ctx.quadraticCurveTo(topPts[i].x, topPts[i].y, xc, yc);
          }
          ctx.lineTo(topPts[topPts.length - 1].x, topPts[topPts.length - 1].y);

          for (let i = botPts.length - 1; i > 0; i--) {
            const xc = (botPts[i].x + botPts[i - 1].x) / 2;
            const yc = (botPts[i].y + botPts[i - 1].y) / 2;
            ctx.quadraticCurveTo(botPts[i].x, botPts[i].y, xc, yc);
          }
          ctx.closePath();

          ctx.fillStyle = 'rgba(28, 32, 40, 0.024)';
          ctx.fill();
        });

      // 2. Draw fine organic topographic contour curves (0.75-1px, 8-14% opacity)
      baseLines.forEach((line) => {
        const t = prefersReducedMotion ? 0 : elapsed * line.speed;
        ctx.beginPath();

        const steps = 40;
        const pts: { x: number; y: number }[] = [];

        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const x = (u * 1.25 - 0.125) * width;
          const wave1 = Math.sin(u * Math.PI * 2 * line.freq + t + line.phase);
          const wave2 = Math.cos(u * Math.PI * 3.2 - t * 0.8 + line.phase * 0.5);
          const wave3 = Math.sin(u * Math.PI * 1.5 + t * 0.5);
          const y =
            line.baseY * height +
            (wave1 * line.amplitude + wave2 * 0.04 + wave3 * 0.02) * height;
          pts.push({ x, y });
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);

        ctx.lineWidth = line.width;
        ctx.strokeStyle = `rgba(28, 32, 40, ${line.opacity})`;
        ctx.stroke();
      });

      // 3. Draw nested loops (organic closed contours)
      loops.forEach((loop) => {
        const t = prefersReducedMotion ? 0 : elapsed * loop.speed;
        const cx = (loop.cx + Math.sin(t + loop.phase) * 0.025) * width;
        const cy = (loop.cy + Math.cos(t * 0.8 + loop.phase) * 0.02) * height;
        const rx = (loop.rx + Math.sin(t * 1.2) * 0.015) * width;
        const ry = (loop.ry + Math.cos(t * 1.1) * 0.012) * height;

        ctx.beginPath();
        const steps = 36;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const radMod = 1 + Math.sin(angle * 3 + t) * 0.08;
          const x = cx + Math.cos(angle) * rx * radMod;
          const y = cy + Math.sin(angle) * ry * radMod;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.lineWidth = 0.85;
        ctx.strokeStyle = 'rgba(28, 32, 40, 0.095)';
        ctx.stroke();
      });

      if (!prefersReducedMotion) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(startTime);
    } else {
      animFrameIdRef.current = requestAnimationFrame(render);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !prefersReducedMotion) {
        if (!animFrameIdRef.current) {
          animFrameIdRef.current = requestAnimationFrame(render);
        }
      } else if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <div
      id="topographic-background"
      className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-700 ease-out select-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
