import React, { useEffect, useRef } from 'react';
import { AppState } from '../types';
import { BackgroundField } from './BackgroundField';
import { FluidSimulation } from './FluidSimulation';
import { IdleController } from './IdleController';
import { LogoPass } from './LogoPass';
import { createZeroTexture } from './webglUtils';

interface ArtDeejayWebGLProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  onWebGLReady?: (ready: boolean) => void;
}

export const ArtDeejayWebGL: React.FC<ArtDeejayWebGLProps> = ({
  appState,
  prefersReducedMotion,
  onWebGLReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable refs so WebGL engine NEVER re-initializes on stage or motion changes!
  const appStateRef = useRef<AppState>(appState);
  const prefersReducedMotionRef = useRef<boolean>(prefersReducedMotion);
  const onWebGLReadyRef = useRef(onWebGLReady);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  useEffect(() => {
    onWebGLReadyRef.current = onWebGLReady;
  }, [onWebGLReady]);

  // Parallax tracking
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // WebGL Engine - Initialized strictly ONCE on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
    } catch {
      gl = null;
    }

    if (!gl) {
      console.warn('WebGL2 not available; fallback to DOM SVG logo.');
      onWebGLReadyRef.current?.(false);
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    let fluidSim: FluidSimulation | null = null;
    let bgField: BackgroundField | null = null;
    let logoPass: LogoPass | null = null;
    let idleController: IdleController | null = null;
    let zeroTex: WebGLTexture | null = null;

    try {
      fluidSim = new FluidSimulation(gl, width, height);
      bgField = new BackgroundField(gl);
      logoPass = new LogoPass(gl);
      idleController = new IdleController();
      zeroTex = createZeroTexture(gl);

      // Verify logo texture readiness
      if (logoPass.isTextureReady) {
        onWebGLReadyRef.current?.(true);
      }
    } catch (err) {
      console.error('Failed to initialize WebGL modules:', err);
      onWebGLReadyRef.current?.(false);
      return;
    }

    // Context loss handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost');
      onWebGLReadyRef.current?.(false);
    };

    const handleContextRestored = () => {
      console.info('WebGL context restored');
      // On restore, parent will re-evaluate
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Resize handler
    const handleResize = () => {
      if (!canvas || !gl || !fluidSim) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      fluidSim.resize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Mouse handlers
    const handleMouseMove = (e: MouseEvent) => {
      if (appStateRef.current !== 'ready') return;
      idleController?.onMouseMove(e.clientX, e.clientY, width, height);

      if (!isTouchRef.current && !prefersReducedMotionRef.current) {
        const nx = (e.clientX / width) * 2 - 1;
        const ny = (e.clientY / height) * 2 - 1;
        mouseTargetRef.current = { x: nx, y: ny };
      }
    };

    const handleMouseLeave = () => {
      idleController?.onMouseLeave();
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Tab visibility handling
    let isTabHidden = document.hidden;
    const handleVisibilityChange = () => {
      isTabHidden = document.hidden;
      idleController?.onTabVisibilityChange(isTabHidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Physics & render loop
    let lastTime = performance.now();
    let accumulatedSimTime = 0;
    const SIM_DT = 0.016; // 60Hz physics step
    const MAX_CATCHUP = 3;
    let animId: number;

    const render = (now: number) => {
      // If tab is hidden, skip expensive rendering and large dt
      if (isTabHidden) {
        lastTime = now;
        accumulatedSimTime = 0;
        animId = requestAnimationFrame(render);
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05); // clamp dt
      lastTime = now;

      const currentAppState = appStateRef.current;
      const currentReducedMotion = prefersReducedMotionRef.current;

      // Parallax lerp
      if (!isTouchRef.current && !currentReducedMotion) {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;
        current.x += (target.x - current.x) * 0.06;
        current.y += (target.y - current.y) * 0.06;
      } else {
        mouseCurrentRef.current = { x: 0, y: 0 };
      }

      // Physics Simulation (active only in ready state)
      if (currentAppState === 'ready' && !currentReducedMotion && fluidSim && fluidSim.isSupported && idleController) {
        accumulatedSimTime += dt;
        let steps = 0;

        while (accumulatedSimTime >= SIM_DT && steps < MAX_CATCHUP) {
          // First step consumes any real user input accumulated during this frame.
          // Subsequent catchup steps receive empty splats so mouseForce is never multiplied.
          const splatInput = steps === 0
            ? idleController.consumeSimulationStep(now, fluidSim.mouseForce)
            : null;
          const splats = splatInput ? [splatInput] : [];
          fluidSim.step(splats);
          accumulatedSimTime -= SIM_DT;
          steps++;
        }

        if (steps >= MAX_CATCHUP) {
          accumulatedSimTime = 0;
        }
      }

      // Render Passes (only draw lines/fluid when ready)
      if (currentAppState === 'ready' && bgField && logoPass && idleController) {
        const snapshot = idleController.getRenderSnapshot(now);
        const velocityTex = (fluidSim && fluidSim.isSupported)
          ? fluidSim.getVelocityTexture()
          : zeroTex;

        const simTime = currentReducedMotion ? 0.0 : now * 0.001;

        // 1. BackgroundField: Organic topographical contours + directional fluid mask
        bgField.render(
          velocityTex,
          canvas.width,
          canvas.height,
          simTime,
          snapshot.mouseNDC,
          snapshot.mousePace,
          1.0,
          dpr
        );

        // 2. LogoPass: Rasterized original SVG logo + parallax + local fluid inversion
        const parallaxCSS: [number, number] = [
          mouseCurrentRef.current.x * 5.0,
          -mouseCurrentRef.current.y * 4.0,
        ];

        const rotationAngles: [number, number] = [
          (-mouseCurrentRef.current.y * 3.0 * Math.PI) / 180,
          (mouseCurrentRef.current.x * 4.0 * Math.PI) / 180,
        ];

        logoPass.render(
          velocityTex,
          width,
          height,
          dpr,
          parallaxCSS,
          rotationAngles,
          1.0,
          [17 / 255, 17 / 255, 17 / 255]
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      fluidSim?.dispose();
      bgField?.dispose();
      logoPass?.dispose();
      if (zeroTex && gl) gl.deleteTexture(zeroTex);
    };
  }, []); // Strictly empty dependency array: WebGL is never torn down on state transitions!

  return (
    <canvas
      ref={canvasRef}
      id="artdeejay-webgl-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-10 block transition-opacity duration-700 ease-out"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
        opacity: appState === 'ready' ? 1 : 0,
      }}
    />
  );
};
