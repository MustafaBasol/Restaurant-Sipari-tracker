import React, { useState, useMemo, useEffect } from 'react';
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
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { useAuth } from '../../auth/hooks/useAuth';


interface OrderModalProps {
    table: Table;
    onClose: () => void;
}

type TempOrderItem = Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>;

const OrderModal: React.FC<OrderModalProps> = ({ table: initialTable, onClose }) => {
    const { authState } = useAuth();
    const { orders, createOrder, serveOrder, updateOrderNote } = useOrders();
    const { tables, updateTable, closeTable, refetch: refetchTables } = useTables();
    const { t } = useLanguage();
    
    const table = useMemo(() => tables.find(t => t.id === initialTable.id) || initialTable, [tables, initialTable]);

    const [currentOrderItems, setCurrentOrderItems] = useState<TempOrderItem[]>([]);
    const [customerName, setCustomerName] = useState(table.customerName || '');
    const [tableNote, setTableNote] = useState(table.note || '');
    const [orderNote, setOrderNote] = useState('');
    
    useEffect(() => {
        setCustomerName(table.customerName || '');
        setTableNote(table.note || '');
    }, [table]);

    const activeOrder = useMemo(
        () => orders?.find(o => o.tableId === table.id && o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELED),
        [orders, table.id]
    );

    useEffect(() => {
        if (activeOrder) {
            setOrderNote(activeOrder.note || '');
        }
    }, [activeOrder]);
    
    const handleTableInfoSave = () => {
        if (table.customerName !== customerName || table.note !== tableNote) {
            updateTable({ ...table, customerName, note: tableNote });
        }
    };

    const handleOrderNoteSave = () => {
        if (activeOrder && activeOrder.note !== orderNote) {
            updateOrderNote(activeOrder.id, orderNote);
        }
    };

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
        if (currentOrderItems.length > 0 && authState?.user.id) {
            await createOrder(table.id, currentOrderItems, authState.user.id);
            await refetchTables();
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
                    <div className="p-4 border-b border-border-color grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-text-secondary">{t('waiter.customerName')}</label>
                            <Input 
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                onBlur={handleTableInfoSave}
                                placeholder={t('waiter.customerName')}
                                className="py-2"
                            />
                        </div>
                         <div>
                            <label className="text-xs font-medium text-text-secondary">{t('waiter.tableNote')}</label>
                            <Textarea
                                value={tableNote}
                                onChange={(e) => setTableNote(e.target.value)}
                                onBlur={handleTableInfoSave}
                                placeholder={t('waiter.tableNote')}
                                className="py-2 h-10 resize-none"
                                rows={1}
                            />
                        </div>
                    </div>
                    <MenuDisplay onAddItem={handleAddItem} />
                </div>
                
                <div className="lg:col-span-2 bg-card-bg flex flex-col border-l border-border-color overflow-y-auto">
                   <CurrentOrder 
                      order={activeOrder}
                      tempItems={currentOrderItems}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                   />
                   {activeOrder && (
                       <div className="p-4">
                           <label className="text-xs font-medium text-text-secondary">{t('waiter.notes')}</label>
                           <Textarea
                               value={orderNote}
                               onChange={(e) => setOrderNote(e.target.value)}
                               onBlur={handleOrderNoteSave}
                               placeholder={t('waiter.addNote')}
                               className="py-2"
                               rows={2}
                           />
                       </div>
                   )}
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