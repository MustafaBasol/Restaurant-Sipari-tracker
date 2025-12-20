import React, { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { KitchenStation, OrderStatus } from '../../../shared/types';
import { useOrders } from '../../orders/hooks/useOrders';
import OrderList from '../../orders/components/OrderList';
import { Card } from '../../../shared/components/ui/Card';
import { NotificationModal } from '../../notifications/components/NotificationModal';
import { Order } from '../../orders/types';
import KitchenOrderModal from './KitchenOrderModal';
import { Select } from '../../../shared/components/ui/Select';
import { useMenu } from '../../menu/hooks/useMenu';

const KitchenDashboard: React.FC = () => {
  const { orders } = useOrders();
  const { t } = useLanguage();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [stationFilter, setStationFilter] = useState<'ALL' | KitchenStation>('ALL');
  const { menuItems } = useMenu();

  const getItemStation = useCallback(
    (menuItemId: string): KitchenStation => {
      const menuItem = menuItems.find((mi) => mi.id === menuItemId);
      if (menuItem?.station) return menuItem.station;
      if (menuItem?.categoryId === 'cat4') return KitchenStation.BAR;
      if (menuItem?.categoryId === 'cat3') return KitchenStation.DESSERT;
      return KitchenStation.HOT;
    },
    [menuItems],
  );

  const activeOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((order) =>
        order.items.some(
          (item) =>
            (stationFilter === 'ALL' ? true : getItemStation(item.menuItemId) === stationFilter) &&
            [OrderStatus.NEW, OrderStatus.IN_PREPARATION, OrderStatus.READY].includes(item.status),
        ),
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, stationFilter, getItemStation]);

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold">{t('kitchen.activeOrders')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">{t('kitchen.station')}</span>
              <Select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value as 'ALL' | KitchenStation)}
                className="py-2"
                aria-label={t('kitchen.station')}
              >
                <option value="ALL">{t('kitchen.stations.all')}</option>
                <option value={KitchenStation.BAR}>{t('kitchen.stations.bar')}</option>
                <option value={KitchenStation.HOT}>{t('kitchen.stations.hot')}</option>
                <option value={KitchenStation.COLD}>{t('kitchen.stations.cold')}</option>
                <option value={KitchenStation.DESSERT}>{t('kitchen.stations.dessert')}</option>
              </Select>
            </div>
          </div>
          {activeOrders.length > 0 ? (
            <OrderList
              orders={activeOrders}
              onSelectOrder={handleSelectOrder}
              stationFilter={stationFilter}
            />
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
