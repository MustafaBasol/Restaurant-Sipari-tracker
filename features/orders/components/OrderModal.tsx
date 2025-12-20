import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { DiscountType, OrderStatus, PaymentMethod, UserRole } from '../../../shared/types';
import { Table } from '../../tables/types';
import { useTables } from '../../tables/hooks/useTables';
import { MenuItem } from '../../menu/types';
import { OrderItem } from '../types';
import { useOrders } from '../hooks/useOrders';
import MenuDisplay from '../../menu/components/MenuDisplay';
import CurrentOrder from './CurrentOrder';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { useAuth } from '../../auth/hooks/useAuth';
import { useMenu } from '../../menu/hooks/useMenu';
import { Select } from '../../../shared/components/ui/Select';
import { formatCurrency } from '../../../shared/lib/utils';

interface OrderModalProps {
  table: Table;
  onClose: () => void;
}

type TempOrderItem = Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>;

const OrderModal: React.FC<OrderModalProps> = ({ table: initialTable, onClose }) => {
  const { authState } = useAuth();
  const { orders, createOrder, closeOrder, updateOrderNote, addOrderPayment, setOrderDiscount } = useOrders();
  const { tables, updateTable } = useTables();
  const { menuItems } = useMenu();
  const { t } = useLanguage();

  const table = useMemo(
    () => tables.find((t) => t.id === initialTable.id) || initialTable,
    [tables, initialTable],
  );

  const [currentOrderItems, setCurrentOrderItems] = useState<TempOrderItem[]>([]);
  const [customerName, setCustomerName] = useState(table.customerName || '');
  const [tableNote, setTableNote] = useState(table.note || '');
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    setCustomerName(table.customerName || '');
    setTableNote(table.note || '');
  }, [table]);

  const activeOrder = useMemo(
    () => orders?.find((o) => o.tableId === table.id && o.status !== OrderStatus.CLOSED),
    [orders, table.id],
  );

  useEffect(() => {
    if (activeOrder) {
      setOrderNote(activeOrder.note || '');
    }
  }, [activeOrder]);

  const handleTableInfoSave = () => {
    if (table.customerName !== customerName || table.note !== tableNote) {
      updateTable({ ...table, customerName, note: tableNote });
    }
  };

  const handleOrderNoteSave = () => {
    if (activeOrder && activeOrder.note !== orderNote) {
      updateOrderNote(activeOrder.id, orderNote);
    }
  };

  const handleAddItem = (menuItem: MenuItem) => {
    setCurrentOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.menuItemId === menuItem.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.menuItemId === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prevItems, { menuItemId: menuItem.id, quantity: 1, note: '' }];
    });
  };

  const handleUpdateItem = (menuItemId: string, newQuantity: number, newNote: string) => {
    setCurrentOrderItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItemId === menuItemId ? { ...item, quantity: newQuantity, note: newNote } : item,
      ),
    );
  };

  const handleRemoveItem = (menuItemId: string) => {
    setCurrentOrderItems((prevItems) => prevItems.filter((item) => item.menuItemId !== menuItemId));
  };

  const handleSendToKitchen = async () => {
    if (currentOrderItems.length > 0 && authState?.user.id) {
      await createOrder(table.id, currentOrderItems, authState.user.id, orderNote);
      setCurrentOrderItems([]);
    }
  };

  const handleCloseTable = async () => {
    if (activeOrder) {
      await closeOrder(activeOrder.id);
      onClose();
    }
  };

  const canCloseTable =
    activeOrder &&
    activeOrder.items.length > 0 &&
    activeOrder.items.every(
      (i) => i.status === OrderStatus.SERVED || i.status === OrderStatus.CANCELED,
    );

  const orderTotal = useMemo(() => {
    if (!activeOrder) return 0;
    const subtotal = activeOrder.items
      .filter((i) => i.status !== OrderStatus.CANCELED)
      .reduce((sum, item) => {
        if (item.isComplimentary) return sum;
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return sum + (menuItem ? menuItem.price * item.quantity : 0);
      }, 0);

    const discount = activeOrder.discount;
    if (!discount || !Number.isFinite(discount.value) || discount.value <= 0) return subtotal;
    const discountAmount =
      discount.type === DiscountType.PERCENT
        ? (subtotal * Math.max(0, Math.min(100, discount.value))) / 100
        : Math.max(0, discount.value);
    const total = subtotal - Math.min(subtotal, discountAmount);
    return total > 0 ? total : 0;
  }, [activeOrder, menuItems]);

  const paidTotal = useMemo(() => {
    if (!activeOrder?.payments) return 0;
    return activeOrder.payments.reduce((sum, p) => sum + p.amount, 0);
  }, [activeOrder]);

  const remainingTotal = useMemo(() => {
    const remaining = orderTotal - paidTotal;
    return remaining > 0 ? remaining : 0;
  }, [orderTotal, paidTotal]);

  const isPaymentComplete = useMemo(() => {
    return remainingTotal <= 0.00001;
  }, [orderTotal, remainingTotal]);

  const canManagePayment =
    authState?.user?.role === UserRole.WAITER || authState?.user?.role === UserRole.ADMIN;

  const canManageDiscount = canManagePayment;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const [splitPeopleCount, setSplitPeopleCount] = useState<number>(2);

  const perPersonAmount = useMemo(() => {
    const count = Math.max(1, Math.floor(splitPeopleCount || 1));
    if (remainingTotal <= 0) return 0;
    return remainingTotal / count;
  }, [remainingTotal, splitPeopleCount]);

  const [discountType, setDiscountType] = useState<DiscountType>(DiscountType.PERCENT);
  const [discountValue, setDiscountValue] = useState<string>('');

  useEffect(() => {
    if (!activeOrder?.discount) return;
    setDiscountType(activeOrder.discount.type);
    setDiscountValue(String(activeOrder.discount.value));
  }, [activeOrder?.discount]);

  const handleAddPayment = async () => {
    if (!activeOrder || !canManagePayment) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await addOrderPayment(activeOrder.id, paymentMethod, amount);
    setPaymentAmount('');
  };

  const handleApplyDiscount = async () => {
    if (!activeOrder || !canManageDiscount) return;
    const value = Number(discountValue);
    if (!Number.isFinite(value) || Number.isNaN(value)) return;
    await setOrderDiscount(activeOrder.id, discountType, value);
  };

  const handleRemoveDiscount = async () => {
    if (!activeOrder || !canManageDiscount) return;
    await setOrderDiscount(activeOrder.id, discountType, 0);
    setDiscountValue('');
  };
  const canAddItems =
    !activeOrder ||
    (activeOrder.status !== OrderStatus.SERVED && activeOrder.status !== OrderStatus.CLOSED);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('waiter.orderModalTitle', `Table ${table.name}`).replace('{tableName}', table.name)}
    >
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 overflow-hidden h-full">
        <div className="lg:col-span-3 overflow-y-auto">
          {canAddItems && (
            <>
              <div className="p-4 border-b border-border-color grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    {t('waiter.customerName')}
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onBlur={handleTableInfoSave}
                    placeholder={t('waiter.customerName')}
                    className="py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    {t('waiter.tableNote')}
                  </label>
                  <Textarea
                    value={tableNote}
                    onChange={(e) => setTableNote(e.target.value)}
                    onBlur={handleTableInfoSave}
                    placeholder={t('waiter.tableNote')}
                    className="py-2 h-10 resize-none"
                    rows={1}
                  />
                </div>
              </div>
              <MenuDisplay onAddItem={handleAddItem} />
            </>
          )}
          {!canAddItems && (
            <div className="p-8 text-center text-text-secondary">
              This order is being served. New items cannot be added.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-card-bg flex flex-col border-l border-border-color overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <CurrentOrder
              order={activeOrder}
              tempItems={currentOrderItems}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
            />
            {canAddItems && (
              <div className="p-4">
                <label className="text-xs font-medium text-text-secondary">
                  {t('waiter.notes')}
                </label>
                <Textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  onBlur={handleOrderNoteSave}
                  placeholder={t('waiter.addNote')}
                  className="py-2"
                  rows={2}
                />
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border-color space-y-2">
            {currentOrderItems.length > 0 && canAddItems && (
              <Button onClick={handleSendToKitchen} className="w-full">
                {t('waiter.sendToKitchen')}
              </Button>
            )}
            {activeOrder && activeOrder.items.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border-color bg-white p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-secondary">{t('waiter.payment')}</span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(orderTotal, authState?.tenant?.currency || 'USD')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t('waiter.paid')}</span>
                  <span className="font-medium text-text-primary">
                    {formatCurrency(paidTotal, authState?.tenant?.currency || 'USD')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t('waiter.remaining')}</span>
                  <span className="font-bold text-text-primary">
                    {formatCurrency(remainingTotal, authState?.tenant?.currency || 'USD')}
                  </span>
                </div>

                {canManageDiscount && (
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{t('waiter.discount')}</span>
                      <span className="font-medium text-text-primary">
                        {activeOrder.discount && activeOrder.discount.value > 0
                          ? activeOrder.discount.type === DiscountType.PERCENT
                            ? `%${activeOrder.discount.value}`
                            : formatCurrency(activeOrder.discount.value, authState?.tenant?.currency || 'USD')
                          : '-'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                        className="py-2"
                        aria-label={t('waiter.discountType')}
                      >
                        <option value={DiscountType.PERCENT}>{t('waiter.discountTypes.percent')}</option>
                        <option value={DiscountType.AMOUNT}>{t('waiter.discountTypes.amount')}</option>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={t('waiter.discountValue')}
                        className="py-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleApplyDiscount} className="px-4">
                        {t('actions.applyDiscount')}
                      </Button>
                      {activeOrder.discount && activeOrder.discount.value > 0 && (
                        <Button onClick={handleRemoveDiscount} className="px-4" variant="secondary">
                          {t('actions.removeDiscount')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {canManagePayment && (
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="rounded-lg border border-border-color p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text-secondary">
                          {t('waiter.splitBill')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">{t('waiter.splitPeopleCount')}</span>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={String(splitPeopleCount)}
                            onChange={(e) => setSplitPeopleCount(Number(e.target.value))}
                            className="py-1 w-20"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-text-secondary">{t('waiter.perPerson')}</span>
                        <span className="font-semibold text-text-primary">
                          {formatCurrency(perPersonAmount, authState?.tenant?.currency || 'USD')}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() => setPaymentAmount(String(remainingTotal))}
                          className="px-3 py-2"
                          variant="secondary"
                          disabled={remainingTotal <= 0}
                        >
                          {t('waiter.fillRemaining')}
                        </Button>
                        <Button
                          onClick={() => setPaymentAmount(String(perPersonAmount))}
                          className="px-3 py-2"
                          variant="secondary"
                          disabled={perPersonAmount <= 0}
                        >
                          {t('waiter.fillPerPerson')}
                        </Button>
                      </div>
                    </div>

                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="py-2"
                      aria-label={t('waiter.paymentMethod')}
                    >
                      <option value={PaymentMethod.CASH}>{t('waiter.paymentMethods.cash')}</option>
                      <option value={PaymentMethod.CARD}>{t('waiter.paymentMethods.card')}</option>
                      <option value={PaymentMethod.MEAL_CARD}>
                        {t('waiter.paymentMethods.mealCard')}
                      </option>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={t('waiter.paymentAmount')}
                        className="py-2"
                      />
                      <Button onClick={handleAddPayment} className="px-4">
                        {t('actions.addPayment')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {canCloseTable && (
              <Button
                onClick={handleCloseTable}
                className="w-full bg-status-closed hover:opacity-90"
                disabled={!isPaymentComplete || !canManagePayment}
              >
                {t('actions.closeTable')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OrderModal;
