import {
  simulateWebhookPaymentSucceeded,
  createPaymentIntent as internalCreatePaymentIntent,
} from '../../shared/lib/mockApi';
import { Tenant } from '../../shared/types';

export type CreateSubscriptionCheckoutSessionParams = {
  backendUrl: string;
  tenantId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateBillingPortalSessionParams = {
  backendUrl: string;
  customerEmail: string;
  returnUrl: string;
};

export const createBillingPortalSession = async (
  params: CreateBillingPortalSessionParams,
): Promise<{ url: string }> => {
  const res = await fetch(`${params.backendUrl.replace(/\/$/, '')}/create-portal-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: params.customerEmail,
      returnUrl: params.returnUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create portal session (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  if (!data?.url) throw new Error('Missing portal URL');
  return { url: data.url };
};

export const createSubscriptionCheckoutSession = async (
  params: CreateSubscriptionCheckoutSessionParams,
): Promise<{ url?: string; sessionId?: string }> => {
  const res = await fetch(`${params.backendUrl.replace(/\/$/, '')}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: params.tenantId,
      customerEmail: params.customerEmail,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create checkout session (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  return { url: data?.url, sessionId: data?.sessionId };
};

export const confirmPaymentSuccess = (tenantId: string): Promise<Tenant> => {
  // This simulates the frontend telling the backend "I'm done",
  // and then the backend does its own check/activation.
  // In a real app, you might not even have this call. You'd just wait
  // for the webhook to update the DB and then poll for the new status.
  // But for our simulation, this triggers the "webhook".
  return simulateWebhookPaymentSucceeded(tenantId);
};

export const createPaymentIntent = (): Promise<{ clientSecret: string }> => {
  // Price is 9.90 EUR, passed in cents.
  return internalCreatePaymentIntent(990, 'eur');
};
