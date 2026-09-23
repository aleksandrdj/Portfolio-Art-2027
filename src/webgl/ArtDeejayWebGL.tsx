import React, { useEffect, useRef } from 'react';
import { AppState } from '../types';
import { BackgroundField } from './BackgroundField';

interface ArtDeejayWebGLProps {
  appState: AppState;
  prefersReducedMotion: boolean;
  scrollProgressRef?: React.MutableRefObject<number>;
  onWebGLReady?: (ready: boolean) => void;
  onFirstReadyFrame?: () => void;
}

export const ArtDeejayWebGL: React.FC<ArtDeejayWebGLProps> = ({
  appState,
  prefersReducedMotion,
  scrollProgressRef,
  onWebGLReady,
  onFirstReadyFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const appStateRef = useRef<AppState>(appState);
  appStateRef.current = appState;

  const prefersReducedMotionRef = useRef<boolean>(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  const scrollProgressRefInternal = useRef<React.MutableRefObject<number> | undefined>(scrollProgressRef);
  scrollProgressRefInternal.current = scrollProgressRef;

  const onFirstReadyFrameRef = useRef(onFirstReadyFrame);
  onFirstReadyFrameRef.current = onFirstReadyFrame;

  const onWebGLReadyRef = useRef(onWebGLReady);
  onWebGLReadyRef.current = onWebGLReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      console.warn('WebGL2 not supported on this device; running in fallback mode.');
      onWebGLReadyRef.current?.(false);
      return;
    }

    // Viewport dimensions & DPR
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    let bgField: BackgroundField | null = null;

    try {
      bgField = new BackgroundField(gl);
      onWebGLReadyRef.current?.(true);
    } catch (e) {
      console.error('Error initializing WebGL background:', e);
      onWebGLReadyRef.current?.(false);
      return;
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      bgField?.dispose();
      bgField = null;
    };

    const handleContextRestored = () => {
      try {
        bgField = new BackgroundField(gl);
      } catch (err) {
        console.error('Failed to reinitialize after context restore:', err);
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
    };

    window.addEventListener('resize', handleResize);

    // Visibility handling
    let isTabHidden = document.hidden;
    const handleVisibilityChange = () => {
      isTabHidden = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let animId: number;
    let readyStartTime: number | null = null;
    let readyFrameDispatched = false;
    let prevAppState: AppState = appStateRef.current;
    let bgOpacity = 0.0;

    const render = (now: number) => {
      if (isTabHidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const currentAppState = appStateRef.current;
      const currentReducedMotion = prefersReducedMotionRef.current;

      // Handle transitions between states
      if (prevAppState !== currentAppState) {
        if (currentAppState === 'ready') {
          readyStartTime = now;
          bgOpacity = currentReducedMotion ? 1.0 : 0.0;
        } else {
          readyStartTime = null;
          bgOpacity = 0.0;
          readyFrameDispatched = false;
        }
        prevAppState = currentAppState;
      }

      if (currentAppState === 'ready') {
        if (readyStartTime === null) {
          readyStartTime = now;
        }

        if (currentReducedMotion) {
          bgOpacity = 1.0;
        } else {
          const elapsed = (now - readyStartTime) / 1000;
          // Background contour lines fade in over 700ms
          bgOpacity = Math.min(1.0, elapsed / 0.7);
        }

        if (bgField) {
          const simTime = currentReducedMotion ? 0.0 : now * 0.001;
          const scrollProgress = scrollProgressRefInternal.current?.current ?? 0.0;

          bgField.render(
            canvas.width,
            canvas.height,
            simTime,
            bgOpacity,
            dpr,
            scrollProgress
          );

          if (!readyFrameDispatched) {
            readyFrameDispatched = true;
            onFirstReadyFrameRef.current?.();
          }
        }
      } else {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      bgField?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="artdeejay-webgl-canvas"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-0 block"
      style={{
        width: '100%',
        height: '100%',
        display: appState === 'ready' ? 'block' : 'none',
      }}
    />
  );
};
