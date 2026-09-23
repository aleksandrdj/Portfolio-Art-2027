import React, { useEffect, useRef } from 'react';
import { AppState, LiquidBlob } from '../types';

interface LiquidTrailProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  blobsRef: React.MutableRefObject<LiquidBlob[]>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const LiquidTrail: React.FC<LiquidTrailProps> = ({
  appState,
  prefersReducedMotion,
  blobsRef,
  canvasRef,
}) => {
  const animFrameIdRef = useRef<number | null>(null);
  const nextBlobIdRef = useRef(1);

  // Mouse tracking
  const lastMouseRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastActivityTimeRef = useRef<number>(performance.now());
  const mouseInWindowRef = useRef(false);

  // Autonomous pass state
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autonomousPassRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    p0: { x: number; y: number };
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    p3: { x: number; y: number };
    lastPoint: { x: number; y: number } | null;
  } | null>(null);

  // Spawn a liquid blob
  const addBlob = (x: number, y: number, radius: number, lifespan: number = 1500) => {
    // Cap total active blobs to maintain peak 60+ FPS
    if (blobsRef.current.length > 55) {
      blobsRef.current.shift();
    }

    blobsRef.current.push({
      id: nextBlobIdRef.current++,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      radius,
      maxRadius: radius * 1.15,
      alpha: 1.0,
      birth: performance.now(),
      lifespan,
    });
  };

  // Helper: Bezier point
  const getCubicBezierPoint = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    };
  };

  // Schedule autonomous idle pass
  const scheduleAutonomousPass = (delayMs: number) => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    idleTimeoutRef.current = setTimeout(() => {
      if (
        appState !== 'ready' ||
        prefersReducedMotion ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      // 4 seconds without mouse movement check
      const elapsedSinceMove = performance.now() - lastActivityTimeRef.current;
      if (elapsedSinceMove < 3900) {
        scheduleAutonomousPass(4000 - elapsedSinceMove);
        return;
      }

      // Generate a smooth organic bezier curve crossing the screen & central logo
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Start either left, right, or top edge
      const side = Math.random();
      let p0: { x: number; y: number };
      let p3: { x: number; y: number };

      if (side < 0.35) {
        // Left to right-ish
        p0 = { x: -30, y: h * (0.3 + Math.random() * 0.4) };
        p3 = { x: w + 40, y: h * (0.3 + Math.random() * 0.4) };
      } else if (side < 0.7) {
        // Right to left-ish
        p0 = { x: w + 30, y: h * (0.35 + Math.random() * 0.4) };
        p3 = { x: -40, y: h * (0.35 + Math.random() * 0.4) };
      } else {
        // Top-left diagonal to bottom-right
        p0 = { x: w * (0.2 + Math.random() * 0.3), y: -30 };
        p3 = { x: w * (0.5 + Math.random() * 0.4), y: h + 40 };
      }

      // Control points ensure curve passes close to center (where logo sits: w/2, h/2)
      const cx = w * 0.5 + (Math.random() - 0.5) * w * 0.25;
      const cy = h * 0.5 + (Math.random() - 0.5) * h * 0.15;

      const p1 = {
        x: p0.x + (cx - p0.x) * 0.7 + (Math.random() - 0.5) * 80,
        y: p0.y + (cy - p0.y) * 0.7 + (Math.random() - 0.5) * 80,
      };
      const p2 = {
        x: cx + (p3.x - cx) * 0.4 + (Math.random() - 0.5) * 80,
        y: cy + (p3.y - cy) * 0.4 + (Math.random() - 0.5) * 80,
      };

      const duration = 2200 + Math.random() * 600; // 2.2 - 2.8s

      autonomousPassRef.current = {
        active: true,
        startTime: performance.now(),
        duration,
        p0,
        p1,
        p2,
        p3,
        lastPoint: null,
      };
    }, delayMs);
  };

  // Mouse move handler
  useEffect(() => {
    if (appState !== 'ready' || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      lastActivityTimeRef.current = now;
      mouseInWindowRef.current = true;

      // Immediately cancel autonomous pass without leaving connecting artifact
      if (autonomousPassRef.current) {
        autonomousPassRef.current = null;
      }

      const curX = e.clientX;
      const curY = e.clientY;

      if (!lastMouseRef.current) {
        lastMouseRef.current = { x: curX, y: curY, time: now };
        addBlob(curX, curY, 38, 1600);
        return;
      }

      const prev = lastMouseRef.current;
      const dx = curX - prev.x;
      const dy = curY - prev.y;
      const dist = Math.hypot(dx, dy);
      const dt = Math.max(now - prev.time, 1);
      const speed = dist / dt; // pixels per ms

      // Fast movement -> elongated smaller droplets; Slow -> larger pooling
      const radius = Math.max(24, Math.min(50, 48 - speed * 12));
      const lifespan = 1300 + Math.random() * 400;

      // Interpolate along movement vector if mouse moved quickly to prevent discrete dots
      const stepDist = Math.max(12, radius * 0.45);
      const steps = Math.min(Math.floor(dist / stepDist), 6);

      if (steps > 0) {
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ix = prev.x + dx * t;
          const iy = prev.y + dy * t;
          addBlob(ix, iy, radius * (0.9 + Math.random() * 0.2), lifespan);
        }
      } else if (dist > 3) {
        addBlob(curX, curY, radius, lifespan);
      }

      lastMouseRef.current = { x: curX, y: curY, time: now };

      // Reschedule next idle check (after 4000ms idle)
      scheduleAutonomousPass(4000);
    };

    const handleMouseLeave = () => {
      mouseInWindowRef.current = false;
      lastMouseRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Initial autonomous pass schedule
    scheduleAutonomousPass(4000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [appState, prefersReducedMotion]);

  // Main rendering loop for the canvas
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

    const render = (now: number) => {
      if (width === 0 || height === 0) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Process Autonomous Pass (if active)
      const autoPass = autonomousPassRef.current;
      if (autoPass && autoPass.active && appState === 'ready' && !prefersReducedMotion) {
        const passElapsed = now - autoPass.startTime;
        const t = Math.min(passElapsed / autoPass.duration, 1.0);

        const currentPos = getCubicBezierPoint(
          t,
          autoPass.p0,
          autoPass.p1,
          autoPass.p2,
          autoPass.p3
        );

        if (autoPass.lastPoint) {
          const dx = currentPos.x - autoPass.lastPoint.x;
          const dy = currentPos.y - autoPass.lastPoint.y;
          const d = Math.hypot(dx, dy);
          if (d > 10) {
            // Autonomous droplet size ~32-44px
            addBlob(currentPos.x, currentPos.y, 36 + Math.sin(t * Math.PI) * 8, 1700);
            autoPass.lastPoint = currentPos;
          }
        } else {
          autoPass.lastPoint = currentPos;
          addBlob(currentPos.x, currentPos.y, 36, 1700);
        }

        if (t >= 1.0) {
          // Pass completed: schedule next one with random 5-9s pause
          autonomousPassRef.current = null;
          const nextInterval = 5000 + Math.random() * 4000;
          scheduleAutonomousPass(nextInterval);
        }
      }

      // 2. Update and Draw Liquid Blobs
      const blobs = blobsRef.current;
      const aliveBlobs: LiquidBlob[] = [];

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const age = now - b.birth;

        if (age < b.lifespan) {
          const progress = age / b.lifespan;
          // Smooth alpha decay with natural linger
          b.alpha = Math.pow(1 - progress, 1.4);
          // Subtle diffusion expansion
          b.radius = b.maxRadius * (0.92 + progress * 0.15);
          b.x += b.vx;
          b.y += b.vy;
          aliveBlobs.push(b);

          if (appState === 'ready') {
            // Draw soft organic ink droplet onto canvas
            // Target color on pure white is #E3E5E7:
            // Achieved with subtle translucent slate-gray radial gradient
            const radGrad = ctx.createRadialGradient(
              b.x,
              b.y,
              b.radius * 0.15,
              b.x,
              b.y,
              b.radius
            );

            // Center: soft #E3E5E7 equivalent tint
            radGrad.addColorStop(0, `rgba(35, 42, 54, ${(b.alpha * 0.11).toFixed(3)})`);
            radGrad.addColorStop(0.55, `rgba(35, 42, 54, ${(b.alpha * 0.08).toFixed(3)})`);
            radGrad.addColorStop(1, 'rgba(35, 42, 54, 0)');

            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      blobsRef.current = aliveBlobs;

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [appState, prefersReducedMotion, blobsRef]);

  return (
    <div
      id="liquid-trail-layer"
      className={`fixed inset-0 pointer-events-none z-20 transition-opacity duration-500 ease-out select-none ${
        appState === 'ready' ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block filter blur-[3px]"
      />
    </div>
  );
};
