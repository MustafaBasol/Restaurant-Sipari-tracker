import React, { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Customer } from '../types';
import { Order } from '../../orders/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { useMenu } from '../../menu/hooks/useMenu';
import { useTables } from '../../tables/hooks/useTables';
import { BillingStatus, OrderStatus, PaymentMethod } from '../../../shared/types';
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

  const getVariantName = (menuItem: any, variantId?: string): string => {
    if (!variantId) return '';
    const variants = Array.isArray(menuItem?.variants) ? menuItem.variants : [];
    return variants.find((v: any) => v.id === variantId)?.name ?? '';
  };

  const getSelectedModifierOptionNames = (menuItem: any, optionIds: string[]): string[] => {
    const modifiers = Array.isArray(menuItem?.modifiers) ? menuItem.modifiers : [];
    const names: string[] = [];
    for (const mod of modifiers) {
      const options = Array.isArray(mod?.options) ? mod.options : [];
      for (const opt of options) {
        if (optionIds.includes(opt.id)) names.push(opt.name);
      }
    }
    return names;
  };

  const getUnitPrice = (
    menuItem: any,
    item: { variantId?: string; modifierOptionIds?: string[] },
  ): number => {
    const variants = Array.isArray(menuItem?.variants) ? menuItem.variants : [];
    const variantPrice = item.variantId
      ? variants.find((v: any) => v.id === item.variantId)?.price
      : undefined;
    const basePrice = Number.isFinite(variantPrice)
      ? Number(variantPrice)
      : Number(menuItem?.price) || 0;

    const selectedOptionIds = item.modifierOptionIds ?? [];
    const modifiers = Array.isArray(menuItem?.modifiers) ? menuItem.modifiers : [];
    if (selectedOptionIds.length === 0 || modifiers.length === 0) return basePrice;

    let delta = 0;
    for (const mod of modifiers) {
      const options = Array.isArray(mod?.options) ? mod.options : [];
      for (const opt of options) {
        if (selectedOptionIds.includes(opt.id)) {
          const d = Number(opt.priceDelta);
          delta += Number.isFinite(d) ? d : 0;
        }
      }
    }
    return basePrice + delta;
  };

  const getOrderSubtotal = (order: Order): number => {
    return order.items.reduce((acc, item) => {
      if (item.status === OrderStatus.CANCELED) return acc;
      if (item.isComplimentary) return acc;
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
      if (!menuItem) return acc;
      const unit = getUnitPrice(menuItem, {
        variantId: item.variantId,
        modifierOptionIds: item.modifierOptionIds,
      });
      return acc + unit * item.quantity;
    }, 0);
  };

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    if (method === PaymentMethod.CASH) return t('waiter.paymentMethods.cash');
    if (method === PaymentMethod.CARD) return t('waiter.paymentMethods.card');
    if (method === PaymentMethod.MEAL_CARD) return t('waiter.paymentMethods.mealCard');
    return String(method);
  };

  const statusVariantMap: Record<OrderStatus, 'blue' | 'orange' | 'green' | 'gray' | 'red'> = {
    [OrderStatus.NEW]: 'blue',
    [OrderStatus.IN_PREPARATION]: 'orange',
    [OrderStatus.READY]: 'green',
    [OrderStatus.SERVED]: 'gray',
    [OrderStatus.CANCELED]: 'red',
    [OrderStatus.CLOSED]: 'gray',
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

                const billingStatus = order.billingStatus ?? BillingStatus.OPEN;
                const payments = Array.isArray(order.payments) ? order.payments : [];
                const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const remaining = Math.max(0, pricing.total - paidAmount);

                const tableNames = [
                  tableName,
                  ...(order.linkedTableIds ?? [])
                    .map((id) => tables.find((t) => t.id === id)?.name)
                    .filter(Boolean),
                ].filter(Boolean) as string[];
                const tableLabel =
                  tableNames.length > 0 ? tableNames.join(' + ') : t('customers.unknownTable');

                return (
                  <div
                    key={order.id}
                    className="border border-border-color rounded-xl p-3 bg-card-bg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-text-primary">{tableLabel}</div>
                      <div className="text-xs text-text-secondary">
                        {formatDateTime(order.createdAt, timezone, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariantMap[order.status] || 'gray'}>
                        {t(`statuses.${order.status}`)}
                      </Badge>
                      {order.orderClosedAt ? (
                        <div className="text-xs text-text-secondary">
                          {t('customers.closedAt')}:&nbsp;
                          {formatDateTime(order.orderClosedAt, timezone, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      ) : null}
                      {order.waiterName ? (
                        <div className="text-xs text-text-secondary">
                          {t('customers.waiter')}: {order.waiterName}
                        </div>
                      ) : null}
                      <div className="text-xs text-text-secondary">
                        {t('customers.billingStatus')}:&nbsp;
                        {billingStatus === BillingStatus.OPEN
                          ? t('waiter.billingStatuses.open')
                          : billingStatus === BillingStatus.BILL_REQUESTED
                            ? t('waiter.billingStatuses.billRequested')
                            : t('waiter.billingStatuses.paid')}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-text-secondary">{t('customers.subtotal')}</div>
                      <div className="text-right text-text-primary">
                        {formatCurrency(pricing.subtotal, currency)}
                      </div>

                      {pricing.discountAmount > 0.00001 && (
                        <>
                          <div className="text-text-secondary">{t('waiter.discount')}</div>
                          <div className="text-right text-text-primary">
                            -{formatCurrency(pricing.discountAmount, currency)}
                          </div>
                        </>
                      )}

                      {pricing.serviceChargeAmount > 0.00001 && (
                        <>
                          <div className="text-text-secondary">{t('waiter.serviceCharge')}</div>
                          <div className="text-right text-text-primary">
                            {formatCurrency(pricing.serviceChargeAmount, currency)}
                          </div>
                        </>
                      )}

                      {pricing.taxAmount > 0.00001 && (
                        <>
                          <div className="text-text-secondary">{t('waiter.tax')}</div>
                          <div className="text-right text-text-primary">
                            {formatCurrency(pricing.taxAmount, currency)}
                          </div>
                        </>
                      )}

                      {Math.abs(pricing.roundingAdjustment) > 0.00001 && (
                        <>
                          <div className="text-text-secondary">{t('waiter.rounding')}</div>
                          <div className="text-right text-text-primary">
                            {formatCurrency(pricing.roundingAdjustment, currency)}
                          </div>
                        </>
                      )}

                      <div className="text-text-secondary font-medium">
                        {t('customers.orderTotal')}
                      </div>
                      <div className="text-right text-text-primary font-semibold">
                        {formatCurrency(pricing.total, currency)}
                      </div>
                    </div>

                    {order.note && (
                      <div className="mt-2 text-xs text-text-secondary">
                        {t('customers.orderNote')}: {order.note}
                      </div>
                    )}

                    {payments.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-text-secondary">
                          {t('customers.paymentsTitle')}
                        </div>
                        <div className="mt-1 space-y-1">
                          {payments
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                            )
                            .map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="text-text-secondary">
                                  {getPaymentMethodLabel(p.method)}
                                  <span className="text-text-secondary"> · </span>
                                  {formatDateTime(p.createdAt, timezone, {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </div>
                                <div className="text-text-primary">
                                  {formatCurrency(Number(p.amount) || 0, currency)}
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div className="text-text-secondary">{t('customers.paidLabel')}</div>
                          <div className="text-right text-text-primary">
                            {formatCurrency(paidAmount, currency)}
                          </div>
                          <div className="text-text-secondary">{t('customers.remainingLabel')}</div>
                          <div className="text-right text-text-primary">
                            {formatCurrency(remaining, currency)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 space-y-1">
                      {order.items.map((it) => {
                        const mi = menuItems.find((m) => m.id === it.menuItemId);
                        const selectedVariantName = mi ? getVariantName(mi, it.variantId) : '';
                        const selectedModifierNames = mi
                          ? getSelectedModifierOptionNames(mi, it.modifierOptionIds ?? [])
                          : [];

                        const unitPrice = mi
                          ? getUnitPrice(mi, {
                              variantId: it.variantId,
                              modifierOptionIds: it.modifierOptionIds,
                            })
                          : 0;
                        const isCanceled = it.status === OrderStatus.CANCELED;
                        const isComplimentary = Boolean(it.isComplimentary);
                        const lineTotal =
                          isCanceled || (isComplimentary && !isCanceled)
                            ? 0
                            : unitPrice * it.quantity;
                        return (
                          <div key={it.id} className="flex items-start justify-between gap-3">
                            <div className="text-sm">
                              <span className="font-medium">{it.quantity}x</span>{' '}
                              <span className={isCanceled ? 'line-through opacity-60' : ''}>
                                {mi?.name ?? it.menuItemId}
                              </span>
                              {(selectedVariantName || selectedModifierNames.length > 0) && (
                                <div className="text-xs text-text-secondary">
                                  {selectedVariantName ? selectedVariantName : null}
                                  {selectedVariantName && selectedModifierNames.length > 0
                                    ? ' • '
                                    : null}
                                  {selectedModifierNames.length > 0
                                    ? selectedModifierNames.join(', ')
                                    : null}
                                </div>
                              )}
                              {it.note ? (
                                <div className="text-xs text-text-secondary">“{it.note}”</div>
                              ) : null}
                              {isComplimentary && !isCanceled ? (
                                <div className="text-xs font-semibold text-text-secondary">
                                  {t('waiter.complimentary')}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="text-xs text-text-secondary">
                                {t(`statuses.${it.status}`)}
                              </div>
                              <div className="text-xs text-text-primary">
                                {formatCurrency(lineTotal, currency)}
                              </div>
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
