import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { OrderStatus } from '../../../shared/types';
import { Table } from '../../tables/types';
import { useTables } from '../../tables/hooks/useTables';
import { MenuItem } from '../../menu/types';
import { OrderItem } from '../types';
import { useOrders } from '../hooks/useOrders';
import MenuDisplay from '../../menu/components/MenuDisplay';
import CurrentOrder from './CurrentOrder';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';

interface OrderModalProps {
    table: Table;
    onClose: () => void;
}

type TempOrderItem = Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>;

const OrderModal: React.FC<OrderModalProps> = ({ table, onClose }) => {
    const { orders, createOrder, serveOrder } = useOrders();
    const { updateTableStatus, closeTable } = useTables();
    const { t } = useLanguage();
    const [currentOrderItems, setCurrentOrderItems] = useState<TempOrderItem[]>([]);
    
    const activeOrder = useMemo(
        () => orders?.find(o => o.tableId === table.id && o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELED),
        [orders, table.id]
    );

    const handleAddItem = (menuItem: MenuItem) => {
        setCurrentOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.menuItemId === menuItem.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.menuItemId === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { menuItemId: menuItem.id, quantity: 1, note: '' }];
        });
    };

    const handleUpdateItem = (menuItemId: string, newQuantity: number, newNote: string) => {
         setCurrentOrderItems(prevItems => prevItems.map(item => 
            item.menuItemId === menuItemId ? { ...item, quantity: newQuantity, note: newNote } : item
        ));
    };

    const handleRemoveItem = (menuItemId: string) => {
         setCurrentOrderItems(prevItems => prevItems.filter(item => item.menuItemId !== menuItemId));
    };

    const handleSendToKitchen = async () => {
        if (currentOrderItems.length > 0) {
            await createOrder(table.id, currentOrderItems);
            setCurrentOrderItems([]);
            onClose();
        }
    };
    
    const handleServeOrder = async () => {
        if(activeOrder) {
            await serveOrder(activeOrder.id);
            onClose();
        }
    }
    
    const handleCloseTable = async () => {
        await closeTable(table.id);
        onClose();
    }

    return (
         <Modal isOpen={true} onClose={onClose} title={t('waiter.orderModalTitle', `Table ${table.name}`).replace('{tableName}', table.name)}>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 overflow-hidden h-full">
                <div className="lg:col-span-3 overflow-y-auto">
                    <MenuDisplay onAddItem={handleAddItem} />
                </div>
                
                <div className="lg:col-span-2 bg-card-bg flex flex-col border-l border-border-color overflow-y-auto">
                   <CurrentOrder 
                      order={activeOrder}
                      tempItems={currentOrderItems}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                   />
                   <div className="p-4 mt-auto border-t border-border-color space-y-2">
                       { currentOrderItems.length > 0 && (
                           <Button onClick={handleSendToKitchen} className="w-full">{t('waiter.sendToKitchen')}</Button>
                       )}
                       { activeOrder && activeOrder.items.every(i => i.status === OrderStatus.READY) && (
                            <Button onClick={handleServeOrder} className="w-full bg-status-ready hover:opacity-90">{t('waiter.serve')}</Button>
                       )}
                       { activeOrder && activeOrder.items.every(i => i.status === OrderStatus.SERVED) && (
                           <Button onClick={handleCloseTable} className="w-full bg-status-closed hover:opacity-90">{t('general.close')}</Button>
                       )}
                   </div>
                </div>
            </div>
        </Modal>
    );
};

export default OrderModal;