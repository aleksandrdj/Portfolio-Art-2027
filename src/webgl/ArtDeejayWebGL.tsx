import React, { useEffect, useRef } from 'react';
import { AppState } from '../types';
import { BackgroundField } from './BackgroundField';
import { FluidMaskPass } from './FluidMaskPass';
import { FluidSimulation } from './FluidSimulation';
import { IdleController } from './IdleController';
import { LogoPass } from './LogoPass';
import { createZeroTexture } from './webglUtils';

interface ArtDeejayWebGLProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  onWebGLReady?: (ready: boolean) => void;
  onFirstReadyFrame?: () => void;
}

export const ArtDeejayWebGL: React.FC<ArtDeejayWebGLProps> = ({
  appState,
  prefersReducedMotion,
  onWebGLReady,
  onFirstReadyFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable refs for state without breaking WebGL lifecycle
  const appStateRef = useRef<AppState>(appState);
  const prefersReducedMotionRef = useRef<boolean>(prefersReducedMotion);
  const onWebGLReadyRef = useRef(onWebGLReady);
  const onFirstReadyFrameRef = useRef(onFirstReadyFrame);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  useEffect(() => {
    onWebGLReadyRef.current = onWebGLReady;
  }, [onWebGLReady]);

  useEffect(() => {
    onFirstReadyFrameRef.current = onFirstReadyFrame;
  }, [onFirstReadyFrame]);

  // Parallax tracking
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // WebGL Engine
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
      console.warn('WebGL2 unavailable; falling back to DOM SVG.');
      onWebGLReadyRef.current?.(false);
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    let fluidSim: FluidSimulation | null = null;
    let fluidMaskPass: FluidMaskPass | null = null;
    let bgField: BackgroundField | null = null;
    let logoPass: LogoPass | null = null;
    let idleController: IdleController | null = null;
    let zeroTex: WebGLTexture | null = null;

    const initEngine = () => {
      if (!gl) return false;
      try {
        fluidSim = new FluidSimulation(gl, width, height);
        fluidMaskPass = new FluidMaskPass(gl, canvas.width, canvas.height);
        bgField = new BackgroundField(gl);
        logoPass = new LogoPass(gl);
        idleController = new IdleController();
        zeroTex = createZeroTexture(gl);

        if (logoPass.isTextureReady) {
          onWebGLReadyRef.current?.(true);
        }
        return true;
      } catch (err) {
        console.error('Failed to initialize WebGL modules:', err);
        onWebGLReadyRef.current?.(false);
        return false;
      }
    };

    const cleanupEngine = () => {
      fluidSim?.dispose();
      fluidMaskPass?.dispose();
      bgField?.dispose();
      logoPass?.dispose();
      if (zeroTex && gl) gl.deleteTexture(zeroTex);
      fluidSim = null;
      fluidMaskPass = null;
      bgField = null;
      logoPass = null;
      idleController = null;
      zeroTex = null;
    };

    const success = initEngine();
    if (!success) return;

    // Context loss & restore handlers (Requirement 8)
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost — switching immediately to DOM fallback.');
      onWebGLReadyRef.current?.(false);
      cleanupEngine();
    };

    const handleContextRestored = () => {
      console.info('WebGL context restored — re-initializing engine.');
      const restored = initEngine();
      if (restored) {
        // Render a test frame to ensure stability before handing back control
        try {
          if (gl) {
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
          }
          onWebGLReadyRef.current?.(true);
        } catch {
          onWebGLReadyRef.current?.(false);
        }
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Resize handler
    const handleResize = () => {
      if (!canvas || !gl) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      fluidSim?.resize(width, height);
      fluidMaskPass?.resize(canvas.width, canvas.height);
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

    // Visibility handling
    let isTabHidden = document.hidden;
    const handleVisibilityChange = () => {
      isTabHidden = document.hidden;
      idleController?.onTabVisibilityChange(isTabHidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Physics & render loop
    let lastTime = performance.now();
    let accumulatedSimTime = 0;
    const SIM_DT = 0.016;
    const MAX_CATCHUP = 3;
    let animId: number;

    // Smooth fade-in for background contour lines when entering ready state
    let bgOpacity = 0.0;
    let readyFrameDispatched = false;

    const render = (now: number) => {
      if (isTabHidden) {
        lastTime = now;
        accumulatedSimTime = 0;
        animId = requestAnimationFrame(render);
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      lastTime = now;

      const currentAppState = appStateRef.current;
      const currentReducedMotion = prefersReducedMotionRef.current;

      // Parallax lerp
      if (!isTouchRef.current && !currentReducedMotion && currentAppState === 'ready') {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;
        current.x += (target.x - current.x) * 0.06;
        current.y += (target.y - current.y) * 0.06;
      } else {
        mouseCurrentRef.current = { x: 0, y: 0 };
      }

      // Background lines fade-in coordination with Header
      if (currentAppState === 'ready') {
        if (currentReducedMotion) {
          bgOpacity = 1.0;
        } else if (bgOpacity < 1.0) {
          bgOpacity = Math.min(1.0, bgOpacity + dt / 0.7); // 700ms fade-in
        }
      } else {
        bgOpacity = 0.0;
        readyFrameDispatched = false;
      }

      // Physics Simulation (active only in ready state)
      if (currentAppState === 'ready' && !currentReducedMotion && fluidSim && fluidSim.isSupported && idleController) {
        accumulatedSimTime += dt;
        let steps = 0;

        while (accumulatedSimTime >= SIM_DT && steps < MAX_CATCHUP) {
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

      // Render Passes
      if (currentAppState === 'ready' && bgField && logoPass && fluidMaskPass && idleController) {
        const snapshot = idleController.getRenderSnapshot(now);
        const velocityTex = (fluidSim && fluidSim.isSupported)
          ? fluidSim.getVelocityTexture()
          : zeroTex;

        // 1. FluidMaskPass: Computes unified liquid mask in screen coordinates
        const fluidMaskTex = fluidMaskPass.render(velocityTex, canvas.width, canvas.height);

        const simTime = currentReducedMotion ? 0.0 : now * 0.001;

        // 2. BackgroundField: Contours + light gray fluid trail
        bgField.render(
          fluidMaskTex,
          canvas.width,
          canvas.height,
          simTime,
          snapshot.mouseNDC,
          snapshot.mousePace,
          bgOpacity,
          dpr
        );

        // 3. LogoPass: Original silhouette + parallax + local fluid inversion
        const parallaxCSS: [number, number] = [
          mouseCurrentRef.current.x * 5.0,
          -mouseCurrentRef.current.y * 4.0,
        ];

        const rotationAngles: [number, number] = [
          (-mouseCurrentRef.current.y * 3.0 * Math.PI) / 180,
          (mouseCurrentRef.current.x * 4.0 * Math.PI) / 180,
        ];

        logoPass.render(
          fluidMaskTex,
          width,
          height,
          dpr,
          parallaxCSS,
          rotationAngles,
          1.0, // Logo is 100% visible continuously
          [17 / 255, 17 / 255, 17 / 255]
        );

        // Notify parent that first ready frame with logo is on screen
        if (!readyFrameDispatched) {
          readyFrameDispatched = true;
          onFirstReadyFrameRef.current?.();
        }
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
      cleanupEngine();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="artdeejay-webgl-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-10 block"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
        // Canvas is immediately visible when ready (no 700ms canvas fade-out that blanks the logo!)
        // Background lines internally fade in over 700ms matching the header.
        display: appState === 'ready' ? 'block' : 'none',
      }}
    />
  );
};
