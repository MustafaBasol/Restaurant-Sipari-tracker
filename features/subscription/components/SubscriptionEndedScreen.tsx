
import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import MarketingFooter from '../../marketing/components/MarketingFooter';

const SubscriptionEndedScreen: React.FC = () => {
    const { t } = useLanguage();
    const { logout } = useAuth();

    const handleActivate = () => {
        window.location.hash = '#/checkout';
    };

    return (
        <div className="flex flex-col min-h-screen bg-light-bg">
            <div className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <h1 className="text-4xl font-bold text-text-primary tracking-tight">{t('branding.name')}</h1>
                    <Card className="mt-8">
                        <h2 className="text-xl font-bold">{t('subscription.trialEnded')}</h2>
                        <p className="mt-4 text-text-secondary">{t('subscription.activateNeeded')}</p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                            <Button onClick={handleActivate} className="w-full sm:w-auto">
                                {t('subscription.activateButton')}
                            </Button>
                            <Button onClick={logout} variant="secondary" className="w-full sm:w-auto">
                                {t('header.logout')}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
            <MarketingFooter />
        </div>
    );
};

export default SubscriptionEndedScreen;
