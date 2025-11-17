import React from 'react';
import LanguageSwitcher from '../../../shared/components/LanguageSwitcher';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';

const MarketingHeader: React.FC = () => {
    const { t } = useLanguage();
    const { authState } = useAuth();
    
    return (
        <header className="bg-card-bg/80 backdrop-blur-sm border-b border-border-color sticky top-0 z-20">
            <nav className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
                <div className="flex items-center gap-x-8">
                    <button onClick={() => window.location.hash = '#/'} className="text-xl font-bold text-text-primary">{t('branding.name')}</button>
                </div>
                <div className="flex items-center gap-x-4">
                    <LanguageSwitcher />
                    {authState ? (
                         <button onClick={() => window.location.hash = '#/app'} className="hidden sm:block bg-accent text-white font-semibold py-2 px-4 rounded-xl hover:bg-accent-hover transition-colors text-sm">
                            {t('marketing.nav.goToDashboard')}
                         </button>
                    ) : (
                        <div className="hidden sm:flex items-center gap-x-4">
                             <button onClick={() => window.location.hash = '#/login'} className="text-sm font-semibold leading-6 text-text-primary hover:text-text-secondary">
                                {t('marketing.nav.login')}
                            </button>
                            <button onClick={() => window.location.hash = '#/register'} className="bg-accent text-white font-semibold py-2 px-4 rounded-xl hover:bg-accent-hover transition-colors text-sm">
                                {t('marketing.nav.signUp')}
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default MarketingHeader;