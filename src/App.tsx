import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CentralLogo } from './components/CentralLogo';
import { Header } from './components/Header';
import { AppState, Language } from './types';
import { ArtDeejayWebGL } from './webgl/ArtDeejayWebGL';

export default function App() {
  // Check if intro has already run in this session
  const [hasSeenIntro] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('artdeejay_intro_done') === 'true';
    } catch {
      return false;
    }
  });

  // Check prefers-reduced-motion
  const [prefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // State: 'intro' | 'theme-transition' | 'ready'
  const [appState, setAppState] = useState<AppState>(() => {
    if (hasSeenIntro || prefersReducedMotion) {
      return 'ready';
    }
    return 'intro';
  });

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

  // Transition from intro to ready
  const handleIntroComplete = useCallback(() => {
    setAppState('ready');
    try {
      sessionStorage.setItem('artdeejay_intro_done', 'true');
    } catch {
      // ignore
    }
  }, []);

  // Sync body background color
  useEffect(() => {
    if (appState === 'ready') {
      document.body.style.backgroundColor = '#FFFFFF';
    } else {
      document.body.style.backgroundColor = '#000000';
    }
  }, [appState]);

  return (
    <div
      id="portfolio-screen"
      className={`relative w-full h-[100svh] min-h-[100svh] overflow-hidden select-none transition-bg ${
        appState === 'ready' ? 'bg-ready' : 'bg-intro'
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

      {/* Layer 3: Intro Calligraphy Signature Reveal (active during intro, hides when ready) (z-30) */}
      <CentralLogo
        appState={appState}
        onIntroComplete={handleIntroComplete}
        prefersReducedMotion={prefersReducedMotion}
        isWebGLActive={true}
      />
    </div>
  );
}
