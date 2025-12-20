export type Language = 'en' | 'tr' | 'fr';

const translationsPromiseCache = new Map<Language, Promise<Record<string, any>>>();

export const fetchTranslations = async (lang: Language): Promise<Record<string, any>> => {
    const cached = translationsPromiseCache.get(lang);
    if (cached) return cached;

    const promise = (async () => {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Could not load translations for ${lang}`, error);
            return {}; // Return empty object on failure to prevent crashes
        }
    })();

    translationsPromiseCache.set(lang, promise);
    return promise;
};

export const prefetchTranslations = (languages: Language[]) => {
    languages.forEach(lang => {
        void fetchTranslations(lang);
    });
};

export const resolve = (path: string, obj: any): string | undefined => {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
};
