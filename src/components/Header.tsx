import React from 'react';
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out select-none px-6 py-6 md:px-12 md:py-8 ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand typography */}
        <div className="flex items-center">
          <span
            id="brand-name"
            className="text-neutral-900 tracking-[-0.02em] font-medium text-sm md:text-base font-sans"
          >
            ArtDeejay
          </span>
        </div>

        {/* Right: Inactive nav items + language toggle */}
        <nav
          id="main-nav"
          className="flex items-center space-x-6 md:space-x-8 text-xs md:text-sm font-sans"
          aria-label="Navigation"
        >
          {/* Desktop-only inactive nav sections */}
          <div className="hidden md:flex items-center space-x-7">
            <span
              id="nav-item-work"
              className="text-neutral-400 cursor-default tracking-wide font-normal transition-colors"
            >
              {language === 'ru' ? 'Работы' : 'Work'}
            </span>
            <span
              id="nav-item-about"
              className="text-neutral-400 cursor-default tracking-wide font-normal transition-colors"
            >
              {language === 'ru' ? 'Обо мне' : 'About'}
            </span>
            <span
              id="nav-item-contact"
              className="text-neutral-400 cursor-default tracking-wide font-normal transition-colors"
            >
              {language === 'ru' ? 'Контакты' : 'Contact'}
            </span>
          </div>

          {/* Language Switcher RU / EN */}
          <div
            id="language-switcher"
            className="flex items-center space-x-1.5 text-xs md:text-sm font-mono tracking-wider pl-1 md:pl-2"
          >
            <button
              id="lang-btn-ru"
              type="button"
              disabled={!isVisible}
              onClick={() => onLanguageChange('ru')}
              className={`transition-colors duration-200 cursor-pointer ${
                language === 'ru'
                  ? 'text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-700 font-normal'
              }`}
              aria-label="Переключить на русский язык"
              aria-pressed={language === 'ru'}
            >
              RU
            </button>
            <span className="text-neutral-300 select-none">/</span>
            <button
              id="lang-btn-en"
              type="button"
              disabled={!isVisible}
              onClick={() => onLanguageChange('en')}
              className={`transition-colors duration-200 cursor-pointer ${
                language === 'en'
                  ? 'text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-700 font-normal'
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
