'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, i18nConfig } from './config';
import { loadTranslation, getTranslationValue } from './loader';

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  translations: Record<string, any>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(i18nConfig.defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations on mount and when language changes
  useEffect(() => {
    const initializeTranslations = async () => {
      setIsLoading(true);
      
      // Load from localStorage if available
      const savedLanguage = localStorage.getItem('language') as Language | null;
      if (savedLanguage && i18nConfig.supportedLanguages.includes(savedLanguage)) {
        setLanguageState(savedLanguage);
      }

      // Load translations for current language
      const loadedTranslations = await loadTranslation(language);
      setTranslations(loadedTranslations);
      setIsLoading(false);
    };

    initializeTranslations();
  }, [language]);

  const setLanguage = (newLanguage: Language) => {
    if (i18nConfig.supportedLanguages.includes(newLanguage)) {
      setLanguageState(newLanguage);
      localStorage.setItem('language', newLanguage);
      // Update html lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLanguage;
      }
    }
  };

  const t = (key: string): string => {
    return getTranslationValue(translations, key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
