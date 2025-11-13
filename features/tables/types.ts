import { TableStatus } from '../../shared/types';

export interface Table {
    id: string;
    tenantId: string;
    name: string;
    status: TableStatus;
}
export { TableStatus };
