import { getDataByTenant, updateData } from '../../shared/lib/mockApi';
import { AuditLog, Tenant } from '../../shared/types';

// In a real app, this would hit an API endpoint like PUT /api/tenants/settings
export const updateTenantSettings = (tenant: Tenant) => {
  return updateData('tenants', tenant);
};

export const getAuditLogs = (tenantId: string) => {
  return getDataByTenant<AuditLog>('auditLogs', tenantId);
};
