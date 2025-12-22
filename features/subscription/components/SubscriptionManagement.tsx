import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { SubscriptionStatus } from '../../../shared/types';
import { getTrialDaysLeft, isSubscriptionActive } from '../../../shared/lib/utils';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { createBillingPortalSession, listInvoices, StripeInvoiceSummary } from '../api';
import { formatCurrency } from '../../../shared/lib/utils';

const stripeBackendUrl = (import.meta as any).env?.VITE_STRIPE_BACKEND_URL as string | undefined;

const SubscriptionManagement: React.FC = () => {
  const { authState } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');

  const [invoices, setInvoices] = useState<StripeInvoiceSummary[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');

  const tenant = authState?.tenant;

  const subscriptionIsActive = tenant ? isSubscriptionActive(tenant) : false;
  const trialDaysLeft = tenant ? getTrialDaysLeft(tenant) : 0;
  const currency = (tenant?.currency || 'EUR').toLowerCase();

  const canLoadInvoices = useMemo(() => {
    return (
      tenant?.subscriptionStatus === SubscriptionStatus.ACTIVE &&
      !!stripeBackendUrl &&
      !!authState?.user?.email
    );
  }, [authState?.user?.email, tenant?.subscriptionStatus]);

  useEffect(() => {
    const run = async () => {
      if (!canLoadInvoices) return;
      setInvoicesLoading(true);
      setInvoicesError('');

      try {
        const { invoices } = await listInvoices({
          backendUrl: stripeBackendUrl as string,
          customerEmail: authState?.user?.email as string,
          limit: 10,
        });
        setInvoices(invoices);
      } catch (e) {
        console.error('Failed to load invoices', e);
        setInvoicesError(t('subscription.paymentHistoryLoadFailed'));
      } finally {
        setInvoicesLoading(false);
      }
    };

    run();
  }, [authState, canLoadInvoices, t]);

  if (!tenant) return null;

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

        {tenant.subscriptionStatus === SubscriptionStatus.ACTIVE && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-text-primary">
              {t('subscription.paymentHistoryTitle')}
            </h3>

            {!stripeBackendUrl && (
              <div className="text-sm text-text-secondary">
                {t('subscription.checkout.missingBackendUrl')}
              </div>
            )}

            {invoicesError && <div className="text-sm text-red-600">{invoicesError}</div>}

            {invoicesLoading ? (
              <div className="text-sm text-text-secondary">{t('general.loading')}</div>
            ) : invoices.length === 0 ? (
              <div className="text-sm text-text-secondary">
                {t('subscription.paymentHistoryEmpty')}
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const createdDate = new Date(inv.created * 1000);
                  const amountMajor = (inv.amount_paid || inv.amount_due || 0) / 100;
                  const amountText = formatCurrency(
                    amountMajor,
                    (inv.currency || currency).toUpperCase(),
                  );

                  return (
                    <div
                      key={inv.id}
                      className="bg-light-bg p-3 rounded-xl flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {inv.number || inv.id}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {createdDate.toLocaleDateString()} • {amountText}
                          {inv.status ? ` • ${inv.status}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {inv.hosted_invoice_url && (
                          <a
                            className="text-sm font-medium text-accent hover:text-accent-hover"
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('subscription.invoiceOpen')}
                          </a>
                        )}
                        {inv.invoice_pdf && (
                          <a
                            className="text-sm font-medium text-accent hover:text-accent-hover"
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('subscription.invoiceDownload')}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </Card>
  );
};

export default SubscriptionManagement;
