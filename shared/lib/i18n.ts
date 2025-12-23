export type Language = 'en' | 'tr' | 'fr';

const translationsPromiseCache = new Map<Language, Promise<Record<string, any>>>();

const shouldBypassCache = () => {
  // In development with HMR, locale JSON files can change while the app stays loaded.
  // Bypass the in-memory cache so new keys show up immediately.
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

export const fetchTranslations = async (lang: Language): Promise<Record<string, any>> => {
  const bypassCache = shouldBypassCache();
  const cached = !bypassCache ? translationsPromiseCache.get(lang) : undefined;
  if (cached) return cached;

  const promise = (async () => {
    try {
      const url = bypassCache ? `/locales/${lang}.json?ts=${Date.now()}` : `/locales/${lang}.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Could not load translations for ${lang}`, error);
      return {}; // Return empty object on failure to prevent crashes
    }
  })();

  if (!bypassCache) {
    translationsPromiseCache.set(lang, promise);
  }
  return promise;
};

export const prefetchTranslations = (languages: Language[]) => {
  languages.forEach((lang) => {
    void fetchTranslations(lang);
  });
};

export const resolve = (path: string, obj: any): string | undefined => {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
};
