import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Order, OrderItem } from '../types';
import { OrderStatus } from '../../../shared/types';

interface OrderContextData {
    orders: Order[] | null;
    isLoading: boolean;
    createOrder: (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string) => Promise<void>;
    updateOrderItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
    markOrderAsReady: (orderId: string) => Promise<void>;
    serveOrder: (orderId: string) => Promise<void>;
    updateOrderNote: (orderId: string, note: string) => Promise<void>;
    refetch: () => void;
}

export const OrderContext = createContext<OrderContextData | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { authState } = useAuth();
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
    
    const handleMutation = async (mutationFn: () => Promise<any>) => {
        await mutationFn();
        await fetchOrders();
    };

    const createOrder = (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string) => 
        handleMutation(() => api.createOrder(authState!.tenant!.id, tableId, items, waiterId));

    const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) => 
        handleMutation(() => api.updateOrderItemStatus(orderId, itemId, status));
        
    const markOrderAsReady = (orderId: string) => 
        handleMutation(() => api.markOrderAsReady(orderId));

    const serveOrder = (orderId: string) => 
        handleMutation(() => api.serveOrder(orderId));

    const updateOrderNote = (orderId: string, note: string) =>
        handleMutation(() => api.updateOrderNote(orderId, note));

    return (
        <OrderContext.Provider value={{ orders, isLoading, createOrder, updateOrderItemStatus, markOrderAsReady, serveOrder, updateOrderNote, refetch: fetchOrders }}>
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