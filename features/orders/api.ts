import { getDataByTenant, internalCreateOrder, internalUpdateOrderItemStatus, internalMarkOrderAsReady, internalServeOrder } from '../../shared/lib/mockApi';
import { Order, OrderItem } from './types';
import { OrderStatus } from '../../shared/types';

export const getOrders = (tenantId: string) => getDataByTenant<Order>('orders', tenantId);

export const createOrder = (tenantId: string, tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[]) => 
    internalCreateOrder(tenantId, tableId, items);

export const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) => 
    internalUpdateOrderItemStatus(orderId, itemId, status);

export const markOrderAsReady = (orderId: string) => internalMarkOrderAsReady(orderId);

export const serveOrder = (orderId: string) => internalServeOrder(orderId);
