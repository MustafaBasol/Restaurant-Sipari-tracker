import { getDataByTenant, updateData } from '../../shared/lib/mockApi';
import { AuditLog, Tenant } from '../../shared/types';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

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

export const getAuditLogs = async (tenantId: string): Promise<AuditLog[]> => {
  if (isRealApiEnabled()) {
    return apiFetch<AuditLog[]>('/audit-logs', { method: 'GET' });
  }
  return getDataByTenant<AuditLog>('auditLogs', tenantId);
};
