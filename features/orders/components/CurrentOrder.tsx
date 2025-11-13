
import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useMenu } from '../../menu/hooks/useMenu';
import { Order, OrderItem } from '../types';
import { OrderStatus } from '../../../shared/types';
import { TrashIcon } from '../../../shared/components/icons/Icons';
import { Input } from '../../../shared/components/ui/Input';
import { useOrders } from '../hooks/useOrders';

type TempOrderItem = Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>;

interface CurrentOrderProps {
    order?: Order | null;
    tempItems: TempOrderItem[];
    onUpdateItem: (menuItemId: string, quantity: number, note: string) => void;
    onRemoveItem: (menuItemId: string) => void;
}

const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.NEW]: 'text-status-new',
    [OrderStatus.IN_PREPARATION]: 'text-status-prep',
    [OrderStatus.READY]: 'text-status-ready',
    [OrderStatus.SERVED]: 'text-status-served',
    [OrderStatus.CANCELED]: 'text-red-500',
    [OrderStatus.CLOSED]: 'text-status-closed',
};

const OrderItemRow: React.FC<{
    item: TempOrderItem | OrderItem;
    isTemp: boolean;
    onUpdate: (quantity: number, note: string) => void;
    onRemove: () => void;
}> = ({ item, isTemp, onUpdate, onRemove }) => {
    const { menuItems } = useMenu();
    const { t } = useLanguage();
    const { serveOrderItem } = useOrders();
    const menuItem = menuItems.find(mi => mi.id === item.menuItemId);

    if (!menuItem) return null;

    const status = 'status' in item ? item.status : OrderStatus.NEW;

    const handleServeItem = () => {
        if ('orderId' in item && item.orderId && item.id) {
             serveOrderItem(item.orderId, item.id);
        }
    }

    return (
        <div className="py-3">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold">{menuItem.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className={`text-xs font-medium ${statusColors[status]}`}>{t(`statuses.${status}`)}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                     <p className="font-semibold">${(menuItem.price * item.quantity).toFixed(2)}</p>
                    {status === OrderStatus.READY && (
                        <button 
                            onClick={handleServeItem}
                            className="px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full hover:bg-accent-hover transition-colors"
                        >
                            {t('actions.markAsServed')}
                        </button>
                    )}
                </div>
            </div>
            {isTemp ? (
                <div className="flex items-center gap-2 mt-2">
                     <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onUpdate(parseInt(e.target.value) || 1, item.note)}
                        className="w-16 text-center py-1"
                    />
                    <Input
                        type="text"
                        value={item.note}
                        onChange={(e) => onUpdate(item.quantity, e.target.value)}
                        placeholder={t('waiter.addNote')}
                        className="flex-grow py-1 px-2 text-sm"
                    />
                    <button onClick={onRemove} className="text-red-500 hover:text-red-700 p-1"><TrashIcon/></button>
                </div>
            ) : (
                 item.note && <p className="text-xs text-text-secondary mt-1 italic">"{item.note}"</p>
            )}
        </div>
    );
};


const CurrentOrder: React.FC<CurrentOrderProps> = ({ order, tempItems, onUpdateItem, onRemoveItem }) => {
    const { t } = useLanguage();
    const { menuItems } = useMenu();
    
    const allItems = [ ...(order?.items || []), ...tempItems ];
    
    const totalPrice = allItems.reduce((acc, item) => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        return acc + (menuItem ? menuItem.price * item.quantity : 0);
    }, 0);

    return (
        <div className="flex-1 p-4 flex flex-col">
            <h3 className="text-lg font-bold pb-2 border-b border-border-color">{t('waiter.currentOrder')}</h3>
            <div className="flex-1 divide-y divide-border-color overflow-y-auto -mx-4 px-4">
                {order?.items.map(item => (
                    <OrderItemRow key={item.id} item={item} isTemp={false} onUpdate={()=>{}} onRemove={()=>{}} />
                ))}
                {tempItems.map(item => (
                    <OrderItemRow 
                        key={item.menuItemId} 
                        item={item} 
                        isTemp={true}
                        onUpdate={(q, n) => onUpdateItem(item.menuItemId, q, n)}
                        onRemove={() => onRemoveItem(item.menuItemId)}
                    />
                ))}
                {allItems.length === 0 && <p className="text-text-secondary text-center pt-10">Select items from the menu.</p>}
            </div>
            <div className="mt-auto pt-4 flex justify-between items-center font-bold text-lg border-t border-border-color">
                <span>{t('waiter.total')}</span>
                <span>${totalPrice.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default CurrentOrder;