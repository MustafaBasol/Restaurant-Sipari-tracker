import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import AppPreview from './AppPreview';

const HeroSection: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="relative isolate overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
                <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
                    <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-6xl">
                        {t('marketing.hero.title')}
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-text-secondary">
                        {t('marketing.hero.subtitle')}
                    </p>
                    <div className="mt-10 flex items-center gap-x-6">
                        <button
                            onClick={() => window.location.hash = '#/register'}
                            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {t('marketing.nav.startNow')}
                        </button>
                        <a href="#how-it-works" className="text-sm font-semibold leading-6 text-text-primary">
                            {t('marketing.hero.seeDemo')} <span aria-hidden="true">→</span>
                        </a>
                    </div>
                </div>
                <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
                    <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                       <AppPreview />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;