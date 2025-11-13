import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Order, OrderItem, OrderStatus } from '../../types';

interface OrderListProps {
    orders: Order[];
}

const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.NEW]: 'bg-status-new',
    [OrderStatus.IN_PREPARATION]: 'bg-status-prep',
    [OrderStatus.READY]: 'bg-status-ready',
    [OrderStatus.SERVED]: 'bg-status-served',
    [OrderStatus.CANCELED]: 'bg-red-500',
};

const OrderItemCard: React.FC<{ item: OrderItem; orderId: string }> = ({ item, orderId }) => {
    const { menuItems, updateOrderItemStatus, t } = useAppContext();
    const menuItem = menuItems.find(mi => mi.id === item.menuItemId);

    const handleStatusChange = async (newStatus: OrderStatus) => {
        await updateOrderItemStatus(orderId, item.id, newStatus);
    };

    if (!menuItem) return null;

    return (
        <div className="bg-light-bg p-3 rounded-lg flex items-start justify-between gap-4">
            <div>
                <p className="font-semibold">{item.quantity}x {menuItem.name}</p>
                {item.note && <p className="text-xs text-text-secondary italic">"{item.note}"</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.status === OrderStatus.NEW && (
                    <button onClick={() => handleStatusChange(OrderStatus.IN_PREPARATION)} className="px-3 py-1 bg-status-prep text-white text-xs font-semibold rounded-full">{t('IN_PREPARATION')}</button>
                )}
                {item.status === OrderStatus.IN_PREPARATION && (
                    <button onClick={() => handleStatusChange(OrderStatus.READY)} className="px-3 py-1 bg-status-ready text-white text-xs font-semibold rounded-full">{t('READY')}</button>
                )}
                {item.status === OrderStatus.READY && (
                    <span className="px-3 py-1 bg-status-ready/20 text-status-ready text-xs font-semibold rounded-full">{t('READY')}</span>
                )}
            </div>
        </div>
    );
};

const OrderList: React.FC<OrderListProps> = ({ orders }) => {
    const { tables, t, markOrderAsReady } = useAppContext();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map(order => {
                const table = tables.find(t => t.id === order.tableId);
                const activeItems = order.items.filter(item => [OrderStatus.NEW, OrderStatus.IN_PREPARATION, OrderStatus.READY].includes(item.status));
                const canMarkAllReady = order.items.some(item => item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION);

                if (activeItems.length === 0) return null;

                return (
                    <div key={order.id} className="bg-white rounded-xl shadow-subtle flex flex-col">
                        <div className="p-4 border-b border-border-color">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{t('table')} {table?.name}</h3>
                                    <p className="text-xs text-text-secondary">{new Date(order.createdAt).toLocaleTimeString()}</p>
                                </div>
                                {canMarkAllReady && (
                                     <button 
                                        onClick={() => markOrderAsReady(order.id)}
                                        className="px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full hover:bg-accent-hover transition-colors"
                                    >
                                        {t('markAllReady')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4 space-y-3 flex-1">
                            {activeItems.map(item => (
                                <OrderItemCard key={item.id} item={item} orderId={order.id} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default OrderList;