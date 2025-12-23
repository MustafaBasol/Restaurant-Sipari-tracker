import React from 'react';
import MarketingLayout from '../components/MarketingLayout';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const PricingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <MarketingLayout>
      <div className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            {t('marketing.pricing.title')}
          </h1>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            {t('marketing.pricing.subtitle')}
          </p>

          <div className="mt-16 bg-card-bg p-8 sm:p-12 rounded-2xl shadow-subtle border border-border-color">
            <h2 className="text-2xl font-semibold text-text-primary">
              {t('marketing.pricing.planName')}
            </h2>
            <div className="mt-4 flex items-baseline justify-center gap-x-2">
              <span className="text-5xl font-bold tracking-tight text-text-primary">
                {t('marketing.pricing.price')}
              </span>
              <span className="text-base font-semibold text-text-secondary">
                {t('marketing.pricing.pricePer')}
              </span>
            </div>
            <ul
              role="list"
              className="mt-8 space-y-3 text-sm leading-6 text-text-secondary text-left sm:w-2/3 mx-auto"
            >
              <li className="flex gap-x-3">✓ {t('marketing.pricing.feature1')}</li>
              <li className="flex gap-x-3">✓ {t('marketing.pricing.feature2')}</li>
              <li className="flex gap-x-3">✓ {t('marketing.pricing.feature3')}</li>
              <li className="flex gap-x-3">✓ {t('marketing.pricing.feature4')}</li>
              <li className="flex gap-x-3">✓ {t('marketing.pricing.feature5')}</li>
            </ul>
            <div className="mt-10">
              <button
                onClick={() => (window.location.hash = '#/register')}
                className="w-full sm:w-auto inline-block bg-accent text-white font-semibold py-3 px-8 rounded-xl hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-200"
              >
                {t('marketing.cta.button')}
              </button>
            </div>
            <p className="mt-6 text-xs leading-5 text-text-secondary">
              {t('marketing.pricing.contactUs')}
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default PricingPage;
