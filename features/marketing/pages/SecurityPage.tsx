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
      <p className="text-text-secondary leading-relaxed">{t(contentKey)}</p>
    </div>
  );
};

const SecurityPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <MarketingLayout>
      <div className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              {t('marketing.legal.securityTitle')}
            </h1>
            <p className="mt-4 text-sm text-text-secondary">{t('marketing.legal.lastUpdated')}</p>
          </div>

          <div className="bg-card-bg p-8 sm:p-12 rounded-2xl shadow-subtle border border-border-color">
            <LegalSection
              titleKey="marketing.legal.s1_title"
              contentKey="marketing.legal.s1_content"
            />
            <LegalSection
              titleKey="marketing.legal.s2_title"
              contentKey="marketing.legal.s2_content"
            />
            <LegalSection
              titleKey="marketing.legal.s3_title"
              contentKey="marketing.legal.s3_content"
            />
            <LegalSection
              titleKey="marketing.legal.s4_title"
              contentKey="marketing.legal.s4_content"
            />
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default SecurityPage;
