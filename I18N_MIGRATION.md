# i18n Migration Guide

This guide explains how to gradually migrate your existing components to use the i18n system.

## Quick Start Checklist

- [x] I18nProvider added to root layout
- [x] Translation files created (en.json, zh.json)
- [x] useTranslation hook available
- [x] LanguageSwitcher integrated in header
- [x] i18n utilities exported from `/src/i18n`

## Step-by-Step Migration

### Step 1: Identify Hardcoded Text

Look for hardcoded strings in your components:

```tsx
// ❌ Before: Hardcoded text
export function MyComponent() {
  return (
    <div>
      <h1>Welcome to Dashboard</h1>
      <button>Save Changes</button>
      <p>Please login to continue</p>
    </div>
  );
}
```

### Step 2: Add Translations to JSON Files

Update `/public/locales/en.json`:
```json
{
  "myComponent": {
    "title": "Welcome to Dashboard",
    "buttonLabel": "Save Changes",
    "message": "Please login to continue"
  }
}
```

Update `/public/locales/zh.json`:
```json
{
  "myComponent": {
    "title": "欢迎来到仪表板",
    "buttonLabel": "保存更改",
    "message": "请登录以继续"
  }
}
```

### Step 3: Use useTranslation Hook

```tsx
// ✅ After: Using i18n
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('myComponent.title')}</h1>
      <button>{t('myComponent.buttonLabel')}</button>
      <p>{t('myComponent.message')}</p>
    </div>
  );
}
```

## Migration Priority

### Priority 1: Core User-Facing Text
- Page titles
- Button labels
- Navigation links
- Form labels
- Error messages
- Success messages

### Priority 2: Descriptive Content
- Help text
- Placeholder text
- Table headers
- Section titles
- Card descriptions

### Priority 3: Advanced Features
- Tooltip text
- Modal content
- Validation messages
- Status badges
- List item labels

## Common Component Types to Migrate

### Form Components

```tsx
// Before
<input placeholder="Enter your email" />

// After
const { t } = useTranslation();
<input placeholder={t('auth.email')} />
```

### Button Components

```tsx
// Before
<button>Click Me</button>

// After
const { t } = useTranslation();
<button>{t('common.submit')}</button>
```

### Page Titles

```tsx
// Before
<h1>Purchase Orders</h1>

// After
const { t } = useTranslation();
<h1>{t('navigation.purchaseOrders')}</h1>
```

### Data-Driven Content

```tsx
// Before
const items = ['Create', 'Read', 'Update', 'Delete'];

// After
const { t } = useTranslation();
const items = [
  t('actions.create'),
  t('actions.read'),
  t('actions.update'),
  t('actions.delete'),
];
```

## Client vs Server Components

### Client Components (Recommended for i18n)

Use `'use client'` directive at the top:

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('common.welcome')}</h1>;
}
```

### Server Components

For server components, you'll need to convert them to client components if they need translations:

```tsx
// ❌ This won't work in server components
// Server components don't have access to context

// ✅ Convert to client component
'use client';

export function MyComponent() {
  // Now can use useTranslation
}
```

## Handling Dynamic Values

### Simple Concatenation

```tsx
const { t } = useTranslation();
const message = `${t('messages.welcome_message')}, ${userName}!`;
```

### Using Template Strings

```tsx
// Add to translations
// "greeting": "Welcome, {name}!"

// In component
const { t } = useTranslation();
const greeting = t('greeting').replace('{name}', userName);
```

### Creating Helper Function

```tsx
// src/i18n/helpers.ts
export function interpolate(key: string, params: Record<string, string>): string {
  let result = t(key);
  Object.entries(params).forEach(([param, value]) => {
    result = result.replace(`{${param}}`, value);
  });
  return result;
}

// In component
const greeting = interpolate('greeting', { name: userName });
```

## Testing After Migration

### Manual Testing
1. Switch languages in header
2. Verify all text updates
3. Check for any remaining hardcoded text
4. Test on different screen sizes
5. Verify localStorage persistence

### Automated Testing

```tsx
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n/I18nProvider';

test('displays translated text', () => {
  render(
    <I18nProvider>
      <MyComponent />
    </I18nProvider>
  );
  
  expect(screen.getByText('Welcome')).toBeInTheDocument();
});
```

## Common Pitfalls

### 1. Forgetting 'use client' Directive

```tsx
// ❌ Wrong: will cause error
import { useTranslation } from '@/i18n/useTranslation';

export function MyComponent() {
  const { t } = useTranslation(); // Error in server component
}

// ✅ Right
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function MyComponent() {
  const { t } = useTranslation(); // Works!
}
```

### 2. Missing Translations

Always ensure both en.json and zh.json have the same keys:

```json
// ✅ Correct
// en.json
{ "myKey": "Hello" }

// zh.json
{ "myKey": "你好" }

// ❌ Wrong: missing in one file
// en.json
{ "myKey": "Hello" }

// zh.json
{ "otherKey": "其他" }
```

### 3. Incorrect Key Path

```tsx
// ❌ Wrong: nested object instead of dot notation
t({section: {key: 'value'}})

// ✅ Right: use dot notation
t('section.key')
```

### 4. Not Exporting useTranslation

```tsx
// ❌ Wrong: using useI18n directly
import { useI18n } from '@/i18n/I18nProvider';

// ✅ Right: use exported hook
import { useTranslation } from '@/i18n/useTranslation';
```

## File Structure After Migration

```
src/
├── app/
│   └── layout.tsx          (Updated with I18nProvider)
├── components/
│   └── (all components updated with useTranslation)
├── i18n/
│   ├── config.ts
│   ├── I18nProvider.tsx
│   ├── loader.ts
│   ├── useTranslation.ts
│   └── index.ts
└── pages/

public/
└── locales/
    ├── en.json             (English translations)
    └── zh.json             (Chinese translations)
```

## Next Steps After Basic Migration

1. **Monitor for missing translations** - Use browser console to identify keys that aren't translating
2. **Performance optimization** - Consider lazy loading for large translation files
3. **Add more languages** - Repeat the process for new languages (es.json, fr.json, etc.)
4. **Create translation guidelines** - Establish naming conventions and best practices
5. **Set up translation CI/CD** - Automate validation of translation key consistency

## Rollback Plan

If issues arise, you can:

1. Temporarily revert to hardcoded text
2. Check translation files for syntax errors
3. Verify I18nProvider is wrapping all children
4. Ensure no circular imports in i18n files
5. Clear localStorage and restart development server

## Resources

- [I18N_GUIDE.md](./I18N_GUIDE.md) - API reference and configuration
- [I18N_EXAMPLES.md](./I18N_EXAMPLES.md) - Practical code examples
- [src/i18n/](./src/i18n) - Implementation files
- [public/locales/](./public/locales) - Translation files

## Support

For questions or issues with i18n implementation:
1. Check the examples in I18N_EXAMPLES.md
2. Review the LanguageSwitcher component for reference
3. Verify translation file syntax (valid JSON)
4. Ensure components use 'use client' directive
