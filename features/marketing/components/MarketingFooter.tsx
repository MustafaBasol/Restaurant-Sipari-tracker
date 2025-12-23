import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const MarketingFooter: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-card-bg border-t border-border-color">
      <div className="max-w-7xl mx-auto py-12 px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-xl font-bold">{t('branding.name')}</h3>
            <p className="text-text-secondary mt-2 text-sm max-w-xs">{t('branding.tagline')}</p>
            <p className="text-text-secondary mt-3 text-sm">
              <span className="font-medium text-text-primary">{t('marketing.footer.contact')}</span>{' '}
              <a href="mailto:info@kitchorify.com" className="text-accent hover:text-accent-hover">
                info@kitchorify.com
              </a>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <button
              onClick={() => (window.location.hash = '#/privacy')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              {t('marketing.footer.privacy')}
            </button>
            <button
              onClick={() => (window.location.hash = '#/terms')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              {t('marketing.footer.terms')}
            </button>
            <button
              onClick={() => (window.location.hash = '#/cookies')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              {t('marketing.footer.cookies')}
            </button>
            <button
              onClick={() => (window.location.hash = '#/security')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              {t('marketing.footer.security')}
            </button>
            <button
              onClick={() => (window.location.hash = '#/data-rights')}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              {t('marketing.footer.dataRights')}
            </button>
          </div>
        </div>
        <div className="mt-8 border-t border-border-color pt-8 text-center text-sm text-text-secondary">
          <p>{t('marketing.footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
