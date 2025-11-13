
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Table, TableStatus, MenuItem, Order, OrderItem, OrderStatus } from '../../types';
import MenuDisplay from './MenuDisplay';
import CurrentOrder from './CurrentOrder';
import { XIcon } from '../icons/Icons';

interface OrderModalProps {
    table: Table;
    onClose: () => void;
}

type TempOrderItem = Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>;

const OrderModal: React.FC<OrderModalProps> = ({ table, onClose }) => {
    const { orders, createOrder, updateTableStatus, serveOrder, closeTable, t } = useAppContext();
    const [currentOrderItems, setCurrentOrderItems] = useState<TempOrderItem[]>([]);
    
    const activeOrder = useMemo(
        () => orders.find(o => o.tableId === table.id && o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELED),
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
            if(table.status === TableStatus.FREE) {
                await updateTableStatus(table.id, TableStatus.OCCUPIED);
            }
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20">
            <div className="bg-light-bg w-full h-full max-w-6xl max-h-[90vh] rounded-2xl shadow-medium flex flex-col overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-border-color bg-card-bg">
                    <h2 className="text-xl font-bold">{t('table')} {table.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon /></button>
                </header>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 overflow-hidden">
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
                               <button onClick={handleSendToKitchen} className="w-full bg-accent text-white font-semibold py-3 rounded-xl hover:bg-accent-hover">{t('sendToKitchen')}</button>
                           )}
                           { activeOrder && activeOrder.items.every(i => i.status === OrderStatus.READY) && (
                                <button onClick={handleServeOrder} className="w-full bg-status-ready text-white font-semibold py-3 rounded-xl hover:opacity-90">{t('serveOrder', 'Serve All Items')}</button>
                           )}
                           { activeOrder && activeOrder.items.every(i => i.status === OrderStatus.SERVED) && (
                               <button onClick={handleCloseTable} className="w-full bg-status-closed text-white font-semibold py-3 rounded-xl hover:opacity-90">{t('closeTable', 'Close Table')}</button>
                           )}
                       </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderModal;
