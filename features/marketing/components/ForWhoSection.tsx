import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const ForWhoSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-card-bg py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {t('marketing.forWho.title')}
          </h2>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            {t('marketing.forWho.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForWhoSection;
