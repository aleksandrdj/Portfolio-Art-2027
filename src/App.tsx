import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AutografOverlay } from './components/AutografOverlay';
import { AboutSection } from './components/AboutSection';
import { CentralLogo } from './components/CentralLogo';
import { Header } from './components/Header';
import { IntroSequence } from './components/IntroSequence';
import { WorksSection } from './components/WorksSection';
import { WorksReveal } from './components/WorksReveal';
import { AppState, Language } from './types';
import { ArtDeejayWebGL } from './webgl/ArtDeejayWebGL';

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    replayIntro?: () => void;
  }
}

export default function App() {
  // Listen to prefers-reduced-motion dynamically
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // WebGL state
  const [isWebGLActive, setIsWebGLActive] = useState<boolean>(true);
  const [isWebGLReadyFrameDrawn, setIsWebGLReadyFrameDrawn] = useState<boolean>(false);

  const handleWebGLReady = useCallback((ready: boolean) => {
    setIsWebGLActive(ready);
    if (!ready) {
      setIsWebGLReadyFrameDrawn(false);
    }
  }, []);

  const handleFirstReadyFrame = useCallback(() => {
    setIsWebGLReadyFrameDrawn(true);
  }, []);

  // Sequential States: preloading -> logoSequence -> video -> whiteCover -> ready
  const [appState, setAppState] = useState<AppState>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return 'ready';
      }
    }
    return 'preloading';
  });

  // Key to force-remount intro component when replayed
  const [introKey, setIntroKey] = useState<number>(0);

  // Language state (persists across sessions)
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('artdeejay_lang') as Language;
      if (saved === 'ru' || saved === 'en') return saved;
    } catch {
      // fallback
    }
    return 'ru';
  });

  // Synchronize document <html lang="...">
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem('artdeejay_lang', language);
    } catch {
      // ignore
    }
  }, [language]);

  // Transition to full ready state
  const handleIntroComplete = useCallback(() => {
    setAppState('ready');
  }, []);

  // Unified scroll progress reference (0.0 to 1.0)
  // Shared directly across WebGL uniforms, Autograf mask, and Header without React re-renders
  const scrollProgressRef = useRef<number>(0.0);
  const aboutProgressRef = useRef<number>(0.0);
  const logoExitProgressRef = useRef<number>(0);
  const headerProgressRef = useRef<number>(0);
  const aboutExitRef = useRef<HTMLDivElement>(null);
  const aboutViewportRef = useRef<HTMLDivElement>(null);
  const whiteTransitionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Replay function accessible globally, via 'R' key, and via URL param ?intro=1
  const replayIntro = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    scrollProgressRef.current = 0.0;
    aboutProgressRef.current = 0.0;
    logoExitProgressRef.current = 0;
    setIsWebGLReadyFrameDrawn(false);
    setAppState('preloading');
    setIntroKey((k) => k + 1);
  }, []);

  useEffect(() => {
    window.replayIntro = replayIntro;

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('intro') === '1') {
        replayIntro();
      }
    } catch {
      // ignore
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement;
        const isInput =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          (activeEl && activeEl.getAttribute('contenteditable') === 'true');
        if (!isInput) {
          replayIntro();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      delete window.replayIntro;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [replayIntro]);

  // Single source of truth for scroll locking: html.intro-running
  useEffect(() => {
    const isIntroActive = appState !== 'ready' && !prefersReducedMotion;
    if (isIntroActive) {
      document.documentElement.classList.add('intro-running');
      document.body.style.backgroundColor = '#000000';
    } else {
      document.documentElement.classList.remove('intro-running');
      document.body.style.backgroundColor = '#FFFFFF';
    }

    return () => {
      document.documentElement.classList.remove('intro-running');
    };
  }, [appState, prefersReducedMotion]);

  // GSAP ScrollTrigger configuration with scrubbed tween for smooth scrollProgress
  useEffect(() => {
    if (appState !== 'ready') {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    // Mobile address bar height adjustments should not disrupt scroll progress
    ScrollTrigger.config({ ignoreMobileResize: true });

    const progressState = { value: 0 };
    const tween = gsap.to(progressState, {
      value: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: prefersReducedMotion ? true : 0.35,
      },
      onUpdate: () => {
        const sceneProgress = Math.min(1, progressState.value / 0.8);
        const exit = Math.min(1, Math.max(0, (progressState.value - 0.8) / 0.2));
        // Keep the blue gallery visible while it exits, then blend into the white Works scene.
        const worksTop = document.getElementById('works-reveal')?.getBoundingClientRect().top;
        const whitening = worksTop === undefined ? exit : Math.min(1, Math.max(0,
          (window.innerHeight * 1.35 - worksTop) / (window.innerHeight * 1.25)));
        const fade = whitening * whitening * (3 - 2 * whitening);
        scrollProgressRef.current = Math.min(1, sceneProgress / 0.5);
        logoExitProgressRef.current = Math.min(1, Math.max(0, (sceneProgress - 0.42) / 0.58));
        aboutProgressRef.current = Math.min(1, Math.max(0, (sceneProgress - 0.46) / 0.54));
        headerProgressRef.current = scrollProgressRef.current * (1 - fade);
        if (aboutExitRef.current) {
          aboutExitRef.current.style.transform = `translate3d(0, ${-exit * 110}svh, 0)`;
        }
        if (whiteTransitionRef.current) whiteTransitionRef.current.style.opacity = String(fade);
      },
    });

    // Refresh dimensions after the complete intro and about scroll scene is in the DOM.
    const rAfId = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(rAfId);
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [appState, prefersReducedMotion]);

  const isReady = appState === 'ready';

  return (
    <>
      <Header isVisible={isReady} language={language} onLanguageChange={setLanguage} scrollProgressRef={headerProgressRef} />
    <div
      ref={scrollContainerRef}
      id="portfolio-screen"
      className={`relative w-full select-none transition-colors duration-700 ease-in-out ${
        isReady ? 'h-[787.5svh] portrait:h-[975svh]' : 'h-[100svh]'
      } ${isReady ? 'bg-[#FFFFFF]' : 'bg-[#000000]'}`}
    >
      {/* Sticky scene container (100svh viewport pinned during transition distance) */}
      <div
        className={`w-full h-[100svh] overflow-hidden ${
          isReady ? 'sticky top-0 left-0' : 'relative'
        }`}
      >
        {/* Layer 7: Minimalist Header (z-50) */}

        {/* WebGL Canvas:
            Layer 1 (White base),
            Layer 2 (Living gradient 0->1),
            Layer 3 (Topographic lines),
            Layer 4 (Central Logo)
        */}
        <ArtDeejayWebGL
          appState={appState}
          prefersReducedMotion={prefersReducedMotion}
          scrollProgressRef={scrollProgressRef}
          onWebGLReady={handleWebGLReady}
          onFirstReadyFrame={handleFirstReadyFrame}
        />

        {/* Layer 4: Central Logo (Pure black vector with line drawing, z-20) */}
        <CentralLogo
          appState={appState}
          prefersReducedMotion={prefersReducedMotion}
          scrollProgressRef={scrollProgressRef}
          exitProgressRef={logoExitProgressRef}
        />

        {/* Layer 5: Progressive Autograf Signature Overlay (Pure white over Logo, z-30) */}
        <AutografOverlay
          appState={appState}
          scrollProgressRef={scrollProgressRef}
          exitProgressRef={logoExitProgressRef}
        />

        <div ref={whiteTransitionRef} aria-hidden="true" className="absolute inset-0 z-[32] bg-white pointer-events-none" style={{ opacity: 0 }} />
        <div ref={aboutViewportRef} className="absolute inset-0 z-[35] overflow-hidden">
          <div ref={aboutExitRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
            <AboutSection
              appState={appState}
              language={language}
              progressRef={aboutProgressRef}
              prefersReducedMotion={prefersReducedMotion}
            />
          </div>
        </div>

        {/* Sequential Intro (preloading -> logoSequence -> video -> whiteCover) (z-40) */}
        {!isReady && (
          <IntroSequence
            key={introKey}
            appState={appState}
            onStateChange={setAppState}
            onIntroComplete={handleIntroComplete}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}
      </div>
    </div>
      {isReady && <><WorksReveal reducedMotion={prefersReducedMotion} /><WorksSection language={language} /></>}
    </>
  );
}
