import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const CtaSection: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 text-center shadow-2xl rounded-2xl sm:px-16">
                    <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        {t('marketing.cta.title')}
                    </h2>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <button
                            onClick={() => window.location.hash = '#/register'}
                            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            {t('marketing.cta.button')}
                        </button>
                    </div>
                    <svg
                        viewBox="0 0 1024 1024"
                        className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
                        aria-hidden="true"
                    >
                        <circle cx={512} cy={512} r={512} fill="url(#8d958450-c69f-4251-94bc-4e091a323369)" fillOpacity="0.7" />
                        <defs>
                            <radialGradient id="8d958450-c69f-4251-94bc-4e091a323369">
                                <stop stopColor="#007aff" />
                                <stop offset={1} stopColor="#34c759" />
                            </radialGradient>
                        </defs>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default CtaSection;