import React, { ReactNode } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { DeviceTabletIcon, BoltIcon, PresentationChartLineIcon, GlobeAltIcon } from '../../../shared/components/icons/Icons';

interface Benefit {
    nameKey: string;
    descriptionKey: string;
    icon: ReactNode;
}

const benefits: Benefit[] = [
    {
        nameKey: 'marketing.benefits.card1.title',
        descriptionKey: 'marketing.benefits.card1.description',
        icon: <DeviceTabletIcon />,
    },
    {
        nameKey: 'marketing.benefits.card2.title',
        descriptionKey: 'marketing.benefits.card2.description',
        icon: <BoltIcon />,
    },
    {
        nameKey: 'marketing.benefits.card3.title',
        descriptionKey: 'marketing.benefits.card3.description',
        icon: <PresentationChartLineIcon />,
    },
    {
        nameKey: 'marketing.benefits.card4.title',
        descriptionKey: 'marketing.benefits.card4.description',
        icon: <GlobeAltIcon />,
    },
];

const BenefitsSection: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="bg-card-bg py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                        {t('marketing.benefits.title')}
                    </h2>
                </div>
                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                        {benefits.map((benefit) => (
                            <div key={t(benefit.nameKey)} className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-text-primary">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                                       {benefit.icon}
                                    </div>
                                    {t(benefit.nameKey)}
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-text-secondary">
                                    <p className="flex-auto">{t(benefit.descriptionKey)}</p>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default BenefitsSection;