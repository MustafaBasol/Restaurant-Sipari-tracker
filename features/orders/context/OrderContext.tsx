import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useContext,
} from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Order, OrderItem } from '../types';
import {
  DiscountType,
  KitchenStation,
  OrderStatus,
  PaymentMethod,
  TableStatus,
  UserRole,
} from '../../../shared/types';
import { useTableContext } from '../../tables/context/TableContext';

interface OrderContextData {
  orders: Order[] | null;
  isLoading: boolean;
  createOrder: (
    tableId: string,
    items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>[],
    waiterId: string,
    note?: string,
  ) => Promise<void>;
  updateOrderItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
  markOrderAsReady: (orderId: string, station?: KitchenStation) => Promise<void>;
  serveOrderItem: (orderId: string, itemId: string) => Promise<void>;
  closeOrder: (orderId: string) => Promise<void>;
  updateOrderNote: (orderId: string, note: string) => Promise<void>;
  addOrderPayment: (orderId: string, method: PaymentMethod, amount: number) => Promise<void>;
  setOrderDiscount: (orderId: string, type: DiscountType, value: number) => Promise<void>;
  setOrderItemComplimentary: (orderId: string, itemId: string, isComplimentary: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export const OrderContext = createContext<OrderContextData | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const { setTableStatusInState } = useTableContext();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const actor = authState?.user?.id
    ? { userId: authState.user.id, role: authState.user.role as UserRole }
    : undefined;

  const fetchOrders = useCallback(async () => {
    if (authState?.tenant?.id) {
      setIsLoading(true);
      try {
        const data = await api.getOrders(authState.tenant.id);
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setIsLoading(false);
      }
    } else if (!authState) {
      setOrders([]);
      setIsLoading(false);
    }
  }, [authState]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const upsertOrderInState = (updatedOrder: Order) => {
    setOrders((prev) => {
      const current = prev ?? [];
      const index = current.findIndex((o) => o.id === updatedOrder.id);
      if (index === -1) return [...current, updatedOrder];
      const next = [...current];
      next[index] = updatedOrder;
      return next;
    });
  };

  const handleOrderMutation = async (mutationFn: () => Promise<Order | undefined>) => {
    const updated = await mutationFn();
    if (updated) {
      upsertOrderInState(updated);
      return;
    }
    // Fallback (should be rare): sync from source of truth.
    await fetchOrders();
  };

  const createOrder = (
    tableId: string,
    items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>[],
    waiterId: string,
    note?: string,
  ) =>
    handleOrderMutation(async () => {
      const createdOrUpdated = await api.createOrder(
        authState!.tenant!.id,
        tableId,
        items,
        waiterId,
        note,
      );
      setTableStatusInState(tableId, TableStatus.OCCUPIED);
      return createdOrUpdated;
    });

  const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) =>
    handleOrderMutation(() => api.updateOrderItemStatus(orderId, itemId, status, actor));

  const markOrderAsReady = (orderId: string, station?: KitchenStation) =>
    handleOrderMutation(() => api.markOrderAsReady(orderId, station));

  const serveOrderItem = (orderId: string, itemId: string) =>
    handleOrderMutation(() => api.serveOrderItem(orderId, itemId, actor));

  const closeOrder = (orderId: string) =>
    handleOrderMutation(async () => {
      if (!actor) return undefined;
      const updated = await api.closeOrder(orderId, actor);
      if (updated) {
        setTableStatusInState(updated.tableId, TableStatus.FREE);
      }
      return updated;
    });

  const updateOrderNote = (orderId: string, note: string) =>
    handleOrderMutation(() => api.updateOrderNote(orderId, note, actor));

  const addOrderPayment = (orderId: string, method: PaymentMethod, amount: number) => {
    if (!actor) return Promise.resolve();
    return handleOrderMutation(() => api.addOrderPayment(orderId, method, amount, actor));
  };

  const setOrderDiscount = (orderId: string, type: DiscountType, value: number) => {
    if (!actor) return Promise.resolve();
    return handleOrderMutation(() => api.setOrderDiscount(orderId, type, value, actor));
  };

  const setOrderItemComplimentary = (orderId: string, itemId: string, isComplimentary: boolean) => {
    if (!actor) return Promise.resolve();
    return handleOrderMutation(() => api.setOrderItemComplimentary(orderId, itemId, isComplimentary, actor));
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        isLoading,
        createOrder,
        updateOrderItemStatus,
        markOrderAsReady,
        serveOrderItem,
        closeOrder,
        updateOrderNote,
        addOrderPayment,
        setOrderDiscount,
        setOrderItemComplimentary,
        refetch: fetchOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
};
