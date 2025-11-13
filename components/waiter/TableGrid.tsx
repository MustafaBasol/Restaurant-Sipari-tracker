
import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Table, TableStatus, OrderStatus } from '../../types';
import { OrderIcon } from '../icons/Icons';

interface TableGridProps {
    onSelectTable: (table: Table) => void;
}

const TableGrid: React.FC<TableGridProps> = ({ onSelectTable }) => {
    const { tables, orders, t } = useAppContext();
    
    const getTableStatusClass = (status: TableStatus) => {
        switch (status) {
            case TableStatus.FREE:
                return 'border-status-free';
            case TableStatus.OCCUPIED:
                return 'border-status-occupied';
            case TableStatus.CLOSED:
                return 'border-status-closed';
            default:
                return 'border-gray-300';
        }
    };
    
    const hasActiveOrder = (tableId: string) => {
        return orders.some(order => order.tableId === tableId && order.items.some(item => item.status !== OrderStatus.SERVED && item.status !== OrderStatus.CANCELED));
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {tables.map(table => (
                <button
                    key={table.id}
                    onClick={() => onSelectTable(table)}
                    className={`
                        relative aspect-square flex flex-col items-center justify-center 
                        bg-card-bg rounded-2xl shadow-subtle
                        border-4 ${getTableStatusClass(table.status)}
                        hover:scale-105 hover:shadow-medium transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-accent/50
                    `}
                >
                    <span className="text-2xl md:text-3xl font-bold text-text-primary">{table.name}</span>
                    <span className="text-sm font-medium text-text-secondary">{t(table.status)}</span>
                    {hasActiveOrder(table.id) && (
                        <div className="absolute top-3 right-3 text-accent">
                           <OrderIcon />
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
};

export default TableGrid;
