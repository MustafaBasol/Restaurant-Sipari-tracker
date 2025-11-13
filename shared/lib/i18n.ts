export type Language = 'en' | 'tr' | 'fr';

export const fetchTranslations = async (lang: Language): Promise<Record<string, any>> => {
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
};

export const resolve = (path: string, obj: any): string | undefined => {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
};
