import { getDataByTenant, updateData } from '../../shared/lib/mockApi';
import { AuditLog, Tenant } from '../../shared/types';
import { apiFetch, getApiBaseUrl, getStoredSessionId, isRealApiEnabled } from '../../shared/lib/runtimeApi';

export const updateTenantSettings = async (tenant: Tenant): Promise<Tenant> => {
  if (isRealApiEnabled()) {
    return apiFetch<Tenant>('/tenant', {
      method: 'PUT',
      body: JSON.stringify(tenant),
    });
  }

  // Mock-mode
  return updateData('tenants', tenant);
};

export const uploadOrderNotificationSound = async (file: File): Promise<Tenant> => {
  if (isRealApiEnabled()) {
    const base = getApiBaseUrl();
    if (!base) throw new Error('API is not configured');
    const sessionId = getStoredSessionId();
    if (!sessionId) throw new Error('UNAUTHENTICATED');

    const url = base.startsWith('/')
      ? `${base}/tenant/order-notification-sound`
      : `${base}/tenant/order-notification-sound`;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-session-id': sessionId,
        'content-type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!resp.ok) {
      const contentType = resp.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const json = (await resp.json().catch(() => null)) as any;
        const code = typeof json?.error === 'string' ? json.error : `HTTP_${resp.status}`;
        throw new Error(code);
      }
      throw new Error(`HTTP_${resp.status}`);
    }

    return (await resp.json()) as Tenant;
  }

  // Mock-mode: just record preset; binary storage is not simulated.
  return updateData('tenants', {
    orderNotificationSoundPreset: 'CUSTOM',
    orderNotificationSoundMime: file.type || 'audio/*',
  } as any);
};

export const getAuditLogs = async (tenantId: string): Promise<AuditLog[]> => {
  if (isRealApiEnabled()) {
    return apiFetch<AuditLog[]>('/audit-logs', { method: 'GET' });
  }
  return getDataByTenant<AuditLog>('auditLogs', tenantId);
};
