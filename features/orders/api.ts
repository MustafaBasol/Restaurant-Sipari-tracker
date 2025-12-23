import {
  getDataByTenant,
  internalCreateOrder,
  internalUpdateOrderItemStatus,
  internalMarkOrderAsReady,
  internalServeOrderItem,
  internalCloseOrder,
  internalUpdateOrderNote,
  internalAddOrderPayment,
  internalRequestOrderBill,
  internalConfirmOrderPayment,
  internalSetOrderDiscount,
  internalSetOrderItemComplimentary,
  internalMoveOrderToTable,
  internalMergeOrderWithTable,
  internalUnmergeOrderFromTable,
} from '../../shared/lib/mockApi';
import { Order, OrderItem } from './types';
import {
  DiscountType,
  KitchenStation,
  OrderStatus,
  PaymentMethod,
  UserRole,
} from '../../shared/types';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

type Actor = { userId: string; role: UserRole };

export const getOrders = (tenantId: string) => {
  if (!isRealApiEnabled()) return getDataByTenant<Order>('orders', tenantId);
  return apiFetch<Order[]>('/orders', { method: 'GET' });
};

export const createOrder = (
  tenantId: string,
  tableId: string,
  items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>[],
  waiterId: string,
  note?: string,
) => {
  if (!isRealApiEnabled()) return internalCreateOrder(tenantId, tableId, items, waiterId, note);
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify({ tableId, items, note }),
  });
};

export const updateOrderItemStatus = (
  orderId: string,
  itemId: string,
  status: OrderStatus,
  actor?: Actor,
) => {
  if (!isRealApiEnabled()) return internalUpdateOrderItemStatus(orderId, itemId, status, actor);
  return apiFetch<Order>(
    `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
};

export const markOrderAsReady = (orderId: string, station?: KitchenStation, actor?: Actor) => {
  if (!isRealApiEnabled()) return internalMarkOrderAsReady(orderId, station, actor);
  return apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/mark-ready`, {
    method: 'POST',
    body: JSON.stringify({ station }),
  });
};

export const serveOrderItem = (orderId: string, itemId: string, actor?: Actor) => {
  if (!isRealApiEnabled()) return internalServeOrderItem(orderId, itemId, actor);
  return apiFetch<Order>(
    `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/serve`,
    { method: 'POST' },
  );
};

export const closeOrder = (orderId: string, actor: Actor) => {
  if (!isRealApiEnabled()) return internalCloseOrder(orderId, actor);
  return apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/close`, { method: 'POST' });
};

export const updateOrderNote = (orderId: string, note: string, actor?: Actor) =>
  isRealApiEnabled()
    ? apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/note`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      })
    : internalUpdateOrderNote(orderId, note, actor);

export const addOrderPayment = (
  orderId: string,
  method: PaymentMethod,
  amount: number,
  actor: Actor,
) => {
  if (!isRealApiEnabled()) return internalAddOrderPayment(orderId, method, amount, actor);
  return apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/payments`, {
    method: 'POST',
    body: JSON.stringify({ method, amount }),
  });
};

export const requestOrderBill = (orderId: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/request-bill`, { method: 'POST' })
    : internalRequestOrderBill(orderId, actor);

export const confirmOrderPayment = (orderId: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/confirm-payment`, { method: 'POST' })
    : internalConfirmOrderPayment(orderId, actor);

export const setOrderDiscount = (
  orderId: string,
  discountType: DiscountType,
  value: number,
  actor: Actor,
) => {
  if (!isRealApiEnabled()) return internalSetOrderDiscount(orderId, discountType, value, actor);
  return apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/discount`, {
    method: 'POST',
    body: JSON.stringify({ type: discountType, value }),
  });
};

export const setOrderItemComplimentary = (
  orderId: string,
  itemId: string,
  isComplimentary: boolean,
  actor: Actor,
) => {
  if (!isRealApiEnabled())
    return internalSetOrderItemComplimentary(orderId, itemId, isComplimentary, actor);
  return apiFetch<Order>(
    `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/complimentary`,
    {
      method: 'POST',
      body: JSON.stringify({ isComplimentary }),
    },
  );
};

export const moveOrderToTable = (orderId: string, toTableId: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/move-table`, {
        method: 'POST',
        body: JSON.stringify({ toTableId }),
      })
    : internalMoveOrderToTable(orderId, toTableId, actor);

export const mergeOrderWithTable = (orderId: string, secondaryTableId: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/merge-table`, {
        method: 'POST',
        body: JSON.stringify({ secondaryTableId }),
      })
    : internalMergeOrderWithTable(orderId, secondaryTableId, actor);

export const unmergeOrderFromTable = (orderId: string, tableIdToDetach: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/unmerge-table`, {
        method: 'POST',
        body: JSON.stringify({ tableIdToDetach }),
      })
    : internalUnmergeOrderFromTable(orderId, tableIdToDetach, actor);
