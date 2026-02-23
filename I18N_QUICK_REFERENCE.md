# i18n Quick Reference Card

## 🚀 Basic Usage

```tsx
'use client';
import { useTranslation } from '@/i18n/useTranslation';

export function MyComponent() {
  const { t, language, setLanguage } = useTranslation();
  
  return <h1>{t('common.welcome')}</h1>;
}
```

## 📝 Common Translation Keys

| Purpose | Key | EN | ZH |
|---------|-----|----|----|
| Welcome | `common.welcome` | Welcome | 欢迎 |
| Dashboard | `common.dashboard` | Dashboard | 仪表板 |
| Login | `common.login` | Login | 登录 |
| Logout | `common.logout` | Logout | 登出 |
| Settings | `common.settings` | Settings | 设置 |
| Submit | `common.submit` | Submit | 提交 |
| Cancel | `common.cancel` | Cancel | 取消 |
| Loading | `common.loading` | Loading | 加载中 |
| Success | `messages.operation_successful` | Operation completed successfully | 操作成功完成 |
| Error | `messages.operation_failed` | Operation failed | 操作失败 |

## 🔧 Common Patterns

### Form Labels
```tsx
<label>{t('auth.email')}</label>
```

### Buttons
```tsx
<button>{t('common.submit')}</button>
```

### Navigation
```tsx
<nav>{t('navigation.home')}</nav>
```

### Conditionals
```tsx
{language === 'zh' && <p>中文版本</p>}
```

### With Data
```tsx
const message = `${t('messages.welcome_message')}, ${name}!`;
```

## 📁 File Locations

- **Translations**: `public/locales/{en,zh}.json`
- **Provider**: `src/i18n/I18nProvider.tsx`
- **Hook**: `src/i18n/useTranslation.ts`
- **Config**: `src/i18n/config.ts`

## 🎯 Supported Languages

- `en` - English 🇬🇧
- `zh` - Chinese (Simplified) 🇨🇳

## ⚡ Key Imports

```tsx
// Hook (recommended)
import { useTranslation } from '@/i18n/useTranslation';

// Direct context (if needed)
import { useI18n } from '@/i18n/I18nProvider';
import { I18nProvider } from '@/i18n/I18nProvider';

// Types
import type { Language } from '@/i18n/config';

// Config
import { languageLabels, i18nConfig } from '@/i18n/config';
```

## 🎨 Language Switcher

Located in header (next to theme toggle). Users can:
1. Click the globe icon
2. Select a language
3. Language persists across sessions

## ✅ Important Notes

- ✅ Always use `'use client'` in components
- ✅ Add translations to **both** en.json and zh.json
- ✅ Use dot notation: `t('section.key')`
- ✅ Use kebab-case for nested keys
- ❌ Don't hardcode text
- ❌ Don't use translation in server components
- ❌ Don't use useI18n (use useTranslation instead)

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Text not changing | Check 'use client' directive |
| Hook error | Ensure I18nProvider wraps component |
| Key returns itself | Add translation to JSON file |
| Language not saving | Clear localStorage, restart |

## 📚 Full Documentation

- **Complete Guide**: `I18N_GUIDE.md`
- **Code Examples**: `I18N_EXAMPLES.md`
- **Migration Steps**: `I18N_MIGRATION.md`
- **Implementation Summary**: `I18N_IMPLEMENTATION_SUMMARY.md`

## 🔌 API Reference

### useTranslation()

```typescript
interface Result {
  t: (key: string) => string;        // Get translation
  language: 'en' | 'zh';             // Current language
  setLanguage: (lang: Language) => void;  // Change language
  translations: Record<string, any>;  // Raw translations
}
```

## Example: Complete Component

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function WelcomePage() {
  const { t, language } = useTranslation();

  return (
    <div className="p-8">
      <h1>{t('common.welcome')}</h1>
      <p>{t('messages.welcome_message')}</p>
      <p>Language: {language}</p>
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

---

**Need more help?** Check the complete documentation files or look at example components in the codebase.
