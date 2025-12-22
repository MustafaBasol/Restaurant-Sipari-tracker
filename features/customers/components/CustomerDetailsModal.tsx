import React, { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Customer } from '../types';
import { Order } from '../../orders/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { useMenu } from '../../menu/hooks/useMenu';
import { useTables } from '../../tables/hooks/useTables';
import { OrderStatus } from '../../../shared/types';
import { formatCurrency, formatDateTime } from '../../../shared/lib/utils';
import { calcOrderPricing } from '../../../shared/lib/billing';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  orders: Order[];
  onUpdateCustomer: (
    updates: Pick<Customer, 'id' | 'tenantId' | 'fullName' | 'phone' | 'email'>,
  ) => Promise<Customer> | Promise<void>;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  orders,
  onUpdateCustomer,
}) => {
  const { t } = useLanguage();
  const { authState } = useAuth();
  const { menuItems } = useMenu();
  const { tables } = useTables();

  const currency = authState?.tenant?.currency || 'USD';
  const timezone = authState?.tenant?.timezone || 'UTC';
  const taxRatePercent = authState?.tenant?.taxRatePercent ?? 0;
  const serviceChargePercent = authState?.tenant?.serviceChargePercent ?? 0;
  const roundingIncrement = authState?.tenant?.roundingIncrement ?? 0;

  const [fullName, setFullName] = useState(customer.fullName);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [email, setEmail] = useState(customer.email ?? '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const ordersSorted = useMemo(() => {
    return orders
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const getOrderSubtotal = (order: Order): number => {
    return order.items.reduce((acc, item) => {
      if (item.status === OrderStatus.CANCELED) return acc;
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
      const price = menuItem ? Number(menuItem.price) || 0 : 0;
      return acc + price * item.quantity;
    }, 0);
  };

  const handleSave = async () => {
    setError('');
    const name = fullName.trim();
    if (!name) {
      setError(t('customers.validation.fullNameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateCustomer({
        id: customer.id,
        tenantId: customer.tenantId,
        fullName: name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      onClose();
    } catch (e) {
      console.error('Failed to update customer', e);
      setError(t('customers.validation.updateFailed'));
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('customers.detailsTitle')}>
      <div className="p-4 max-w-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('customers.fullName')}
              </label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('customers.phone')}
              </label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('customers.email')}
              </label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '...' : t('general.save')}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                {t('general.cancel')}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-text-secondary">
              {t('customers.historyTitle')}
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {ordersSorted.length === 0 && (
                <div className="text-sm text-text-secondary">{t('customers.noOrders')}</div>
              )}

              {ordersSorted.map((order) => {
                const tableName = tables.find((t) => t.id === order.tableId)?.name;
                const subtotal = getOrderSubtotal(order);
                const pricing = calcOrderPricing({
                  subtotal,
                  discount: order.discount,
                  taxRatePercent,
                  serviceChargePercent,
                  roundingIncrement,
                });
                return (
                  <div
                    key={order.id}
                    className="border border-border-color rounded-xl p-3 bg-card-bg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-text-primary">
                        {tableName ? `${tableName}` : t('customers.unknownTable')}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {formatDateTime(order.createdAt, timezone, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-text-secondary">
                      {t('customers.orderTotal')}: {formatCurrency(pricing.total, currency)}
                    </div>

                    {order.note && (
                      <div className="mt-2 text-xs text-text-secondary">
                        {t('customers.orderNote')}: {order.note}
                      </div>
                    )}

                    <div className="mt-2 space-y-1">
                      {order.items.map((it) => {
                        const mi = menuItems.find((m) => m.id === it.menuItemId);
                        return (
                          <div key={it.id} className="flex items-start justify-between gap-3">
                            <div className="text-sm">
                              <span className="font-medium">{it.quantity}x</span>{' '}
                              {mi?.name ?? it.menuItemId}
                              {it.note ? (
                                <div className="text-xs text-text-secondary">“{it.note}”</div>
                              ) : null}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {t(`statuses.${it.status}`)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerDetailsModal;
