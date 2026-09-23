import React, { useEffect, useRef, useState } from 'react';

interface SiluetLayerProps {
  scrollProgressRef: React.MutableRefObject<number>;
  appState: string;
}

const ORIGINAL_WIDTH = 1497;
const ORIGINAL_HEIGHT = 2079;

export const SiluetLayer: React.FC<SiluetLayerProps> = ({
  scrollProgressRef,
  appState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Responsive scale dimensions according to cover: scale = max(viewportWidth / 1497, viewportHeight / 2079)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => {
    if (typeof window === 'undefined') return { width: ORIGINAL_WIDTH, height: ORIGINAL_HEIGHT };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(vw / ORIGINAL_WIDTH, vh / ORIGINAL_HEIGHT);
    return {
      width: Math.round(ORIGINAL_WIDTH * scale),
      height: Math.round(ORIGINAL_HEIGHT * scale),
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(vw / ORIGINAL_WIDTH, vh / ORIGINAL_HEIGHT);
      setDimensions({
        width: Math.round(ORIGINAL_WIDTH * scale),
        height: Math.round(ORIGINAL_HEIGHT * scale),
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (appState !== 'ready') return;

    let animId: number;

    const update = () => {
      const p = scrollProgressRef.current;

      // Starts rising from the first pixels of scroll
      // Reaches bottom: 0 at around progress 0.70
      const t = Math.min(p / 0.70, 1.0);
      const easedT = t * (2 - t);

      // Max opacity strictly 0.10 (10%) as specified
      const opacity = easedT * 0.10;

      // Vertical entrance: slides up from bottom: 35% below to 0%
      const translateY = (1.0 - easedT) * 35;

      if (imgRef.current) {
        imgRef.current.style.opacity = `${opacity}`;
        imgRef.current.style.transform = `translate(-50%, ${translateY.toFixed(2)}%)`;
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [appState, scrollProgressRef]);

  if (appState !== 'ready') return null;

  return (
    <div
      ref={containerRef}
      id="siluet-layer"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      <img
        ref={imgRef}
        src="/images/siluet.svg"
        alt=""
        className="absolute bottom-0 left-1/2 block max-w-none will-change-transform"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          opacity: 0,
          transform: 'translate(-50%, 35%)',
          // Dark silhouette tint: #001C28
          // Using brightness & color filter to ensure dark tone #001C28 on the background
          filter: 'brightness(0) drop-shadow(0 0 1px #001C28)',
        }}
      />
    </div>
  );
};
