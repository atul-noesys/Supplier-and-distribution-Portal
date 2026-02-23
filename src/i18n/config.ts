// i18n configuration
export type Language = 'en' | 'zh';

export interface I18nConfig {
  defaultLanguage: Language;
  supportedLanguages: Language[];
}

export const i18nConfig: I18nConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'zh'],
};

export const languageLabels: Record<Language, string> = {
  en: 'English',
  zh: '中文',
};
