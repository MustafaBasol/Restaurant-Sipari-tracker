import React, { useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useTables } from '../../tables/hooks/useTables';
import { useMenu } from '../../menu/hooks/useMenu';
import { useOrders } from '../../orders/hooks/useOrders';
import { Order, OrderItem } from '../../orders/types';
import { OrderStatus } from '../../../shared/types';
import { Modal } from '../../../shared/components/ui/Modal';
import { Badge } from '../../../shared/components/ui/Badge';
import KitchenItemStatusToggle from './KitchenItemStatusToggle';
import { formatDateTime } from '../../../shared/lib/utils';
import { useAuth } from '../../auth/hooks/useAuth';

interface KitchenOrderModalProps {
    order: Order;
    onClose: () => void;
}

const KitchenOrderModal: React.FC<KitchenOrderModalProps> = ({ order, onClose }) => {
    const { t } = useLanguage();
    const { authState } = useAuth();
    const { tables } = useTables();
    const { menuItems } = useMenu();
    const { updateOrderItemStatus } = useOrders();
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    
    const timezone = authState?.tenant?.timezone || 'UTC';
    const table = tables.find(t => t.id === order.tableId);
    
    const handleStatusChange = async (item: OrderItem, newStatus: OrderStatus) => {
        if (updatingItemId) return;
        setUpdatingItemId(item.id);
        try {
            await updateOrderItemStatus(order.id, item.id, newStatus);
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status. Please try again.");
        } finally {
            setUpdatingItemId(null);
        }
    };
    
    const statusBadgeVariant: Record<OrderStatus, 'blue' | 'orange' | 'green' | 'gray' | 'red'> = {
        [OrderStatus.NEW]: 'blue',
        [OrderStatus.IN_PREPARATION]: 'orange',
        [OrderStatus.READY]: 'green',
        [OrderStatus.SERVED]: 'gray',
        [OrderStatus.CANCELED]: 'red',
        [OrderStatus.CLOSED]: 'gray',
    }

    return (
        <Modal isOpen={!!order} onClose={onClose} title={t('kitchen.orderDetails')}>
            <div className="p-6">
                <div className="mb-4 bg-white p-4 rounded-xl shadow-subtle space-y-2">
                    <h3 className="text-2xl font-bold">{t('kitchen.table')} {table?.name}</h3>
                    <p className="text-sm text-text-secondary">
                        {formatDateTime(order.createdAt, timezone, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {order.waiterName && <p className="text-base font-semibold">{t('kitchen.orderBy')}: {order.waiterName}</p>}
                    {table?.customerName && <p className="text-lg font-bold">Customer: {table.customerName}</p>}
                    {table?.note && <p className="text-base font-medium text-text-primary">Masa Notu: "{table.note}"</p>}
                    {order.note && (
                        <div className="mt-2 bg-yellow-100 border border-yellow-300 p-3 rounded-lg">
                            <p className="text-base font-bold text-yellow-900">{t('kitchen.generalOrderNote')}:</p>
                            <p className="text-base text-yellow-800 font-medium">"{order.note}"</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {order.items.map(item => {
                        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                        if (!menuItem) return null;

                        const isLoading = updatingItemId === item.id;
                        const isFinalState = [OrderStatus.SERVED, OrderStatus.CANCELED, OrderStatus.CLOSED].includes(item.status);
                        const isToggleable = [OrderStatus.IN_PREPARATION, OrderStatus.READY].includes(item.status);

                        return (
                            <div key={item.id} className={`bg-white p-4 rounded-xl shadow-subtle flex items-center justify-between ${item.status === OrderStatus.CANCELED ? 'opacity-60' : ''}`}>
                                <div>
                                    <p className={`font-bold text-lg ${item.status === OrderStatus.CANCELED ? 'line-through' : ''}`}>{item.quantity}x {menuItem.name}</p>
                                    {item.note && <p className="text-sm text-text-secondary italic">"{item.note}"</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isFinalState ? (
                                        <Badge variant={item.status === OrderStatus.CANCELED ? 'red' : 'gray'}>{t(`statuses.${item.status}`)}</Badge>
                                    ) : (
                                        <>
                                            {(item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION) && (
                                                 <button
                                                    onClick={() => handleStatusChange(item, OrderStatus.CANCELED)}
                                                    disabled={isLoading}
                                                    className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
                                                >
                                                    {t('actions.cancelItem')}
                                                </button>
                                            )}
                                            {item.status === OrderStatus.NEW ? (
                                                <button 
                                                    onClick={() => handleStatusChange(item, OrderStatus.IN_PREPARATION)} 
                                                    disabled={isLoading}
                                                    className="px-4 py-2 bg-status-prep text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                                                >
                                                    {t('statuses.IN_PREPARATION')}
                                                </button>
                                            ) : isToggleable ? (
                                                <KitchenItemStatusToggle
                                                    status={item.status}
                                                    onChange={(newStatus) => handleStatusChange(item, newStatus)}
                                                    disabled={isLoading}
                                                />
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Modal>
    );
};

export default KitchenOrderModal;