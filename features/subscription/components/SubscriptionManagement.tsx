import React from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionStatus } from '../../../shared/types';
import { getTrialDaysLeft, isSubscriptionActive } from '../../../shared/lib/utils';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';

const SubscriptionManagement: React.FC = () => {
    const { authState } = useAuth();
    const { t } = useLanguage();
    const { activateSubscription, isLoading, error } = useSubscription();

    const tenant = authState?.tenant;
    if (!tenant) return null;
    
    const subscriptionIsActive = isSubscriptionActive(tenant);
    const trialDaysLeft = getTrialDaysLeft(tenant);

    const renderStatus = () => {
        if (subscriptionIsActive) {
            if (tenant.subscriptionStatus === SubscriptionStatus.TRIAL) {
                return (
                    <div>
                        <Badge variant="yellow">{t('statuses.TRIAL')}</Badge>
                        {/* FIX: Use .replace() for variable substitution in translations. */}
                        <p className="mt-2 text-text-secondary">{t('subscription.daysLeft').replace('{days}', trialDaysLeft.toString())}</p>
                    </div>
                );
            }
            return (
                <div>
                     <Badge variant="green">{t('statuses.ACTIVE')}</Badge>
                     <p className="mt-2 text-text-secondary">{t('subscription.activeSubscription')}</p>
                </div>
            );
        } else {
             return (
                <div>
                    <Badge variant="red">{t('subscription.trialExpired')}</Badge>
                     <p className="mt-2 text-text-secondary">{t('subscription.activateNeeded')}</p>
                </div>
            );
        }
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-6">{t('subscription.status')}</h2>
            <div className="space-y-6 max-w-md">
                <div className="bg-light-bg p-4 rounded-xl">
                    <p className="text-sm font-medium text-text-secondary mb-2">{t('subscription.currentPlan')}</p>
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-lg">{t('marketing.pricing.planName')}</p>
                        {renderStatus()}
                    </div>
                </div>

                {!subscriptionIsActive && (
                    <div>
                        <Button onClick={activateSubscription} disabled={isLoading} className="w-full">
                             {isLoading ? '...' : t('subscription.activateButton')}
                        </Button>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default SubscriptionManagement;