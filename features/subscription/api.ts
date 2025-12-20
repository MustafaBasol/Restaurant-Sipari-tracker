import {
  simulateWebhookPaymentSucceeded,
  createPaymentIntent as internalCreatePaymentIntent,
} from '../../shared/lib/mockApi';
import { Tenant } from '../../shared/types';

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
