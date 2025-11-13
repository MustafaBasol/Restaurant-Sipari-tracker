import { internalGetDailySummary } from '../../shared/lib/mockApi';

export const getDailySummary = (tenantId: string, date: string) => 
    internalGetDailySummary(tenantId, date);