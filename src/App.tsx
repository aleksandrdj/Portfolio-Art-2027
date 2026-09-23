import React, { useCallback, useEffect, useState } from 'react';
import { CentralLogo } from './components/CentralLogo';
import { Header } from './components/Header';
import { AppState, Language } from './types';
import { ArtDeejayWebGL } from './webgl/ArtDeejayWebGL';

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

  // Stage state: 'intro' | 'theme-transition' | 'ready'
  const [appState, setAppState] = useState<AppState>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return 'ready';
      }
    }
    return 'intro';
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

  // Transition from stroke drawing to theme transition (black -> white)
  const handleThemeTransitionStart = useCallback(() => {
    setAppState('theme-transition');
  }, []);

  // Transition from theme transition to full ready state
  const handleIntroComplete = useCallback(() => {
    setAppState('ready');
  }, []);

  // Replay function accessible globally, via 'R' key, and via URL param ?intro=1
  const replayIntro = useCallback(() => {
    document.body.style.backgroundColor = '#000000';
    setIsWebGLReadyFrameDrawn(false);
    setAppState('intro');
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

  // Sync body background color
  useEffect(() => {
    if (appState === 'ready' || appState === 'theme-transition') {
      document.body.style.backgroundColor = '#FFFFFF';
    } else {
      document.body.style.backgroundColor = '#000000';
    }
  }, [appState]);

  return (
    <div
      id="portfolio-screen"
      className={`relative w-full h-[100svh] min-h-[100svh] overflow-hidden select-none transition-colors duration-700 ease-in-out ${
        appState === 'ready' || appState === 'theme-transition' ? 'bg-[#FFFFFF]' : 'bg-[#000000]'
      }`}
    >
      {/* Layer 1: Minimalist Header (z-50) */}
      <Header
        isVisible={appState === 'ready'}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Layer 2: Unified WebGL2 Fluid Simulation, Contour Lines & Dynamic Inversion (z-10) */}
      <ArtDeejayWebGL
        appState={appState}
        prefersReducedMotion={prefersReducedMotion}
        onWebGLReady={handleWebGLReady}
        onFirstReadyFrame={handleFirstReadyFrame}
      />

      {/* Layer 3: Intro Calligraphy Reveal & Seamless DOM Fallback (z-30) */}
      <CentralLogo
        key={introKey}
        appState={appState}
        onThemeTransitionStart={handleThemeTransitionStart}
        onIntroComplete={handleIntroComplete}
        prefersReducedMotion={prefersReducedMotion}
        isWebGLActive={isWebGLActive}
        isWebGLReadyFrameDrawn={isWebGLReadyFrameDrawn}
      />
    </div>
  );
}
