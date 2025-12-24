import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useTables } from '../../tables/hooks/useTables';
import { useMenu } from '../../menu/hooks/useMenu';
import { Order } from '../../orders/types';
import { OrderStatus } from '../../../shared/types';
import { Modal } from '../../../shared/components/ui/Modal';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../auth/hooks/useAuth';
import { formatCurrency } from '../../../shared/lib/utils';

interface AdminOrderViewModalProps {
  order: Order;
  onClose: () => void;
}

const AdminOrderViewModal: React.FC<AdminOrderViewModalProps> = ({ order, onClose }) => {
  const { t } = useLanguage();
  const { authState } = useAuth();
  const { tables } = useTables();
  const { menuItems } = useMenu();

  const currency = authState?.tenant?.currency || 'USD';

  const table = tables.find((t) => t.id === order.tableId);

  // FIX: Add missing OrderStatus.CLOSED to satisfy the Record type
  const statusBadgeVariant: Record<OrderStatus, 'blue' | 'orange' | 'green' | 'gray'> = {
    [OrderStatus.NEW]: 'blue',
    [OrderStatus.IN_PREPARATION]: 'orange',
    [OrderStatus.READY]: 'green',
    [OrderStatus.SERVED]: 'gray',
    [OrderStatus.CANCELED]: 'gray',
    [OrderStatus.CLOSED]: 'gray',
  };

  const total = order.items.reduce((acc, item) => {
    if (item.status === OrderStatus.CANCELED) return acc;
    const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
    return acc + (menuItem ? menuItem.price * item.quantity : 0);
  }, 0);

  const title = t('admin.tables.orderModalTitle').replace('{tableName}', table?.name || '');

  return (
    <Modal isOpen={!!order} onClose={onClose} title={title}>
      <div className="p-6">
        <div className="mb-4 bg-white p-4 rounded-xl shadow-subtle">
          {(order.customerName || table?.customerName) && (
            <p className="text-sm font-semibold">
              {t('waiter.customerName')}: {order.customerName || table?.customerName}
            </p>
          )}
          {table?.note && (
            <p className="text-sm text-text-secondary italic">Note: "{table.note}"</p>
          )}
        </div>
        <div className="space-y-4">
          {order.items.map((item) => {
            const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
            if (!menuItem) return null;

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow-subtle flex items-center justify-between"
              >
                <div>
                  <p className="font-bold">
                    {item.quantity}x {menuItem.name}
                  </p>
                  {item.note && <p className="text-sm text-text-secondary italic">"{item.note}"</p>}
                </div>
                <Badge variant={statusBadgeVariant[item.status]}>
                  {t(`statuses.${item.status}`)}
                </Badge>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t border-border-color flex justify-between items-center font-bold text-lg">
          <span>{t('waiter.total')}</span>
          <span>{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </Modal>
  );
};

export default AdminOrderViewModal;
