import React, { ReactNode } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import {
  MenuIcon,
  TableIcon,
  OrderIcon,
  BellIcon,
  ChartBarIcon,
  UsersIcon,
} from '../../../shared/components/icons/Icons';

interface Feature {
  titleKey: string;
  descriptionKey: string;
  icon: ReactNode;
}

const features: Feature[] = [
  {
    titleKey: 'marketing.features.items.menu.title',
    descriptionKey: 'marketing.features.items.menu.description',
    icon: <MenuIcon className="h-8 w-8" />,
  },
  {
    titleKey: 'marketing.features.items.tables.title',
    descriptionKey: 'marketing.features.items.tables.description',
    icon: <TableIcon className="h-8 w-8" />,
  },
  {
    titleKey: 'marketing.features.items.orders.title',
    descriptionKey: 'marketing.features.items.orders.description',
    icon: <OrderIcon className="h-8 w-8" />,
  },
  {
    titleKey: 'marketing.features.items.kitchen.title',
    descriptionKey: 'marketing.features.items.kitchen.description',
    icon: <BellIcon className="h-8 w-8" />,
  },
  {
    titleKey: 'marketing.features.items.reports.title',
    descriptionKey: 'marketing.features.items.reports.description',
    icon: <ChartBarIcon className="h-8 w-8" />,
  },
  {
    titleKey: 'marketing.features.items.roles.title',
    descriptionKey: 'marketing.features.items.roles.description',
    icon: <UsersIcon className="h-8 w-8" />,
  },
];

const FeaturesSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {t('marketing.features.title')}
          </h2>
          <p className="mt-4 text-lg leading-8 text-text-secondary">
            {t('marketing.features.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-18 lg:max-w-none">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.titleKey}
                className="rounded-2xl border border-border-color bg-card-bg p-6 shadow-subtle"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  {t(feature.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
