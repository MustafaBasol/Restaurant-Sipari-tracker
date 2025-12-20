import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Order, OrderItem } from '../types';
import { OrderStatus, TableStatus } from '../../../shared/types';
import { useTableContext } from '../../tables/context/TableContext';

interface OrderContextData {
    orders: Order[] | null;
    isLoading: boolean;
    createOrder: (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string, note?: string) => Promise<void>;
    updateOrderItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
    markOrderAsReady: (orderId: string) => Promise<void>;
    serveOrderItem: (orderId: string, itemId: string) => Promise<void>;
    closeOrder: (orderId: string) => Promise<void>;
    updateOrderNote: (orderId: string, note: string) => Promise<void>;
    refetch: () => Promise<void>;
}

export const OrderContext = createContext<OrderContextData | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { authState } = useAuth();
    const { setTableStatusInState } = useTableContext();
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        if (authState?.tenant?.id) {
            setIsLoading(true);
            try {
                const data = await api.getOrders(authState.tenant.id);
                setOrders(data);
            } catch (error) {
                console.error("Failed to fetch orders", error);
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
        setOrders(prev => {
            const current = prev ?? [];
            const index = current.findIndex(o => o.id === updatedOrder.id);
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

    const createOrder = (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string, note?: string) => 
        handleOrderMutation(async () => {
            const createdOrUpdated = await api.createOrder(authState!.tenant!.id, tableId, items, waiterId, note);
            setTableStatusInState(tableId, TableStatus.OCCUPIED);
            return createdOrUpdated;
        });

    const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) => 
        handleOrderMutation(() => api.updateOrderItemStatus(orderId, itemId, status));
        
    const markOrderAsReady = (orderId: string) => 
        handleOrderMutation(() => api.markOrderAsReady(orderId));

    const serveOrderItem = (orderId: string, itemId: string) => 
        handleOrderMutation(() => api.serveOrderItem(orderId, itemId));

    const closeOrder = (orderId: string) =>
        handleOrderMutation(async () => {
            const updated = await api.closeOrder(orderId);
            if (updated) {
                setTableStatusInState(updated.tableId, TableStatus.FREE);
            }
            return updated;
        });

    const updateOrderNote = (orderId: string, note: string) =>
        handleOrderMutation(() => api.updateOrderNote(orderId, note));

    return (
        <OrderContext.Provider value={{ orders, isLoading, createOrder, updateOrderItemStatus, markOrderAsReady, serveOrderItem, closeOrder, updateOrderNote, refetch: fetchOrders }}>
            {children}
        </OrderContext.Provider>
    )
};

export const useOrderContext = () => {
    const context = useContext(OrderContext);
    if (context === undefined) {
        throw new Error('useOrderContext must be used within an OrderProvider');
    }
    return context;
};