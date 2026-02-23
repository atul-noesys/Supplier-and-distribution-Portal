'use client';

import { useTranslation } from '@/i18n/useTranslation';

/**
 * Example component demonstrating i18n usage
 * This component shows how to use the translation system in your app
 */
export function I18nExample() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <h2 className="text-lg font-bold mb-4">{t('common.welcome')}</h2>
      
      <div className="space-y-3">
        <p className="text-sm">
          <span className="font-semibold">Current Language:</span> {language}
        </p>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded space-y-2">
          <p className="text-sm"><span className="font-semibold">Message:</span> {t('messages.welcome_message')}</p>
          <p className="text-sm"><span className="font-semibold">Login:</span> {t('auth.loginTitle')}</p>
          <p className="text-sm"><span className="font-semibold">Dashboard:</span> {t('common.dashboard')}</p>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          This component demonstrates basic i18n usage. Replace hardcoded text with t('key.name') function calls.
        </p>
      </div>
    </div>
  );
}
