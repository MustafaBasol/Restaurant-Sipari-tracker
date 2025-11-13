
import React, { useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Order, OrderStatus } from '../types';
import OrderList from '../components/kitchen/OrderList';

const KitchenDashboard: React.FC = () => {
    const { orders, t } = useAppContext();

    const activeOrders = useMemo(() => {
        return orders
            .filter(order => 
                order.items.some(item => 
                    [OrderStatus.NEW, OrderStatus.IN_PREPARATION, OrderStatus.READY].includes(item.status)
                )
            )
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [orders]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary">{t('kitchenDashboard')}</h1>
            <div className="bg-card-bg p-6 rounded-2xl shadow-subtle">
                <h2 className="text-xl font-semibold mb-4">{t('activeOrders')}</h2>
                {activeOrders.length > 0 ? (
                     <OrderList orders={activeOrders} />
                ) : (
                    <p className="text-text-secondary text-center py-10">No active orders.</p>
                )}
            </div>
        </div>
    );
};

export default KitchenDashboard;
