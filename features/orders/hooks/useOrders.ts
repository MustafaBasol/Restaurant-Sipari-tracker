import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Order, OrderItem } from '../types';
import { OrderStatus } from '../../../shared/types';

export const useOrders = () => {
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
        }
    }, [authState?.tenant?.id]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const handleMutation = async (mutationFn: () => Promise<any>) => {
        await mutationFn();
        await fetchOrders();
    };

    const createOrder = (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[]) => 
        handleMutation(() => api.createOrder(authState!.tenant!.id, tableId, items));

    const updateOrderItemStatus = (orderId: string, itemId: string, status: OrderStatus) => 
        handleMutation(() => api.updateOrderItemStatus(orderId, itemId, status));
        
    const markOrderAsReady = (orderId: string) => 
        handleMutation(() => api.markOrderAsReady(orderId));

    const serveOrder = (orderId: string) => 
        handleMutation(() => api.serveOrder(orderId));

    return { orders, isLoading, createOrder, updateOrderItemStatus, markOrderAsReady, serveOrder, refetch: fetchOrders };
};
