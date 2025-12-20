import React from 'react';
import { useTables } from '../hooks/useTables';
import { Table, TableStatus } from '../types';
import { useOrders } from '../../orders/hooks/useOrders';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { OrderStatus } from '../../../shared/types';
import { OrderIcon, NoteIcon } from '../../../shared/components/icons/Icons';
import { Button } from '../../../shared/components/ui/Button';

interface TableGridProps {
  onSelectTable: (table: Table) => void;
}

const TableGrid: React.FC<TableGridProps> = ({ onSelectTable }) => {
  const { tables, updateTableStatus } = useTables();
  const { orders } = useOrders();
  const { t } = useLanguage();

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
    return orders?.some(
      (order) =>
        (order.tableId === tableId || order.linkedTableIds?.includes(tableId)) &&
        order.status !== OrderStatus.CLOSED &&
        order.status !== OrderStatus.CANCELED,
    );
  };

  const handleStatusChange = (e: React.MouseEvent, table: Table, newStatus: TableStatus) => {
    e.stopPropagation(); // Prevent onSelectTable from firing
    updateTableStatus(table.id, newStatus);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {tables.map((table) => {
        const canChangeStatus = !hasActiveOrder(table.id);
        return (
          <div key={table.id} className="flex flex-col gap-2">
            <button
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
              <span className="text-sm font-medium text-text-secondary">
                {t(`statuses.${table.status}`)}
              </span>
              {hasActiveOrder(table.id) && (
                <div className="absolute top-3 right-3 text-accent">
                  <OrderIcon />
                </div>
              )}
              {(table.note || table.customerName) && (
                <div className="absolute top-3 left-3 text-gray-400">
                  <NoteIcon />
                </div>
              )}
            </button>
            {canChangeStatus && table.status !== TableStatus.CLOSED && (
              <div className="flex justify-center">
                {table.status === TableStatus.FREE ? (
                  <Button
                    variant="secondary"
                    className="py-2 px-4 text-sm w-full"
                    onClick={(e) => handleStatusChange(e, table, TableStatus.OCCUPIED)}
                  >
                    {t('waiter.occupyTable')}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="py-2 px-4 text-sm w-full"
                    onClick={(e) => handleStatusChange(e, table, TableStatus.FREE)}
                  >
                    {t('waiter.freeUpTable')}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TableGrid;
