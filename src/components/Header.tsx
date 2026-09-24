import React, { useEffect, useRef } from 'react';
import { Language } from '../types';

interface HeaderProps {
  isVisible: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  scrollProgressRef?: React.MutableRefObject<number>;
}

export const Header: React.FC<HeaderProps> = ({
  isVisible,
  language,
  onLanguageChange,
  scrollProgressRef,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const brandNameRef = useRef<HTMLSpanElement>(null);
  const navWorkRef = useRef<HTMLSpanElement>(null);
  const navAboutRef = useRef<HTMLSpanElement>(null);
  const navContactRef = useRef<HTMLSpanElement>(null);
  const langRuRef = useRef<HTMLButtonElement>(null);
  const langEnRef = useRef<HTMLButtonElement>(null);
  const slashRef = useRef<HTMLSpanElement>(null);

  // Dynamic dark-to-light color transition based on scroll progress (without React re-renders)
  useEffect(() => {
    if (!scrollProgressRef) return;

    let animId: number;
    const updateColors = () => {
      const p = Math.min(Math.max(scrollProgressRef.current, 0), 1);
      // Transition from dark to light text between progress 0.15 and 0.75
      const t = Math.min(Math.max((p - 0.15) / 0.60, 0), 1);

      // Primary text: #111111 (17) -> #FFFFFF (255)
      const primaryRgb = Math.round(17 + (255 - 17) * t);
      const primaryColor = `rgb(${primaryRgb}, ${primaryRgb}, ${primaryRgb})`;

      // Secondary text: #737373 -> rgba(255, 255, 255, 0.75)
      const secRgb = Math.round(115 + (255 - 115) * t);
      const secAlpha = 0.55 + 0.25 * t;
      const secondaryColor = `rgba(${secRgb}, ${secRgb}, ${secRgb}, ${secAlpha})`;

      // Divider slash
      const slashRgb = Math.round(200 + (255 - 200) * t);
      const slashAlpha = 0.4 + 0.2 * t;
      const slashColor = `rgba(${slashRgb}, ${slashRgb}, ${slashRgb}, ${slashAlpha})`;

      if (brandNameRef.current) brandNameRef.current.style.color = primaryColor;
      if (navWorkRef.current) navWorkRef.current.style.color = secondaryColor;
      if (navAboutRef.current) navAboutRef.current.style.color = secondaryColor;
      if (navContactRef.current) navContactRef.current.style.color = secondaryColor;
      if (slashRef.current) slashRef.current.style.color = slashColor;

      if (langRuRef.current) {
        langRuRef.current.style.color = language === 'ru' ? primaryColor : secondaryColor;
      }
      if (langEnRef.current) {
        langEnRef.current.style.color = language === 'en' ? primaryColor : secondaryColor;
      }

      animId = requestAnimationFrame(updateColors);
    };

    animId = requestAnimationFrame(updateColors);
    return () => cancelAnimationFrame(animId);
  }, [scrollProgressRef, language]);

  return (
    <header
      ref={headerRef}
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out select-none px-6 py-4 md:px-12 md:py-6 ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Author name strictly as specified */}
        <div className="flex items-center">
          <span
            ref={brandNameRef}
            id="brand-author-name"
            className="text-[14px] md:text-[16px] font-medium text-neutral-900 tracking-tight font-sans select-none transition-colors"
          >
            {language === 'ru' ? 'Александр Савенков' : 'Alexsandr Savenkov'}
          </span>
        </div>

        {/* Right: Inactive nav items + language toggle */}
        <nav
          id="main-nav"
          className="flex items-center space-x-6 md:space-x-8 text-xs md:text-sm font-sans"
          aria-label="Navigation"
        >
          {/* Desktop-only inactive nav sections (no empty href="#") */}
          <div className="hidden md:flex items-center space-x-7">
            <span
              ref={navWorkRef}
              id="nav-item-work"
              className="text-neutral-400 cursor-default tracking-wide font-normal select-none transition-colors"
            >
              {language === 'ru' ? 'Работы' : 'Work'}
            </span>
            <span
              ref={navAboutRef}
              id="nav-item-about"
              className="text-neutral-400 cursor-default tracking-wide font-normal select-none transition-colors"
            >
              {language === 'ru' ? 'Обо мне' : 'About'}
            </span>
            <span
              ref={navContactRef}
              id="nav-item-contact"
              className="text-neutral-400 cursor-default tracking-wide font-normal select-none transition-colors"
            >
              {language === 'ru' ? 'Контакты' : 'Contact'}
            </span>
          </div>

          {/* Language Switcher RU / EN with 44x44px touch targets and visible focus */}
          <div
            id="language-switcher"
            className="flex items-center text-xs md:text-sm font-mono tracking-wider"
          >
            <button
              ref={langRuRef}
              id="lang-btn-ru"
              type="button"
              disabled={!isVisible}
              onClick={() => onLanguageChange('ru')}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 rounded ${
                language === 'ru'
                  ? 'text-neutral-950 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 font-normal'
              }`}
              aria-label="Переключить на русский язык"
              aria-pressed={language === 'ru'}
            >
              RU
            </button>
            <span
              ref={slashRef}
              className="text-neutral-300 select-none px-0.5 transition-colors"
              aria-hidden="true"
            >
              /
            </span>
            <button
              ref={langEnRef}
              id="lang-btn-en"
              type="button"
              disabled={!isVisible}
              onClick={() => onLanguageChange('en')}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 rounded ${
                language === 'en'
                  ? 'text-neutral-950 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 font-normal'
              }`}
              aria-label="Switch to English"
              aria-pressed={language === 'en'}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
