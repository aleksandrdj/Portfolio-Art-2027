import React from 'react';
import { LOGO_FILLED_PATH, LOGO_VIEWBOX } from '../data/logoData';
import { Language } from '../types';

interface HeaderProps {
  isVisible: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isVisible,
  language,
  onLanguageChange,
}) => {
  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out select-none px-6 py-4 md:px-12 md:py-6 ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Compact original SVG brand mark */}
        <div className="flex items-center">
          <div
            id="brand-mark"
            className="h-6 md:h-7 flex items-center text-neutral-900"
            role="img"
            aria-label="ArtDeejay"
          >
            <svg
              viewBox={LOGO_VIEWBOX}
              className="h-full w-auto block fill-current"
              style={{ aspectRatio: '1920 / 787' }}
              aria-hidden="true"
            >
              <path
                d={LOGO_FILLED_PATH}
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
            <h1 className="sr-only">ArtDeejay</h1>
          </div>
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
              id="nav-item-work"
              className="text-neutral-400 cursor-default tracking-wide font-normal select-none"
            >
              {language === 'ru' ? 'Работы' : 'Work'}
            </span>
            <span
              id="nav-item-about"
              className="text-neutral-400 cursor-default tracking-wide font-normal select-none"
            >
              {language === 'ru' ? 'Обо мне' : 'About'}
            </span>
            <span
              id="nav-item-contact"
              className="text-neutral-400 cursor-default tracking-wide font-normal select-none"
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
              id="lang-btn-ru"
              type="button"
              disabled={!isVisible}
              onClick={() => onLanguageChange('ru')}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded ${
                language === 'ru'
                  ? 'text-neutral-950 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 font-normal'
              }`}
              aria-label="Переключить на русский язык"
              aria-pressed={language === 'ru'}
            >
              RU
            </button>
            <span className="text-neutral-300 select-none px-0.5" aria-hidden="true">/</span>
            <button
              id="lang-btn-en"
              type="button"
              disabled={!isVisible}
              onClick={() => onLanguageChange('en')}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded ${
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
