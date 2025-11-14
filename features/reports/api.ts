import { internalGetSummaryReport } from '../../shared/lib/mockApi';

export const getSummaryReport = (tenantId: string, startDate: string, endDate: string) => 
    internalGetSummaryReport(tenantId, startDate, endDate);