import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const FaqSection: React.FC = () => {
  const { t } = useLanguage();

  const items = [
    { q: 'marketing.faq.q1.q', a: 'marketing.faq.q1.a' },
    { q: 'marketing.faq.q2.q', a: 'marketing.faq.q2.a' },
    { q: 'marketing.faq.q3.q', a: 'marketing.faq.q3.a' },
    { q: 'marketing.faq.q4.q', a: 'marketing.faq.q4.a' },
  ];

  return (
    <section className="bg-card-bg py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {t('marketing.faq.title')}
          </h2>
          <p className="mt-4 text-lg leading-8 text-text-secondary">
            {t('marketing.faq.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="space-y-6">
            {items.map((item) => (
              <div key={item.q} className="rounded-2xl border border-border-color bg-light-bg p-6">
                <h3 className="text-base font-semibold text-text-primary">{t(item.q)}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{t(item.a)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
