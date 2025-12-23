import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { CheckIcon } from '../../../shared/components/icons/Icons';
import { Badge } from '../../../shared/components/ui/Badge';

const PricingSection: React.FC = () => {
  const { t } = useLanguage();

  const features = [
    'marketing.pricing.bullets.unlimitedUsers',
    'marketing.pricing.bullets.unlimitedTables',
    'marketing.pricing.bullets.realtimeScreens',
    'marketing.pricing.bullets.dailyReports',
    'marketing.pricing.bullets.multilingualInterface',
  ];

  const renderPrice = () => {
    const priceText = t('marketing.pricing.price');
    // Handle special case for Turkish "Aylık 9,90 €"
    if (priceText.startsWith('Aylık')) {
      return (
        <>
          <span className="text-base font-semibold leading-7 text-text-secondary mr-2">Aylık</span>
          <span className="text-5xl font-bold tracking-tight text-text-primary">
            {priceText.replace('Aylık', '').trim()}
          </span>
        </>
      );
    }
    // Handle "9.90 € / month" format
    const parts = priceText.split('/');
    return (
      <>
        <span className="text-5xl font-bold tracking-tight text-text-primary">
          {parts[0].trim()}
        </span>
        {parts[1] && (
          <span className="text-base font-semibold leading-7 text-text-secondary">
            /{parts[1].trim()}
          </span>
        )}
      </>
    );
  };

  return (
    <div id="pricing" className="bg-card-bg py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {t('marketing.pricing.title')}
          </h2>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            {t('marketing.pricing.subtitle')}
          </p>
        </div>

        <div className="isolate mx-auto mt-16 flex justify-center">
          <div className="rounded-2xl bg-white p-8 shadow-subtle ring-1 ring-border-color w-full max-w-md">
            <h3 className="text-2xl font-semibold leading-8 text-text-primary">
              {t('marketing.pricing.planName')}
            </h3>
            <div className="mt-4 flex items-center justify-center">
              <Badge variant="blue">{t('marketing.pricing.trialBadge')}</Badge>
            </div>
            <div className="mt-6 flex items-baseline justify-center gap-x-1">{renderPrice()}</div>
            <p className="mt-2 text-sm text-text-secondary">{t('marketing.pricing.trialNoCard')}</p>

            <ul role="list" className="mt-8 space-y-3 text-base leading-6 text-text-secondary">
              {features.map((featureKey) => (
                <li key={featureKey} className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-accent" />
                  {t(featureKey)}
                </li>
              ))}
            </ul>
            <button
              onClick={() => (window.location.hash = '#/register')}
              className="mt-10 block w-full rounded-xl bg-accent px-3 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t('marketing.pricing.cta')}
            </button>
            <p className="mt-6 text-xs leading-5 text-text-secondary">
              {t('marketing.pricing.note')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
