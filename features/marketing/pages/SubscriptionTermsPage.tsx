import React from 'react';
import MarketingLayout from '../components/MarketingLayout';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const LegalSection: React.FC<{ titleKey: string; contentKey: string }> = ({
  titleKey,
  contentKey,
}) => {
  const { t } = useLanguage();
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-text-primary mb-2">{t(titleKey)}</h2>
      <p className="text-text-secondary leading-relaxed whitespace-pre-line">{t(contentKey)}</p>
    </div>
  );
};

const SubscriptionTermsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <MarketingLayout>
      <div className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              {t('marketing.subscriptionTerms.title')}
            </h1>
            <p className="mt-4 text-sm text-text-secondary">
              {t('marketing.subscriptionTerms.lastUpdated')}
            </p>
          </div>

          <div className="bg-card-bg p-8 sm:p-12 rounded-2xl shadow-subtle border border-border-color">
            <LegalSection
              titleKey="marketing.subscriptionTerms.disclaimerTitle"
              contentKey="marketing.subscriptionTerms.disclaimerContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.trialTitle"
              contentKey="marketing.subscriptionTerms.trialContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.billingTitle"
              contentKey="marketing.subscriptionTerms.billingContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.cancellationTitle"
              contentKey="marketing.subscriptionTerms.cancellationContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.refundsTitle"
              contentKey="marketing.subscriptionTerms.refundsContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.taxesTitle"
              contentKey="marketing.subscriptionTerms.taxesContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.changesTitle"
              contentKey="marketing.subscriptionTerms.changesContent"
            />
            <LegalSection
              titleKey="marketing.subscriptionTerms.contactTitle"
              contentKey="marketing.subscriptionTerms.contactContent"
            />
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default SubscriptionTermsPage;
