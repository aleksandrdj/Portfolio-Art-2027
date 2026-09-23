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

  // Latest props refs to avoid tearing down WebGL on React state toggles
  const appStateRef = useRef<AppState>(appState);
  appStateRef.current = appState;

  const prefersReducedMotionRef = useRef<boolean>(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  const onFirstReadyFrameRef = useRef(onFirstReadyFrame);
  onFirstReadyFrameRef.current = onFirstReadyFrame;

  const onWebGLReadyRef = useRef(onWebGLReady);
  onWebGLReadyRef.current = onWebGLReady;

  const mouseCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect touch capability
    isTouchRef.current =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    // Initialize WebGL2 context
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL2 not supported on this device; running in DOM fallback mode.');
      onWebGLReadyRef.current?.(false);
      return;
    }

    // Viewport dimensions & DPR
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    // Sub-renderers & passes
    let fluidSim: FluidSimulation | null = null;
    let fluidMaskPass: FluidMaskPass | null = null;
    let bgField: BackgroundField | null = null;
    let logoPass: LogoPass | null = null;
    let idleController: IdleController | null = null;
    let zeroTex: WebGLTexture | null = null;

    try {
      fluidSim = new FluidSimulation(gl, width, height);
      fluidMaskPass = new FluidMaskPass(gl, canvas.width, canvas.height);
      bgField = new BackgroundField(gl);
      logoPass = new LogoPass(gl);
      idleController = new IdleController();
      zeroTex = createZeroTexture(gl);
      onWebGLReadyRef.current?.(true);
    } catch (e) {
      console.error('Error initializing WebGL pipelines:', e);
      onWebGLReadyRef.current?.(false);
      return;
    }

    // Context loss / restoration handling
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cleanupEngine();
    };

    const handleContextRestored = () => {
      try {
        fluidSim = new FluidSimulation(gl, width, height);
        fluidMaskPass = new FluidMaskPass(gl, canvas.width, canvas.height);
        bgField = new BackgroundField(gl);
        logoPass = new LogoPass(gl);
        idleController = new IdleController();
        zeroTex = createZeroTexture(gl);
      } catch (err) {
        console.error('Failed to reinitialize after context restore:', err);
      }
    };

    const cleanupEngine = () => {
      fluidSim?.dispose();
      fluidMaskPass?.dispose();
      bgField?.dispose();
      logoPass?.dispose();
      if (zeroTex) gl.deleteTexture(zeroTex);
      fluidSim = null;
      fluidMaskPass = null;
      bgField = null;
      logoPass = null;
      zeroTex = null;
      idleController = null;
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

    // Pointer event handlers (passive, does not block scrolling)
    const handlePointerMove = (e: PointerEvent) => {
      if (appStateRef.current !== 'ready') return;
      idleController?.onPointerMove(e.clientX, e.clientY, width, height);

      if (e.pointerType === 'mouse' && !isTouchRef.current && !prefersReducedMotionRef.current) {
        const nx = (e.clientX / width) * 2 - 1;
        const ny = (e.clientY / height) * 2 - 1;
        mouseTargetRef.current = { x: nx, y: ny };
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (appStateRef.current !== 'ready') return;
      idleController?.onPointerDown(e.clientX, e.clientY, width, height);
    };

    const handlePointerLeave = () => {
      idleController?.onMouseLeave();
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    const handleScrollOrTouch = () => {
      idleController?.onScrollOrTouch();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('scroll', handleScrollOrTouch, { passive: true });
    window.addEventListener('touchmove', handleScrollOrTouch, { passive: true });

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
    let prevAppState: AppState = appStateRef.current;

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

      // Detect transition to ready state to start timers from state 'ready'
      if (prevAppState !== currentAppState) {
        if (currentAppState === 'ready') {
          idleController?.onStateReady(now);
        }
        prevAppState = currentAppState;
      }

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

        const radiusPx = fluidSim.getRadiusPx(width, height);

        while (accumulatedSimTime >= SIM_DT && steps < MAX_CATCHUP) {
          const splats = steps === 0
            ? idleController.consumeSimulationStep(now, fluidSim.mouseForce, radiusPx, width, height)
            : [];
          fluidSim.step(splats, width, height);
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
        // Sample scalar density field (isotropic and symmetric in all directions)
        const densityTex = (fluidSim && fluidSim.isSupported)
          ? fluidSim.getDensityTexture()
          : zeroTex;

        // 1. FluidMaskPass: Computes unified liquid mask in screen coordinates
        const fluidMaskTex = fluidMaskPass.render(densityTex, canvas.width, canvas.height);

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

        // Notify parent only after logoPass texture is ready AND actual rendering succeeded
        if (!readyFrameDispatched && logoPass.isTextureReady) {
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
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('scroll', handleScrollOrTouch);
      window.removeEventListener('touchmove', handleScrollOrTouch);
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
        display: appState === 'ready' ? 'block' : 'none',
      }}
    />
  );
};
