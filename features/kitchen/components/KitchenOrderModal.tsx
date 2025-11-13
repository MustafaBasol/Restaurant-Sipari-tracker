import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useTables } from '../../tables/hooks/useTables';
import { useMenu } from '../../menu/hooks/useMenu';
import { useOrders } from '../../orders/hooks/useOrders';
import { Order, OrderItem } from '../../orders/types';
import { OrderStatus } from '../../../shared/types';
import { Modal } from '../../../shared/components/ui/Modal';
import { Badge } from '../../../shared/components/ui/Badge';

interface KitchenOrderModalProps {
    order: Order;
    onClose: () => void;
}

const KitchenOrderModal: React.FC<KitchenOrderModalProps> = ({ order, onClose }) => {
    const { t } = useLanguage();
    const { tables } = useTables();
    const { menuItems } = useMenu();
    const { updateOrderItemStatus } = useOrders();

    const table = tables.find(t => t.id === order.tableId);
    
    const handleStatusChange = (item: OrderItem, newStatus: OrderStatus) => {
        updateOrderItemStatus(order.id, item.id, newStatus);
    };
    
    const statusBadgeVariant: Record<OrderStatus, 'blue' | 'orange' | 'green' | 'gray'> = {
        [OrderStatus.NEW]: 'blue',
        [OrderStatus.IN_PREPARATION]: 'orange',
        [OrderStatus.READY]: 'green',
        [OrderStatus.SERVED]: 'gray',
        [OrderStatus.CANCELED]: 'gray',
    }

    return (
        <Modal isOpen={!!order} onClose={onClose} title={t('kitchen.orderDetails')}>
            <div className="p-6">
                <div className="mb-4 bg-white p-4 rounded-xl shadow-subtle">
                    <h3 className="text-2xl font-bold">{t('kitchen.table')} {table?.name}</h3>
                    <p className="text-sm text-text-secondary mb-2">{new Date(order.createdAt).toLocaleString()}</p>
                    {table?.customerName && <p className="text-sm font-semibold">Customer: {table.customerName}</p>}
                    {table?.note && <p className="text-sm text-text-secondary italic">Note: "{table.note}"</p>}
                </div>

                <div className="space-y-3">
                    {order.items.map(item => {
                        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                        if (!menuItem) return null;

                        return (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-subtle flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-lg">{item.quantity}x {menuItem.name}</p>
                                    {item.note && <p className="text-sm text-text-secondary italic">"{item.note}"</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={statusBadgeVariant[item.status]}>{t(`statuses.${item.status}`)}</Badge>
                                    {item.status === OrderStatus.NEW && (
                                        <button onClick={() => handleStatusChange(item, OrderStatus.IN_PREPARATION)} className="px-3 py-1 bg-status-prep text-white text-xs font-semibold rounded-full hover:opacity-90 transition-opacity">
                                            {t(`statuses.IN_PREPARATION`)}
                                        </button>
                                    )}
                                    {item.status === OrderStatus.IN_PREPARATION && (
                                        <button onClick={() => handleStatusChange(item, OrderStatus.READY)} className="px-3 py-1 bg-status-ready text-white text-xs font-semibold rounded-full hover:opacity-90 transition-opacity">
                                            {t(`statuses.READY`)}
                                        </button>
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
