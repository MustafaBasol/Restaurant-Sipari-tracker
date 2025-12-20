// FIX: Removed import for non-existent 'internalCloseTable'
import {
  getDataByTenant,
  addData,
  updateData,
  internalUpdateTableStatus,
} from '../../shared/lib/mockApi';
import { Table, TableStatus } from './types';

export const getTables = (tenantId: string) => getDataByTenant<Table>('tables', tenantId);

export const addTable = (tenantId: string, name: string) => {
  const newTable: Table = {
    id: `tbl${Date.now()}`,
    tenantId,
    name,
    status: TableStatus.FREE,
  };
  return addData('tables', newTable);
};

export const updateTable = (table: Table) => updateData('tables', table);

export const updateTableStatus = (tableId: string, status: TableStatus) => {
  return internalUpdateTableStatus(tableId, status);
};

// FIX: Removed unused `closeTable` function.
