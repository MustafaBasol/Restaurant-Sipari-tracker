import {
  simulateWebhookPaymentSucceeded,
  createPaymentIntent as internalCreatePaymentIntent,
} from '../../shared/lib/mockApi';
import { Tenant } from '../../shared/types';
import {
  assertTrustedServiceBaseUrl,
  getServiceOriginAllowlist,
  shouldAllowInsecureServices,
} from '../../shared/lib/urlSecurity';

const getStripeBackendBaseUrl = (backendUrl: string): string => {
  const requireHttps = Boolean((import.meta as any).env?.PROD) && !shouldAllowInsecureServices();
  return assertTrustedServiceBaseUrl(backendUrl, {
    allowedOrigins: getServiceOriginAllowlist(),
    requireHttps,
  });
};

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

export type StripeInvoiceSummary = {
  id: string;
  number?: string | null;
  status?: string | null;
  created: number;
  currency: string;
  amount_paid: number;
  amount_due: number;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
};

export type StripeSubscriptionStatusSummary = {
  id: string;
  created?: number | null;
  start_date?: number | null;
  status: string;
  cancel_at_period_end: boolean;
  cancel_at?: number | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  canceled_at?: number | null;
  ended_at?: number | null;
};

export type GetSubscriptionStatusParams = {
  backendUrl: string;
  customerEmail: string;
};

export type ListInvoicesParams = {
  backendUrl: string;
  customerEmail: string;
  limit?: number;
};

export type SyncAfterCheckoutParams = {
  backendUrl: string;
  sessionId: string;
};

export const createBillingPortalSession = async (
  params: CreateBillingPortalSessionParams,
): Promise<{ url: string }> => {
  const baseUrl = getStripeBackendBaseUrl(params.backendUrl);
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/create-portal-session`, {
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
  const baseUrl = getStripeBackendBaseUrl(params.backendUrl);
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/create-checkout-session`, {
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

export const syncAfterCheckout = async (params: SyncAfterCheckoutParams): Promise<{ ok: true }> => {
  const baseUrl = getStripeBackendBaseUrl(params.backendUrl);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/sync-after-checkout`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: params.sessionId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to sync after checkout (${res.status}): ${text}`);
  }

  return { ok: true };
};

export const listInvoices = async (
  params: ListInvoicesParams,
): Promise<{ invoices: StripeInvoiceSummary[] }> => {
  const baseUrl = getStripeBackendBaseUrl(params.backendUrl);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/list-invoices`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: params.customerEmail,
      limit: params.limit,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404) {
      throw new Error(`ENDPOINT_NOT_FOUND:list-invoices:${text}`);
    }
    throw new Error(`Failed to list invoices (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  return { invoices: (data?.invoices || []) as StripeInvoiceSummary[] };
};

export const getSubscriptionStatus = async (
  params: GetSubscriptionStatusParams,
): Promise<{ subscription: StripeSubscriptionStatusSummary | null }> => {
  const baseUrl = getStripeBackendBaseUrl(params.backendUrl);
  const endpoint = `${baseUrl.replace(/\/$/, '')}/get-subscription-status`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: params.customerEmail,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404) {
      throw new Error(`ENDPOINT_NOT_FOUND:get-subscription-status:${text}`);
    }
    throw new Error(`Failed to get subscription status (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  return { subscription: (data?.subscription || null) as StripeSubscriptionStatusSummary | null };
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
