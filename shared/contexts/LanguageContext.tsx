import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchTranslations, prefetchTranslations, resolve, Language } from '../lib/i18n';

interface LanguageContextData {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string, fallback?: string) => string;
}

export const LanguageContext = createContext<LanguageContextData | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLang] = useState<Language>('en'); 
    const [translations, setTranslations] = useState<Record<string, any>>({});

    const allLanguages: Language[] = ['en', 'tr', 'fr'];

    useEffect(() => {
        const load = async () => {
            const newTranslations = await fetchTranslations(lang);
            setTranslations(newTranslations);

            // Warm the cache for quick language switching.
            prefetchTranslations(allLanguages.filter(l => l !== lang));
        };
        load();
    }, [lang]);

    const t = useCallback((key: string, fallback?: string): string => {
        const value = resolve(key, translations);
        return value || fallback || key;
    }, [translations]);

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
