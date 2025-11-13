import { OrderStatus } from '../../shared/types';

export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    note: string;
    status: OrderStatus;
}

export interface Order {
    id: string;
    tenantId: string;
    tableId: string;
    status: OrderStatus;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
    note?: string;
    waiterId?: string;
    waiterName?: string;
    orderClosedAt?: Date;
}