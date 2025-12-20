import {
  getDataByTenant,
  internalCreateOrder,
  internalUpdateOrderItemStatus,
  internalMarkOrderAsReady,
  internalServeOrderItem,
  internalCloseOrder,
  internalUpdateOrderNote,
  internalAddOrderPayment,
  internalSetOrderDiscount,
  internalSetOrderItemComplimentary,
} from '../../shared/lib/mockApi';
import { Order, OrderItem } from './types';
import { DiscountType, OrderStatus, PaymentMethod, UserRole } from '../../shared/types';

type Actor = { userId: string; role: UserRole };

export const getOrders = (tenantId: string) => getDataByTenant<Order>('orders', tenantId);

export const createOrder = (
  tenantId: string,
  tableId: string,
  items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[],
  waiterId: string,
  note?: string,
) => internalCreateOrder(tenantId, tableId, items, waiterId, note);

export const updateOrderItemStatus = (
  orderId: string,
  itemId: string,
  status: OrderStatus,
  actor?: Actor,
) => internalUpdateOrderItemStatus(orderId, itemId, status, actor);

export const markOrderAsReady = (orderId: string) => internalMarkOrderAsReady(orderId);

export const serveOrderItem = (orderId: string, itemId: string, actor?: Actor) =>
  internalServeOrderItem(orderId, itemId, actor);

export const closeOrder = (orderId: string, actor: Actor) => internalCloseOrder(orderId, actor);

export const updateOrderNote = (orderId: string, note: string, actor?: Actor) =>
  internalUpdateOrderNote(orderId, note, actor);

export const addOrderPayment = (orderId: string, method: PaymentMethod, amount: number, actor: Actor) =>
  internalAddOrderPayment(orderId, method, amount, actor);

export const setOrderDiscount = (orderId: string, discountType: DiscountType, value: number, actor: Actor) =>
  internalSetOrderDiscount(orderId, discountType, value, actor);

export const setOrderItemComplimentary = (
  orderId: string,
  itemId: string,
  isComplimentary: boolean,
  actor: Actor,
) => internalSetOrderItemComplimentary(orderId, itemId, isComplimentary, actor);
