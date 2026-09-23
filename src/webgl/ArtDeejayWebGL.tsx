import React, { useEffect, useRef } from 'react';
import { AppState } from '../types';
import { BackgroundField } from './BackgroundField';
import { FluidSimulation } from './FluidSimulation';
import { IdleController } from './IdleController';
import { LogoPass } from './LogoPass';

interface ArtDeejayWebGLProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  onWebGLReady?: () => void;
}

export const ArtDeejayWebGL: React.FC<ArtDeejayWebGLProps> = ({
  appState,
  prefersReducedMotion,
  onWebGLReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parallax ref
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchRef = useRef(false);

  // Opacity for fade-in simultaneously with header
  const opacityRef = useRef(appState === 'ready' ? 1 : 0);

  useEffect(() => {
    isTouchRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL2 is not supported in this browser environment.');
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    // Initialize modules
    const fluidSim = new FluidSimulation(gl, width, height);
    const bgField = new BackgroundField(gl);
    const logoPass = new LogoPass(gl);
    const idleController = new IdleController();

    if (onWebGLReady) onWebGLReady();

    // Resize handler
    const handleResize = () => {
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
      if (appState !== 'ready') return;
      idleController.onMouseMove(e.clientX, e.clientY, width, height);

      if (!isTouchRef.current && !prefersReducedMotion) {
        const nx = (e.clientX / width) * 2 - 1;
        const ny = (e.clientY / height) * 2 - 1;
        mouseTargetRef.current = { x: nx, y: ny };
      }
    };

    const handleMouseLeave = () => {
      idleController.onMouseLeave();
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Tab visibility handling (reset accumulated time to avoid explosion)
    let lastTime = performance.now();
    let accumulatedSimTime = 0;
    const SIM_DT = 0.014; // ~70Hz fixed physics step
    const MAX_CATCHUP = 4;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        accumulatedSimTime = 0;
        idleController.resetInput();
      } else {
        lastTime = performance.now();
        accumulatedSimTime = 0;
        idleController.resetInput();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Main render loop
    let animId: number;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update opacity transition when ready
      if (appState === 'ready') {
        opacityRef.current = Math.min(1.0, opacityRef.current + dt * 1.5);
      } else {
        opacityRef.current = 0.0;
      }

      // Parallax lerp
      if (!isTouchRef.current && !prefersReducedMotion) {
        const target = mouseTargetRef.current;
        const current = mouseCurrentRef.current;
        current.x += (target.x - current.x) * 0.06;
        current.y += (target.y - current.y) * 0.06;
      }

      // Fixed timestep fluid updates
      if (appState === 'ready' && !prefersReducedMotion && fluidSim.isSupported) {
        accumulatedSimTime += dt;
        let steps = 0;

        while (accumulatedSimTime >= SIM_DT && steps < MAX_CATCHUP) {
          const input = idleController.update(now, fluidSim.mouseForce);
          const splats = input.splat ? [input.splat] : [];
          fluidSim.step(splats);
          accumulatedSimTime -= SIM_DT;
          steps++;
        }

        if (steps >= MAX_CATCHUP) {
          accumulatedSimTime = 0;
        }
      }

      // Render Passes to Screen
      const input = idleController.update(now, 0); // read current smoothed pace & coords
      const velocityTex = fluidSim.getVelocityTexture();
      const currentOpacity = opacityRef.current;

      const simTime = prefersReducedMotion ? 0.0 : now * 0.001;

      // 1. Background + Procedural Simplex Noise contours + Fluid Trail
      bgField.render(
        velocityTex,
        canvas.width,
        canvas.height,
        simTime,
        input.mouseNDC,
        input.mousePace,
        currentOpacity,
        dpr
      );

      // 2. Logo Pass with Screen-space Inversion Mask & Parallax
      if (appState === 'ready') {
        const parallaxPixels: [number, number] = [
          mouseCurrentRef.current.x * 5.0 * dpr,
          -mouseCurrentRef.current.y * 4.0 * dpr, // Inverted Y for WebGL
        ];

        const rotationAngles: [number, number] = [
          (-mouseCurrentRef.current.y * 3.0 * Math.PI) / 180,
          (mouseCurrentRef.current.x * 4.0 * Math.PI) / 180,
        ];

        logoPass.render(
          velocityTex,
          canvas.width,
          canvas.height,
          parallaxPixels,
          rotationAngles,
          currentOpacity,
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

      fluidSim.dispose();
      bgField.dispose();
      logoPass.dispose();
    };
  }, [appState, prefersReducedMotion, onWebGLReady]);

  return (
    <canvas
      ref={canvasRef}
      id="artdeejay-webgl-canvas"
      className="fixed inset-0 w-full h-full pointer-events-none z-10 block"
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
    />
  );
};
