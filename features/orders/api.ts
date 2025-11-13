import { getDataByTenant, internalCreateOrder, internalUpdateOrderItemStatus, internalMarkOrderAsReady, internalServeOrder, internalUpdateOrderNote } from '../../shared/lib/mockApi';
import { Order, OrderItem } from './types';
import { OrderStatus } from '../../shared/types';

export const getOrders = (tenantId: string) => getDataByTenant<Order>('orders', tenantId);

export const createOrder = (tenantId: string, tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string) => 
    internalCreateOrder(tenantId, tableId, items, waiterId);

export const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) => 
    internalUpdateOrderItemStatus(orderId, itemId, status);

export const markOrderAsReady = (orderId: string) => internalMarkOrderAsReady(orderId);

export const serveOrder = (orderId: string) => internalServeOrder(orderId);

export const updateOrderNote = (orderId: string, note: string) => internalUpdateOrderNote(orderId, note);