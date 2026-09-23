import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AutografOverlay } from './components/AutografOverlay';
import { CentralLogo } from './components/CentralLogo';
import { Header } from './components/Header';
import { IntroSequence } from './components/IntroSequence';
import { SiluetDOM } from './components/SiluetDOM';
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
  const scrollProgressRef = useRef<number>(prefersReducedMotion ? 1.0 : 0.0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Replay function accessible globally, via 'R' key, and via URL param ?intro=1
  const replayIntro = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    scrollProgressRef.current = 0.0;
    document.body.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';
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

  // Sync body background color and scrolling behavior
  useEffect(() => {
    if (appState === 'ready') {
      document.body.style.backgroundColor = '#FFFFFF';
      if (prefersReducedMotion) {
        document.body.style.overflow = 'hidden';
        scrollProgressRef.current = 1.0;
      } else {
        document.body.style.overflowY = 'auto';
        document.body.style.overflowX = 'hidden';
      }
    } else {
      document.body.style.backgroundColor = '#000000';
      document.body.style.overflow = 'hidden';
      scrollProgressRef.current = 0.0;
    }
  }, [appState, prefersReducedMotion]);

  // GSAP ScrollTrigger configuration for natural vertical scrolling
  useEffect(() => {
    if (appState !== 'ready' || prefersReducedMotion) {
      return;
    }

    // Ensure scroll starts from top upon entering ready state
    window.scrollTo({ top: 0, behavior: 'instant' });
    scrollProgressRef.current = 0.0;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Mobile address bar height adjustments should not disrupt scroll progress
    ScrollTrigger.config({ ignoreMobileResize: true });

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.35, // Smooth 0.35s scrub as specified
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress;
      },
    });

    ScrollTrigger.refresh();

    return () => {
      trigger.kill();
    };
  }, [appState, prefersReducedMotion]);

  const isReady = appState === 'ready';

  return (
    <div
      ref={scrollContainerRef}
      id="portfolio-screen"
      className={`relative w-full select-none transition-colors duration-700 ease-in-out ${
        isReady && !prefersReducedMotion
          ? 'h-[240svh]'
          : 'h-[100svh] overflow-hidden'
      } ${isReady ? 'bg-[#FFFFFF]' : 'bg-[#000000]'}`}
    >
      {/* Sticky scene container (100svh viewport pinned during transition distance) */}
      <div
        className={`w-full h-[100svh] overflow-hidden ${
          isReady && !prefersReducedMotion ? 'sticky top-0 left-0' : 'relative'
        }`}
      >
        {/* Layer 7: Minimalist Header (z-50) */}
        <Header
          isVisible={isReady}
          language={language}
          onLanguageChange={setLanguage}
          scrollProgressRef={scrollProgressRef}
        />

        {/* WebGL Canvas:
            Layer 1 (White base),
            Layer 2 (Living gradient 0->1),
            Layer 3 (Topographic lines),
            Layer 4 (Siluet 0->0.10),
            Layer 5 (Central Logo 60vw -> 34vw/48vw, #111111 -> #FFFFFF)
        */}
        <ArtDeejayWebGL
          appState={appState}
          prefersReducedMotion={prefersReducedMotion}
          scrollProgressRef={scrollProgressRef}
          onWebGLReady={handleWebGLReady}
          onFirstReadyFrame={handleFirstReadyFrame}
        />

        {/* DOM Fallbacks if WebGL is unavailable */}
        {!isWebGLActive && (
          <SiluetDOM
            appState={appState}
            scrollProgressRef={scrollProgressRef}
          />
        )}

        {/* Layer 5 Fallback: Central Logo DOM Fallback (z-30) */}
        <CentralLogo
          appState={appState}
          prefersReducedMotion={prefersReducedMotion}
          isWebGLActive={isWebGLActive}
          isWebGLReadyFrameDrawn={isWebGLReadyFrameDrawn}
          scrollProgressRef={scrollProgressRef}
        />

        {/* Layer 6: Progressive Autograf Signature Overlay (z-20) */}
        <AutografOverlay
          appState={appState}
          scrollProgressRef={scrollProgressRef}
        />

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
  );
}
