import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Language } from '../lib/i18n';

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'tr', label: 'TR' },
  { code: 'fr', label: 'FR' },
];

const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center bg-gray-200/80 rounded-full p-1">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`
                        px-3 py-1 text-sm font-semibold rounded-full transition-colors
                        ${
                          lang === code
                            ? 'bg-white text-text-primary shadow-sm'
                            : 'text-text-secondary hover:bg-gray-200'
                        }
                    `}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
