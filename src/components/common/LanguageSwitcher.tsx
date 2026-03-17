'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { languageLabels, type Language, i18nConfig } from '@/i18n/config';
import { useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center font-bold text-sm text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-9 w-9 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Change language"
        title={`Current language: ${languageLabels[language]}`}
      >
        {language === 'en' ? 'EN' : 'ZH'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {i18nConfig.supportedLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelectLanguage(lang)}
              className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                language === lang
                  ? 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold'
                  : 'text-gray-700 dark:text-gray-300'
              } ${lang === i18nConfig.supportedLanguages[0] ? 'rounded-t-lg' : ''} ${
                lang === i18nConfig.supportedLanguages[i18nConfig.supportedLanguages.length - 1]
                  ? 'rounded-b-lg'
                  : ''
              }`}
            >
              <span className="flex items-center justify-between">
                {languageLabels[lang]}
                {language === lang && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="text-green-600"
                  >
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

