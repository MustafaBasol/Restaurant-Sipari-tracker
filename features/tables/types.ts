import { TableStatus } from '../../shared/types';

export interface Table {
  id: string;
  tenantId: string;
  name: string;
  status: TableStatus;
  customerName?: string;
  note?: string;
}
export { TableStatus };
