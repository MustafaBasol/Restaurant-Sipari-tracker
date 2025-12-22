import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchTranslations, prefetchTranslations, resolve, Language } from '../lib/i18n';
import { isBrowser } from '../lib/device';

const ALL_LANGUAGES: Language[] = ['en', 'tr', 'fr'];

const STORAGE_KEY = 'kitchorify-lang';

const isValidLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'tr' || value === 'fr';

const getInitialLanguage = (): Language => {
  if (!isBrowser()) return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isValidLanguage(stored) ? stored : 'en';
};

interface LanguageContextData {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

export const LanguageContext = createContext<LanguageContextData | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => getInitialLanguage());
  const [translations, setTranslations] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    const load = async () => {
      const newTranslations = await fetchTranslations(lang);
      setTranslations(newTranslations);

      // Warm the cache for quick language switching.
      prefetchTranslations(ALL_LANGUAGES.filter((l) => l !== lang));
    };
    load();
  }, [lang]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const value = resolve(key, translations);
      return value || fallback || key;
    },
    [translations],
  );

  const handleSetLang = (newLang: Language) => {
    if (newLang !== lang) {
      setLang(newLang);
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
