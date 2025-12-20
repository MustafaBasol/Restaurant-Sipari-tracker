import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { OrderStatus } from '../../../shared/types';
import { useOrders } from '../../orders/hooks/useOrders';
import OrderList from '../../orders/components/OrderList';
import { Card } from '../../../shared/components/ui/Card';
import { NotificationModal } from '../../notifications/components/NotificationModal';
import { Order } from '../../orders/types';
import KitchenOrderModal from './KitchenOrderModal';

const KitchenDashboard: React.FC = () => {
  const { orders } = useOrders();
  const { t } = useLanguage();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const activeOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((order) =>
        order.items.some((item) =>
          [OrderStatus.NEW, OrderStatus.IN_PREPARATION, OrderStatus.READY].includes(item.status),
        ),
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  return (
    <>
      <NotificationModal />
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">{t('kitchen.title')}</h1>
        <Card>
          <h2 className="text-xl font-semibold mb-4">{t('kitchen.activeOrders')}</h2>
          {activeOrders.length > 0 ? (
            <OrderList orders={activeOrders} onSelectOrder={handleSelectOrder} />
          ) : (
            <p className="text-text-secondary text-center py-10">{t('kitchen.noActiveOrders')}</p>
          )}
        </Card>
      </div>
      {selectedOrder && <KitchenOrderModal order={selectedOrder} onClose={handleCloseModal} />}
    </>
  );
};

export default KitchenDashboard;
