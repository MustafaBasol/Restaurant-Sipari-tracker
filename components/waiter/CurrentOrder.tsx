import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Order, OrderItem, OrderStatus } from '../../types';
import { TrashIcon } from '../icons/Icons';

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
};

const OrderItemRow: React.FC<{
    item: TempOrderItem | OrderItem;
    isTemp: boolean;
    onUpdate: (quantity: number, note: string) => void;
    onRemove: () => void;
}> = ({ item, isTemp, onUpdate, onRemove }) => {
    const { menuItems, t } = useAppContext();
    const menuItem = menuItems.find(mi => mi.id === item.menuItemId);

    if (!menuItem) return null;

    const status = 'status' in item ? item.status : OrderStatus.NEW;

    return (
        <div className="py-3">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold">{menuItem.name}</p>
                    <p className={`text-xs font-medium ${statusColors[status]}`}>{t(status)}</p>
                </div>
                <p className="font-semibold">${(menuItem.price * item.quantity).toFixed(2)}</p>
            </div>
            {isTemp ? (
                <div className="flex items-center gap-2 mt-2">
                     <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onUpdate(parseInt(e.target.value), item.note)}
                        className="w-16 text-center bg-light-bg rounded-md py-1"
                    />
                    <input
                        type="text"
                        value={item.note}
                        onChange={(e) => onUpdate(item.quantity, e.target.value)}
                        placeholder={t('addNote')}
                        className="flex-grow bg-light-bg rounded-md py-1 px-2 text-sm"
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
    const { t, menuItems } = useAppContext();
    
    const allItems = [
        ...(order?.items || []),
        ...tempItems
    ];
    
    const totalPrice = allItems.reduce((acc, item) => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        return acc + (menuItem ? menuItem.price * item.quantity : 0);
    }, 0);

    return (
        <div className="flex-1 p-4 flex flex-col">
            <h3 className="text-lg font-bold pb-2 border-b border-border-color">{t('currentOrder')}</h3>
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
                <span>{t('total')}</span>
                <span>${totalPrice.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default CurrentOrder;
