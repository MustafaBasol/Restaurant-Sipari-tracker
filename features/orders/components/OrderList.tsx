import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useTables } from '../../tables/hooks/useTables';
import { useMenu } from '../../menu/hooks/useMenu';
import { useOrders } from '../hooks/useOrders';
import { Order, OrderItem } from '../types';
import { OrderStatus } from '../../../shared/types';
import { Card } from '../../../shared/components/ui/Card';
import { NoteIcon } from '../../../shared/components/icons/Icons';
import { useAuth } from '../../auth/hooks/useAuth';
import { formatDateTime } from '../../../shared/lib/utils';

interface OrderListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

const OrderItemCard: React.FC<{ item: OrderItem; orderId: string }> = ({ item, orderId }) => {
  const { menuItems } = useMenu();
  const { updateOrderItemStatus } = useOrders();
  const { t } = useLanguage();
  const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    await updateOrderItemStatus(orderId, item.id, newStatus);
  };

  if (!menuItem) return null;

  return (
    <div className="bg-light-bg p-3 rounded-lg flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold">
          {item.quantity}x {menuItem.name}
        </p>
        {item.note && <p className="text-xs text-text-secondary italic">"{item.note}"</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.status === OrderStatus.NEW && (
          <button
            onClick={() => handleStatusChange(OrderStatus.IN_PREPARATION)}
            className="px-3 py-1 bg-status-prep text-white text-xs font-semibold rounded-full"
          >
            {t(`statuses.IN_PREPARATION`)}
          </button>
        )}
        {item.status === OrderStatus.IN_PREPARATION && (
          <button
            onClick={() => handleStatusChange(OrderStatus.READY)}
            className="px-3 py-1 bg-status-ready text-white text-xs font-semibold rounded-full"
          >
            {t(`statuses.READY`)}
          </button>
        )}
        {item.status === OrderStatus.READY && (
          <span className="px-3 py-1 bg-status-ready/20 text-status-ready text-xs font-semibold rounded-full">
            {t(`statuses.READY`)}
          </span>
        )}
      </div>
    </div>
  );
};

const OrderList: React.FC<OrderListProps> = ({ orders, onSelectOrder }) => {
  const { tables } = useTables();
  const { t } = useLanguage();
  const { markOrderAsReady } = useOrders();
  const { authState } = useAuth();
  const timezone = authState?.tenant?.timezone || 'UTC';
  const LATE_THRESHOLD_MINUTES = 7;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {orders.map((order) => {
        const table = tables.find((t) => t.id === order.tableId);
        const ageMinutes = Math.max(
          0,
          Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
        );
        const isLate = ageMinutes >= LATE_THRESHOLD_MINUTES;
        const activeItems = order.items.filter((item) =>
          [OrderStatus.NEW, OrderStatus.IN_PREPARATION, OrderStatus.READY].includes(item.status),
        );
        const canMarkAllReady = order.items.some(
          (item) => item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION,
        );

        if (activeItems.length === 0) return null;

        return (
          <button key={order.id} onClick={() => onSelectOrder(order)} className="text-left">
            <Card
              padding="none"
              className="flex flex-col h-full hover:shadow-medium transition-shadow"
            >
              <div className="p-4 border-b border-border-color">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">
                      {t('kitchen.table')} {table?.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{formatDateTime(order.createdAt, timezone, { timeStyle: 'short' })}</span>
                      <span>•</span>
                      <span>
                        {ageMinutes} {t('kitchen.minutesShort')}
                      </span>
                      {isLate && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          {t('kitchen.late')}
                        </span>
                      )}
                    </div>
                    {order.waiterName && (
                      <p className="text-xs text-text-secondary">
                        {t('kitchen.orderBy')}: {order.waiterName}
                      </p>
                    )}
                  </div>
                  {canMarkAllReady && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markOrderAsReady(order.id);
                      }}
                      className="px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full hover:bg-accent-hover transition-colors"
                    >
                      {t('kitchen.markAllReady')}
                    </button>
                  )}
                </div>
                {order.note && (
                  <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-100 border border-amber-200 p-2 rounded-md mt-2">
                    <NoteIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="font-medium">{order.note}</p>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3 flex-1">
                {activeItems.map((item) => (
                  <OrderItemCard key={item.id} item={item} orderId={order.id} />
                ))}
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
};

export default OrderList;
