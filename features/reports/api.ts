import { internalGetSummaryReport } from '../../shared/lib/mockApi';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';
import { SummaryReport } from './types';

export const getSummaryReport = (tenantId: string, startDate: string, endDate: string) =>
  isRealApiEnabled()
    ? apiFetch<SummaryReport>(
        `/reports/summary?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { method: 'GET' },
      )
    : internalGetSummaryReport(tenantId, startDate, endDate);
