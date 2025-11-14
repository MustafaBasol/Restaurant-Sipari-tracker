import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const MarketingFooter: React.FC = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-card-bg border-t border-border-color">
            <div className="max-w-7xl mx-auto py-12 px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <h3 className="text-xl font-bold">Ordo</h3>
                        <p className="text-text-secondary mt-2 text-sm max-w-xs">{t('marketing.footer.description')}</p>
                    </div>
                    <div className="flex gap-x-6">
                        <a href="#" className="text-sm text-text-secondary hover:text-text-primary">{t('marketing.footer.privacy')}</a>
                        <a href="#" className="text-sm text-text-secondary hover:text-text-primary">{t('marketing.footer.terms')}</a>
                    </div>
                </div>
                <div className="mt-8 border-t border-border-color pt-8 text-center text-sm text-text-secondary">
                    <p>&copy; {new Date().getFullYear()} Ordo. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default MarketingFooter;