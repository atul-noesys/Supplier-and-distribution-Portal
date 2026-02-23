# i18n Implementation Examples

This file shows practical examples of how to implement i18n throughout the Supplier and Distribution Portal.

## Simple Text Translation

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function SimpleExample() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <button>{t('common.submit')}</button>
    </div>
  );
}
```

## Displaying Current Language

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function CurrentLanguageDisplay() {
  const { language, t } = useTranslation();

  return (
    <p>
      {t('common.language')}: <strong>{language.toUpperCase()}</strong>
    </p>
  );
}
```

## Changing Language Programmatically

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { type Language } from '@/i18n/config';

export function LanguageSwitchButton() {
  const { setLanguage } = useTranslation();

  return (
    <div className="space-x-2">
      <button onClick={() => setLanguage('en' as Language)}>English</button>
      <button onClick={() => setLanguage('zh' as Language)}>中文</button>
    </div>
  );
}
```

## Form with Translations

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function LoginForm() {
  const { t } = useTranslation();

  return (
    <form>
      <div>
        <label>{t('auth.email')}</label>
        <input type="email" placeholder={t('auth.email')} />
      </div>
      
      <div>
        <label>{t('auth.password')}</label>
        <input type="password" placeholder={t('auth.password')} />
      </div>

      <div>
        <label>
          <input type="checkbox" />
          {t('auth.rememberMe')}
        </label>
      </div>

      <button type="submit">{t('auth.loginTitle')}</button>
      
      <p>
        {t('auth.noAccount')} <a href="/register">{t('common.register')}</a>
      </p>
    </form>
  );
}
```

## Navigation Menu with Translations

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import Link from 'next/link';

export function NavigationMenu() {
  const { t } = useTranslation();

  const menuItems = [
    { href: '/', label: t('navigation.home') },
    { href: '/deliveries', label: t('navigation.deliveries') },
    { href: '/purchase-orders', label: t('navigation.purchaseOrders') },
    { href: '/shipments', label: t('navigation.shipments') },
    { href: '/work-orders', label: t('navigation.workOrders') },
  ];

  return (
    <nav>
      {menuItems.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

## Conditional Translations Based on Language

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function LanguageSpecificContent() {
  const { language, t } = useTranslation();

  return (
    <div>
      <h1>{t('messages.welcome_message')}</h1>
      
      {language === 'zh' && (
        <p>这是中文专用内容</p>
      )}
      
      {language === 'en' && (
        <p>This is English-only content</p>
      )}
    </div>
  );
}
```

## Modal with Translation Keys

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function ConfirmationModal() {
  const { t } = useTranslation();

  const handleConfirm = () => {
    // Perform action
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{t('common.warning')}</h2>
        <p>{t('messages.operation_failed')}</p>
        
        <div className="modal-actions">
          <button onClick={handleConfirm}>{t('common.yes')}</button>
          <button onClick={() => {}}>{t('common.no')}</button>
        </div>
      </div>
    </div>
  );
}
```

## Table Headers with Translations

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function OrdersTable() {
  const { t } = useTranslation();

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: t('sidebar.orders') },
    { key: 'status', label: t('common.loading') },
    { key: 'actions', label: t('common.edit') },
  ];

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* Table rows */}
      </tbody>
    </table>
  );
}
```

## Toast Messages with Translations

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'react-toastify';

export function DataSaver() {
  const { t } = useTranslation();

  const handleSave = async () => {
    try {
      // Perform save operation
      toast.success(t('messages.operation_successful'));
    } catch (error) {
      toast.error(t('messages.operation_failed'));
    }
  };

  return <button onClick={handleSave}>{t('common.saveChanges')}</button>;
}
```

## Dropdown with Translated Options

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';

export function SettingsDropdown() {
  const { t } = useTranslation();

  const options = [
    { value: 'dashboard', label: t('common.dashboard') },
    { value: 'settings', label: t('common.settings') },
    { value: 'logout', label: t('common.logout') },
  ];

  return (
    <select>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

## Using with React Query

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { useQuery } from '@tanstack/react-query';

export function UserProfile() {
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      return response.json();
    },
  });

  if (isLoading) return <div>{t('common.loading')}...</div>;
  if (error) return <div>{t('messages.operation_failed')}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
    </div>
  );
}
```

## Best Practices

### ✅ DO:
- Use dot notation for organized keys: `t('section.key')`
- Keep translations in JSON files
- Use `useTranslation` hook in client components
- Wrap user-visible text with `t()` function
- Create new translation keys as you add features

### ❌ DON'T:
- Hardcode text in components
- Mix translations with business logic
- Use translation keys that are too generic
- Forget to add translations in all languages
- Use `useI18n` directly (use `useTranslation` instead)

## Adding New Translation Keys

When adding a new feature:

1. **Add to en.json:**
```json
{
  "myFeature": {
    "title": "Feature Title",
    "description": "Feature description"
  }
}
```

2. **Add to zh.json:**
```json
{
  "myFeature": {
    "title": "功能标题",
    "description": "功能描述"
  }
}
```

3. **Use in component:**
```tsx
const { t } = useTranslation();
return <h1>{t('myFeature.title')}</h1>;
```

## Testing Translations

You can test translations by:
1. Switching languages using the LanguageSwitcher in the header
2. Checking that all text updates correctly
3. Verifying localStorage stores your language preference
4. Reloading the page to confirm persistence

## Performance Notes

- Translations are loaded once per language and cached
- Language preference is persisted in localStorage
- Language switching is instant (no page reload needed)
- Each component can independently use `useTranslation()`
