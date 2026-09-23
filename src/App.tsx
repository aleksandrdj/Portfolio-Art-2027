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
  // Check prefers-reduced-motion
  const [prefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // State: 'intro' | 'theme-transition' | 'ready'
  // In development, always play intro on every reload
  const [appState, setAppState] = useState<AppState>('intro');

  // Key to force-remount intro component when replayed
  const [introKey, setIntroKey] = useState<number>(0);

  // Language state (persists across sessions, does not restart intro)
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

  // Replay function accessible globally and via 'R' key
  const replayIntro = useCallback(() => {
    setAppState('intro');
    setIntroKey((k) => k + 1);
  }, []);

  useEffect(() => {
    window.replayIntro = replayIntro;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Replay intro if user presses 'R' outside input/textarea
      if (
        (e.key === 'r' || e.key === 'R') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        replayIntro();
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
      className={`relative w-full h-[100svh] min-h-[100svh] overflow-hidden select-none transition-bg ${
        appState === 'ready' || appState === 'theme-transition' ? 'bg-ready' : 'bg-intro'
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
      />

      {/* Layer 3: Intro Calligraphy Signature Reveal (active during intro & theme transition) (z-30) */}
      <CentralLogo
        key={introKey}
        appState={appState}
        onThemeTransitionStart={handleThemeTransitionStart}
        onIntroComplete={handleIntroComplete}
        prefersReducedMotion={prefersReducedMotion}
        isWebGLActive={true}
      />
    </div>
  );
}
