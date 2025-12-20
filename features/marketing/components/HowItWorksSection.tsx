import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const HowItWorksSection: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
    {
      nameKey: 'marketing.howItWorks.step1.title',
      descriptionKey: 'marketing.howItWorks.step1.description',
    },
    {
      nameKey: 'marketing.howItWorks.step2.title',
      descriptionKey: 'marketing.howItWorks.step2.description',
    },
    {
      nameKey: 'marketing.howItWorks.step3.title',
      descriptionKey: 'marketing.howItWorks.step3.description',
    },
  ];

  return (
    <div className="py-24 sm:py-32" id="how-it-works">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {t('marketing.howItWorks.title')}
          </h2>
        </div>
        <div className="mx-auto mt-16 flow-root sm:mt-20">
          <div className="-m-4 flex flex-wrap justify-between">
            {steps.map((step, index) => (
              <div key={index} className="w-full lg:w-1/3 p-4">
                <div className="flex">
                  <div className="mr-4 flex-shrink-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent text-accent font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{t(step.nameKey)}</h3>
                    <p className="mt-2 text-base text-text-secondary">{t(step.descriptionKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksSection;
