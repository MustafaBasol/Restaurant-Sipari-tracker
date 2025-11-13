import { getDataByTenant, internalCreateOrder, internalUpdateOrderItemStatus, internalMarkOrderAsReady, internalServeOrderItem, internalCloseOrder, internalUpdateOrderNote } from '../../shared/lib/mockApi';
import { Order, OrderItem } from './types';
import { OrderStatus } from '../../shared/types';

export const getOrders = (tenantId: string) => getDataByTenant<Order>('orders', tenantId);

export const createOrder = (tenantId: string, tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string, note?: string) => 
    internalCreateOrder(tenantId, tableId, items, waiterId, note);

export const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) => 
    internalUpdateOrderItemStatus(orderId, itemId, status);

export const markOrderAsReady = (orderId: string) => internalMarkOrderAsReady(orderId);

export const serveOrderItem = (orderId: string, itemId: string) => internalServeOrderItem(orderId, itemId);

export const closeOrder = (orderId: string) => internalCloseOrder(orderId);

export const updateOrderNote = (orderId: string, note: string) => internalUpdateOrderNote(orderId, note);