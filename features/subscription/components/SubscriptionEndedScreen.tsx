import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';

const SubscriptionEndedScreen: React.FC = () => {
    const { t } = useLanguage();
    const { logout } = useAuth();
    const { activateSubscription, isLoading } = useSubscription();

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
            <div className="w-full max-w-md text-center">
                <h1 className="text-4xl font-bold text-text-primary tracking-tight">{t('branding.name')}</h1>
                <Card className="mt-8">
                    <h2 className="text-xl font-bold">{t('subscription.trialEnded')}</h2>
                    <p className="mt-4 text-text-secondary">{t('subscription.activateNeeded')}</p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                        <Button onClick={activateSubscription} disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading ? '...' : t('subscription.activateButton')}
                        </Button>
                        <Button onClick={logout} variant="secondary" className="w-full sm:w-auto">
                            {t('header.logout')}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SubscriptionEndedScreen;
