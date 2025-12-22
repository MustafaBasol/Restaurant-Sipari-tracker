import React, { useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { SubscriptionStatus } from '../../../shared/types';
import { getTrialDaysLeft, isSubscriptionActive } from '../../../shared/lib/utils';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { createBillingPortalSession } from '../api';

const stripeBackendUrl = (import.meta as any).env?.VITE_STRIPE_BACKEND_URL as string | undefined;

const SubscriptionManagement: React.FC = () => {
  const { authState } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');

  const tenant = authState?.tenant;
  if (!tenant) return null;

  const subscriptionIsActive = isSubscriptionActive(tenant);
  const trialDaysLeft = getTrialDaysLeft(tenant);

  const handleActivate = () => {
    setError('');
    window.location.hash = '#/checkout';
  };

  const handleManageSubscription = async () => {
    setError('');
    if (!stripeBackendUrl) {
      setError(t('subscription.checkout.missingBackendUrl'));
      return;
    }
    if (!authState?.user?.email) {
      setError(t('subscription.checkout.authError'));
      return;
    }

    try {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const returnUrl = `${baseUrl}#/app`;
      const { url } = await createBillingPortalSession({
        backendUrl: stripeBackendUrl,
        customerEmail: authState.user.email,
        returnUrl,
      });
      window.location.href = url;
    } catch (e) {
      console.error('Failed to open billing portal', e);
      setError(t('subscription.checkout.startFailed'));
    }
  };

  const renderStatus = () => {
    if (subscriptionIsActive) {
      if (tenant.subscriptionStatus === SubscriptionStatus.TRIAL) {
        return (
          <div>
            <Badge variant="yellow">{t('statuses.TRIAL')}</Badge>
            {/* FIX: Use .replace() for variable substitution in translations. */}
            <p className="mt-2 text-text-secondary">
              {t('subscription.daysLeft').replace('{days}', trialDaysLeft.toString())}
            </p>
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
          <p className="text-sm font-medium text-text-secondary mb-2">
            {t('subscription.currentPlan')}
          </p>
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg">{t('marketing.pricing.planName')}</p>
            {renderStatus()}
          </div>
        </div>

        <div className="text-sm text-text-secondary">
          {t('subscription.cancellationPeriodEndNotice')}{' '}
          <button
            type="button"
            className="text-accent hover:text-accent-hover font-medium"
            onClick={() => (window.location.hash = '#/subscription-terms')}
          >
            {t('subscription.viewTerms')}
          </button>
        </div>

        {(tenant.subscriptionStatus === SubscriptionStatus.TRIAL || !subscriptionIsActive) && (
          <div>
            <Button onClick={handleActivate} className="w-full">
              {t('subscription.upgradeButton')}
            </Button>
          </div>
        )}

        {subscriptionIsActive && tenant.subscriptionStatus === SubscriptionStatus.ACTIVE && (
          <div>
            <Button variant="secondary" onClick={handleManageSubscription} className="w-full">
              {t('subscription.manageButton')}
            </Button>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </Card>
  );
};

export default SubscriptionManagement;
