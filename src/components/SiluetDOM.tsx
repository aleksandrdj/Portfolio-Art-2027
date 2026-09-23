import React, { useEffect, useRef } from 'react';

interface SiluetDOMProps {
  scrollProgressRef: React.MutableRefObject<number>;
  appState: string;
}

export const SiluetDOM: React.FC<SiluetDOMProps> = ({
  scrollProgressRef,
  appState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appState !== 'ready') return;

    let animId: number;
    const update = () => {
      const p = scrollProgressRef.current;
      const t = Math.min(p / 0.85, 1.0);
      const easedT = t * (2 - t);

      // Opacity strictly max 0.10 (10%)
      const opacity = t * 0.10;
      // Transform: translateY from 100% to 0%
      const translateY = (1.0 - easedT) * 100;

      if (containerRef.current) {
        containerRef.current.style.opacity = `${opacity}`;
        containerRef.current.style.transform = `translate(-50%, ${translateY}%)`;
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
      className="pointer-events-none absolute bottom-0 left-1/2 z-10 flex justify-center will-change-transform"
      style={{
        opacity: 0,
        transform: 'translate(-50%, 100%)',
        height: '85svh',
      }}
      aria-hidden="true"
    >
      <img
        src="/images/siluet.svg"
        alt=""
        className="h-full w-auto max-w-none object-contain brightness-0 invert"
        style={{
          filter: 'brightness(0) invert(1)',
        }}
      />
    </div>
  );
};
