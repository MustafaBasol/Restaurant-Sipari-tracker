import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useTables } from '../../tables/hooks/useTables';
import { useMenu } from '../../menu/hooks/useMenu';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Order } from '../../orders/types';

const OrderDetails: React.FC<{ order: Order }> = ({ order }) => {
  const { tables } = useTables();
  const { menuItems } = useMenu();
  const table = tables.find((t) => t.id === order.tableId);

  return (
    <div className="bg-white p-4 rounded-xl shadow-subtle mb-4">
      <h3 className="font-bold text-lg">Table {table?.name}</h3>
      <p className="text-xs text-text-secondary mb-2">
        {new Date(order.createdAt).toLocaleTimeString()}
      </p>
      <ul className="divide-y divide-border-color">
        {order.items.map((item) => {
          const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
          if (!menuItem) return null;
          return (
            <li key={item.id} className="py-2">
              <p className="font-semibold">
                {item.quantity}x {menuItem.name}
              </p>
              {item.note && <p className="text-sm text-text-secondary italic">"{item.note}"</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const NotificationModal: React.FC = () => {
  const { isModalOpen, closeModal, newOrders } = useNotifications();
  const { t } = useLanguage();

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} title={t('notifications.title')}>
      <div className="p-6">
        {newOrders.length > 0 ? (
          <div>
            {newOrders.map((order) => (
              <OrderDetails key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary">{t('notifications.noNewOrders')}</p>
        )}
        <div className="mt-6 flex justify-end">
          <Button onClick={closeModal} variant="secondary">
            {t('notifications.dismiss')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
