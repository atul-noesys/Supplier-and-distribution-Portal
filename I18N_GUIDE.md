# i18n (Internationalization) Implementation Guide

## Overview
This app implements a simple, type-safe i18n system for supporting multiple languages. Currently, English (en) and Chinese (zh) are supported.

## Features
- ✅ Support for multiple languages (English, Chinese)
- ✅ Translations stored in JSON files for easy maintenance
- ✅ Browser-side language switching with localStorage persistence
- ✅ Context-based API using React hooks
- ✅ Dot notation for accessing nested translations
- ✅ Language switcher component included

## Project Structure

```
public/
├── locales/
│   ├── en.json      (English translations)
│   └── zh.json      (Chinese translations)

src/
├── i18n/
│   ├── config.ts          (Configuration and language types)
│   ├── I18nProvider.tsx    (Context provider component)
│   ├── loader.ts           (Translation loading utilities)
│   ├── useTranslation.ts   (Hook for using translations)
│   └── index.ts            (Barrel export)
└── components/
    └── common/
        └── LanguageSwitcher.tsx  (Language selector component)
```

## Usage

### Basic Usage in Components

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function MyComponent() {
  const { t, language } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('messages.welcome_message')}</p>
      <p>Current language: {language}</p>
    </div>
  );
}
```

### Switching Languages

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { type Language } from '@/i18n/config';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
}
```

## Adding Translations

### 1. Add to Translation Files

```json
// public/locales/en.json
{
  "myModule": {
    "title": "My Title",
    "description": "My Description"
  }
}

// public/locales/zh.json
{
  "myModule": {
    "title": "我的标题",
    "description": "我的描述"
  }
}
```

### 2. Use in Components

```tsx
const { t } = useTranslation();

return (
  <div>
    <h1>{t('myModule.title')}</h1>
    <p>{t('myModule.description')}</p>
  </div>
);
```

## Adding New Languages

1. Create a new JSON file in `public/locales/` (e.g., `es.json` for Spanish)
2. Update `src/i18n/config.ts`:

```typescript
export type Language = 'en' | 'zh' | 'es';

export const languageLabels: Record<Language, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
};
```

3. Update `i18nConfig.supportedLanguages`:

```typescript
export const i18nConfig: I18nConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'zh', 'es'],
};
```

## API Reference

### useTranslation Hook

```typescript
interface I18nContextType {
  language: Language;           // Current language ('en', 'zh', etc.)
  setLanguage: (lang: Language) => void;  // Change language
  t: (key: string) => string;   // Get translation
  translations: Record<string, any>;  // Raw translations object
}
```

### useI18n Hook

Alternative direct access to context:

```tsx
import { useI18n } from '@/i18n/I18nProvider';

const { t, language, setLanguage } = useI18n();
```

## Language Persistence

- Selected language is automatically saved to browser's localStorage
- Language preference is restored on app reload
- HTML `lang` attribute is updated when language changes

## Best Practices

1. **Use dot notation** for nested translations: `t('section.subsection.key')`
2. **Keep translations organized** by feature/page in the JSON files
3. **Always provide translations in all languages** to maintain consistency
4. **Use semantic key names** that describe the content: `button.confirmDelete` instead of `btn1`
5. **Avoid hardcoding text** - use the `t()` function for all user-visible strings

## Fallback Behavior

If a translation key doesn't exist, the key itself will be returned. For example:
- `t('non.existent.key')` → returns `'non.existent.key'`
- This helps identify missing translations during development

## Example Components Using i18n

See:
- [LanguageSwitcher](./src/components/common/LanguageSwitcher.tsx) - Language selector

## Supported Languages

### English (en)
Default language with complete translations for common UI elements, navigation, authentication, and messages.

### Chinese (zh)
Simplified Chinese translations for all supported keys.
