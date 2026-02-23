import { Language } from './config';

// Type-safe translation loader
export async function loadTranslation(language: Language): Promise<Record<string, any>> {
  try {
    const response = await fetch(`/locales/${language}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translation for language: ${language}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error loading translation: ${error}`);
    return {};
  }
}

// Get nested translation value by dot notation (e.g., "common.welcome")
export function getTranslationValue(
  translations: Record<string, any>,
  key: string
): string {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Return the key itself if translation not found
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}
