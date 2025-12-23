// FIX: Removed import for non-existent 'internalCloseTable'
import {
  getDataByTenant,
  addData,
  updateData,
  internalUpdateTableStatus,
} from '../../shared/lib/mockApi';
import { Table, TableStatus } from './types';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

export const getTables = (tenantId: string) => {
  if (!isRealApiEnabled()) return getDataByTenant<Table>('tables', tenantId);
  return apiFetch<Table[]>('/tables', { method: 'GET' });
};

export const addTable = (tenantId: string, name: string) => {
  if (isRealApiEnabled()) {
    return apiFetch<Table>('/tables', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
  const newTable: Table = {
    id: `tbl${Date.now()}`,
    tenantId,
    name,
    status: TableStatus.FREE,
  };
  return addData('tables', newTable);
};

export const updateTable = (table: Table) => {
  if (!isRealApiEnabled()) return updateData('tables', table);
  return apiFetch<Table>(`/tables/${encodeURIComponent(table.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: table.name, note: (table as any).note ?? undefined }),
  });
};

export const updateTableStatus = (tableId: string, status: TableStatus) => {
  if (!isRealApiEnabled()) return internalUpdateTableStatus(tableId, status);
  return apiFetch<Table>(`/tables/${encodeURIComponent(tableId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

// FIX: Removed unused `closeTable` function.
