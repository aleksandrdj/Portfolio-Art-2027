import { useEffect, useRef, useState } from 'react';
import './WorksReveal.css';

const firstFrame = 22;
const frameCount = 77;
const framesPerSecond = 60;
const frameUrl = (index: number) => `/works-reveal/frame_${firstFrame + index}.jpg`;

export function WorksReveal({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState(reducedMotion ? frameCount - 1 : 0);
  const [direction, setDirection] = useState<'forward' | 'reverse' | null>(null);
  const [reveal, setReveal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setFrame(frameCount - 1);
      return;
    }

    const section = sectionRef.current;
    if (!section) return;
    let mounted = true;
    let running = false;
    let lastY = window.scrollY;
    let raf = 0;
    let holdTimer = 0;
    let gateTimer = 0;
    let gate: 'about' | 'work' | null = null;
    let gateReady = false;
    let touchStartY = 0;
    let touchActive = false;
    let preloadPromise: Promise<void> | null = null;
    let restoreScroll: (() => void) | null = null;

    const sectionTop = () => section.getBoundingClientRect().top + window.scrollY;
    const forwardStart = () => sectionTop() - window.innerHeight * (window.matchMedia('(orientation: portrait)').matches ? 2.55 : 2.175);
    // The About composition shown at the edge of its exit is the reverse landing point.
    const aboutRestPoint = () => forwardStart();
    const armGateAfterPause = (delay = 180) => {
      clearTimeout(gateTimer);
      gateTimer = window.setTimeout(() => { gateReady = true; }, delay);
    };
    const stopAt = (nextGate: 'about' | 'work', y: number) => {
      gate = nextGate;
      gateReady = false;
      window.scrollTo({ top: y, behavior: 'instant' });
      lastY = y;
      if (!touchActive) armGateAfterPause();
    };

    const preload = () => {
      if (!preloadPromise) {
        preloadPromise = Promise.all(Array.from({ length: frameCount }, (_, index) => new Promise<void>(resolve => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = frameUrl(index);
        }))).then(() => {});
      }
      return preloadPromise;
    };

    const preloader = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        void preload();
        preloader.disconnect();
      }
    }, { rootMargin: '200% 0px' });
    preloader.observe(section);

    const blockInput = (event: Event) => event.preventDefault();
    const blockKeys = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) event.preventDefault();
    };
    const lockScroll = () => {
      // Changing root overflow breaks the pinned About scene while we move the page.
      window.addEventListener('wheel', blockInput, { passive: false });
      window.addEventListener('touchmove', blockInput, { passive: false });
      window.addEventListener('keydown', blockKeys);
      restoreScroll = () => {
        window.removeEventListener('wheel', blockInput);
        window.removeEventListener('touchmove', blockInput);
        window.removeEventListener('keydown', blockKeys);
        restoreScroll = null;
      };
    };

    const start = (nextDirection: 'forward' | 'reverse') => {
      if (running) return;
      running = true;
      gate = null;
      gateReady = false;
      clearTimeout(gateTimer);
      const fromY = nextDirection === 'forward' ? forwardStart() : sectionTop();
      const toY = nextDirection === 'forward' ? sectionTop() : aboutRestPoint();
      window.scrollTo({ top: fromY, behavior: 'instant' });
      lastY = fromY;
      setFrame(nextDirection === 'forward' ? 0 : frameCount - 1);
      setReveal(nextDirection === 'forward' ? 0 : 1);
      setDirection(nextDirection);
      document.documentElement.classList.add('works-transition-active');
      section.classList.add('is-playing');
      lockScroll();
      setLoading(true);

      void preload().then(() => {
        if (!mounted) return;
        setLoading(false);
        const startedAt = performance.now();
        const duration = (frameCount - 1) * 1000 / framesPerSecond;
        const tick = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / duration);
          const step = Math.min(frameCount - 1, Math.floor(progress * (frameCount - 1)));
          setFrame(nextDirection === 'forward' ? step : frameCount - 1 - step);
          setReveal(nextDirection === 'forward'
            ? Math.pow(progress, 1.35)
            : Math.max(0, Math.min(1, 1 - (progress - 0.38) / 0.52)));
          window.scrollTo({ top: fromY + (toY - fromY) * progress, behavior: 'instant' });
          if (progress < 1) raf = requestAnimationFrame(tick);
          else holdTimer = window.setTimeout(() => {
            restoreScroll?.();
            window.scrollTo({ top: toY, behavior: 'instant' });
            lastY = toY;
            document.documentElement.classList.remove('works-transition-active');
            section.classList.remove('is-playing');
            setDirection(null);
            running = false;
            gate = nextDirection === 'forward' ? 'work' : 'about';
            gateReady = true;
          }, 120);
        };
        raf = requestAnimationFrame(tick);
      });
    };

    const onScroll = () => {
      if (running) return;
      const currentY = window.scrollY;
      if (gate === 'about') {
        if (currentY > forwardStart() + 1) {
          if (gateReady) start('forward');
          else stopAt('about', forwardStart());
          return;
        }
        if (currentY < forwardStart() - 1) gate = null;
      } else if (gate === 'work') {
        if (currentY < sectionTop() - 1) {
          if (gateReady) start('reverse');
          else stopAt('work', sectionTop());
          return;
        }
        if (currentY > sectionTop() + 1) gate = null;
      } else if (currentY > lastY && lastY < forwardStart() - 1 && currentY >= forwardStart() - 1) {
        stopAt('about', forwardStart());
        return;
      } else if (currentY < lastY && lastY > sectionTop() + 1 && currentY <= sectionTop() + 1) {
        stopAt('work', sectionTop());
        return;
      }
      lastY = window.scrollY;
    };
    const onWheel = (event: WheelEvent) => {
      if (running || !gate) return;
      const towardAnimation = gate === 'about' ? event.deltaY > 0 : event.deltaY < 0;
      if (!towardAnimation) {
        gate = null;
        clearTimeout(gateTimer);
        return;
      }
      event.preventDefault();
      if (gateReady) start(gate === 'about' ? 'forward' : 'reverse');
    };
    const onTouchStart = (event: TouchEvent) => {
      touchActive = true;
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (running || !gate) return;
      const delta = touchStartY - (event.touches[0]?.clientY ?? touchStartY);
      const towardAnimation = gate === 'about' ? delta > 8 : delta < -8;
      if (!towardAnimation) return;
      event.preventDefault();
      if (gateReady) start(gate === 'about' ? 'forward' : 'reverse');
    };
    const onTouchEnd = () => {
      touchActive = false;
      if (gate && !gateReady) armGateAfterPause(80);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (running || !gate || event.repeat) return;
      const towardAnimation = gate === 'about'
        ? ['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)
        : ['ArrowUp', 'PageUp', 'Home'].includes(event.key);
      if (!towardAnimation) return;
      event.preventDefault();
      if (gateReady) start(gate === 'about' ? 'forward' : 'reverse');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      mounted = false;
      preloader.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(raf);
      clearTimeout(holdTimer);
      clearTimeout(gateTimer);
      restoreScroll?.();
      document.documentElement.classList.remove('works-transition-active');
      section.classList.remove('is-playing');
    };
  }, [reducedMotion]);

  return <section ref={sectionRef} id="works-reveal" className="works-reveal" aria-label="Works / Работы">
    <div className={`works-reveal-stage${direction ? ' is-playing' : ''}`} style={direction ? { opacity: reveal } : undefined}>
      <img src={frameUrl(frame)} width={1930} height={1074} alt={reducedMotion || frame === frameCount - 1 ? 'WORK' : ''} aria-hidden={!reducedMotion && frame < frameCount - 1} />
    </div>
    {loading && <span className="works-reveal-loading" role="status">{document.documentElement.lang === 'en' ? 'Preparing animation…' : 'Готовим анимацию…'}</span>}
  </section>;
}
