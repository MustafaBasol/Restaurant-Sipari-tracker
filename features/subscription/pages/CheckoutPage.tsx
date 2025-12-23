import React, { useMemo, useState, useEffect } from 'react';
import * as api from '../api';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { formatCurrency } from '../../../shared/lib/utils';
import {
  getServiceOriginAllowlist,
  isTrustedServiceBaseUrl,
  shouldAllowInsecureServices,
} from '../../../shared/lib/urlSecurity';

const stripeBackendUrl = (import.meta as any).env?.VITE_STRIPE_BACKEND_URL as string | undefined;

type CheckoutStatus = 'idle' | 'redirecting' | 'verifying' | 'activating' | 'error';

const parseCheckoutStatusFromHash = (hash: string): 'success' | 'cancel' | null => {
  if (!hash.startsWith('#/checkout')) return null;
  const idx = hash.indexOf('?');
  if (idx === -1) return null;
  const query = hash.slice(idx + 1);
  const params = new URLSearchParams(query);
  const v = params.get('status');
  if (v === 'success') return 'success';
  if (v === 'cancel') return 'cancel';
  return null;
};

const CheckoutPage: React.FC = () => {
  const { t } = useLanguage();
  const { authState, updateTenantInState } = useAuth();
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [message, setMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState('');

  const currency = authState?.tenant?.currency || 'EUR';
  const stripeBackendUrlIsValid = (() => {
    if (!stripeBackendUrl) return false;
    const requireHttps = Boolean((import.meta as any).env?.PROD) && !shouldAllowInsecureServices();
    return isTrustedServiceBaseUrl(stripeBackendUrl, {
      allowedOrigins: getServiceOriginAllowlist(),
      requireHttps,
    });
  })();
  const monthlyPriceAmount = useMemo(() => {
    // Demo-friendly: keep the same price as earlier PaymentIntent flow.
    return 9.9;
  }, []);

  useEffect(() => {
    const returnedStatus = parseCheckoutStatusFromHash(window.location.hash);
    if (!returnedStatus) return;
    if (returnedStatus === 'cancel') {
      setStatus('idle');
      setMessage(t('subscription.checkout.canceled'));
      return;
    }

    const activateAfterSuccess = async () => {
      if (!authState?.tenant?.id) {
        setStatus('error');
        setMessage(t('subscription.checkout.authError'));
        return;
      }

      setStatus('verifying');
      setMessage(t('subscription.checkout.verifying'));

      try {
        // Demo activation: in a real app, a webhook updates the DB.
        const updatedTenant = await api.confirmPaymentSuccess(authState.tenant.id);

        setStatus('activating');
        setMessage(t('subscription.checkout.activating'));
        updateTenantInState(updatedTenant);
        setTimeout(() => {
          window.location.hash = '#/app';
        }, 800);
      } catch (error) {
        console.error('Failed to activate subscription after checkout', error);
        setStatus('error');
        setMessage(t('subscription.checkout.activateFailed'));
      }
    };

    activateAfterSuccess();
  }, [authState?.tenant?.id, t, updateTenantInState]);

  const renderStatusOverlay = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
      <p className="font-semibold text-text-primary">{message}</p>
    </div>
  );

  const handleStartCheckout = async () => {
    setFormError('');
    if (!termsAccepted) {
      setFormError(t('subscription.checkout.mustAcceptTerms'));
      return;
    }
    if (!stripeBackendUrl) {
      setStatus('error');
      setMessage(t('subscription.checkout.missingBackendUrl'));
      return;
    }
    if (!stripeBackendUrlIsValid) {
      setStatus('error');
      setMessage(t('subscription.checkout.invalidBackendUrl'));
      return;
    }
    if (!authState?.tenant?.id) {
      setStatus('error');
      setMessage(t('subscription.checkout.authError'));
      return;
    }

    setStatus('redirecting');
    setMessage(t('subscription.checkout.redirecting'));

    try {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const successUrl = `${baseUrl}#/checkout?status=success`;
      const cancelUrl = `${baseUrl}#/checkout?status=cancel`;

      const { url } = await api.createSubscriptionCheckoutSession({
        backendUrl: stripeBackendUrl,
        tenantId: authState.tenant.id,
        customerEmail: authState.user.email,
        successUrl,
        cancelUrl,
      });

      if (!url) throw new Error('Missing checkout URL');
      window.location.href = url;
      return;
    } catch (e) {
      console.error('Failed to start checkout', e);
      setStatus('error');
      setMessage(t('subscription.checkout.startFailed'));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            {t('branding.name')}
          </h1>
          <h2 className="text-2xl mt-4 font-semibold text-text-primary">
            {t('subscription.checkout.title')}
          </h2>
          <p className="text-text-secondary mt-2">{t('subscription.checkout.subtitle')}</p>
        </div>
        <Card className="relative">
          {status !== 'idle' && status !== 'error' && renderStatusOverlay()}

          {status === 'error' && (
            <div className="p-4">
              <h3 className="text-lg font-semibold text-text-primary">
                {t('general.error', 'Hata')}
              </h3>
              <p className="mt-2 text-text-secondary">
                {message || t('general.tryAgain', 'Lütfen tekrar deneyin.')}
              </p>
              {!stripeBackendUrl && (
                <div className="mt-4 text-sm text-text-secondary">
                  <p className="font-medium text-text-primary">Gerekli ortam değişkeni:</p>
                  <p className="mt-1">VITE_STRIPE_BACKEND_URL</p>
                </div>
              )}
            </div>
          )}

          {status !== 'error' && (
            <div className="p-4 space-y-4">
              {message && <div className="text-sm text-text-secondary">{message}</div>}

              <div className="bg-light-bg p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-text-secondary">
                    {t('subscription.checkout.planLabel')}
                  </div>
                  <div className="text-sm font-semibold text-text-primary">
                    {formatCurrency(monthlyPriceAmount, currency)} / {t('subscription.perMonth')}
                  </div>
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  {t('subscription.checkout.cancellationNote')}
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  {t('subscription.checkout.termsPrefix')}{' '}
                  <button
                    type="button"
                    className="text-accent hover:text-accent-hover font-medium"
                    onClick={() => (window.location.hash = '#/subscription-terms')}
                  >
                    {t('subscription.checkout.termsLink')}
                  </button>
                  .
                </span>
              </label>

              {formError && <div className="text-sm text-red-600">{formError}</div>}

              <Button onClick={handleStartCheckout} className="w-full" disabled={status !== 'idle'}>
                {t('subscription.checkout.startButton')}
              </Button>
            </div>
          )}
        </Card>
        <div className="mt-4 text-center">
          <button
            onClick={() => window.history.back()}
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            {t('general.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
