import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useMenu } from '../../menu/hooks/useMenu';
import { Order, OrderItem } from '../types';
import { DiscountType, OrderStatus } from '../../../shared/types';
import { TrashIcon } from '../../../shared/components/icons/Icons';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../../auth/hooks/useAuth';
import { formatCurrency } from '../../../shared/lib/utils';
import { hasPermission } from '../../../shared/lib/permissions';

export interface TempOrderItem {
  tempId: string;
  menuItemId: string;
  variantId?: string;
  modifierOptionIds?: string[];
  quantity: number;
  note: string;
}

interface CurrentOrderProps {
  order?: Order | null;
  tempItems: TempOrderItem[];
  onUpdateItem: (
    tempId: string,
    updates: Partial<Pick<TempOrderItem, 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>>,
  ) => void;
  onRemoveItem: (tempId: string) => void;
}

const statusColors: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: 'text-status-new',
  [OrderStatus.IN_PREPARATION]: 'text-status-prep',
  [OrderStatus.READY]: 'text-status-ready',
  [OrderStatus.SERVED]: 'text-status-served',
  [OrderStatus.CANCELED]: 'text-red-500',
  [OrderStatus.CLOSED]: 'text-status-closed',
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

const getVariantName = (menuItem: any, variantId?: string): string | undefined => {
  const variants = Array.isArray(menuItem?.variants) ? menuItem.variants : [];
  if (!variantId) return undefined;
  return variants.find((v: any) => v.id === variantId)?.name;
};

const getSelectedModifierOptionNames = (menuItem: any, optionIds: string[]): string[] => {
  const modifiers = Array.isArray(menuItem?.modifiers) ? menuItem.modifiers : [];
  if (modifiers.length === 0 || optionIds.length === 0) return [];
  const names: string[] = [];
  for (const mod of modifiers) {
    const options = Array.isArray(mod?.options) ? mod.options : [];
    for (const opt of options) {
      if (optionIds.includes(opt.id)) {
        names.push(opt.name);
      }
    }
  }
  return names;
};

const OrderItemRow: React.FC<{
  item: TempOrderItem | OrderItem;
  isTemp: boolean;
  onUpdate: (
    updates: Partial<Pick<TempOrderItem, 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>>,
  ) => void;
  onRemove: () => void;
}> = ({ item, isTemp, onUpdate, onRemove }) => {
  const { menuItems } = useMenu();
  const { t } = useLanguage();
  const { serveOrderItem, updateOrderItemStatus, setOrderItemComplimentary } = useOrders();
  const { authState } = useAuth();
  const currency = authState?.tenant?.currency || 'USD';
  const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);

  if (!menuItem) return null;

  const status = 'status' in item ? item.status : OrderStatus.NEW;
  const isComplimentary = 'isComplimentary' in item ? Boolean(item.isComplimentary) : false;
  const canToggleComplimentary = hasPermission(
    authState?.tenant,
    authState?.user?.role,
    'ORDER_COMPLIMENTARY',
  );
  const canCancelItem = hasPermission(
    authState?.tenant,
    authState?.user?.role,
    'ORDER_ITEM_CANCEL',
  );
  const canServeItem = hasPermission(authState?.tenant, authState?.user?.role, 'ORDER_ITEM_SERVE');

  const variants = Array.isArray((menuItem as any).variants) ? (menuItem as any).variants : [];
  const modifiers = Array.isArray((menuItem as any).modifiers) ? (menuItem as any).modifiers : [];
  const selectedVariantName = getVariantName(menuItem, (item as any).variantId);
  const selectedModifierNames = getSelectedModifierOptionNames(
    menuItem,
    ((item as any).modifierOptionIds ?? []) as string[],
  );
  const unitPrice = getUnitPrice(menuItem, {
    variantId: (item as any).variantId,
    modifierOptionIds: (item as any).modifierOptionIds,
  });

  const handleServeItem = () => {
    if ('orderId' in item && item.orderId && item.id) {
      serveOrderItem(item.orderId, item.id);
    }
  };

  const handleCancelItem = () => {
    if ('orderId' in item && item.orderId && item.id) {
      updateOrderItemStatus(item.orderId, item.id, OrderStatus.CANCELED);
    }
  };

  const handleToggleComplimentary = () => {
    if (!canToggleComplimentary) return;
    if ('orderId' in item && item.orderId && item.id) {
      setOrderItemComplimentary(item.orderId, item.id, !isComplimentary);
    }
  };
  const isCancelable =
    !isTemp &&
    canCancelItem &&
    (status === OrderStatus.NEW || status === OrderStatus.IN_PREPARATION);

  return (
    <div className={`py-3 ${status === OrderStatus.CANCELED ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`font-semibold ${status === OrderStatus.CANCELED ? 'line-through' : ''}`}>
            {menuItem.name}
          </p>
          {(selectedVariantName || selectedModifierNames.length > 0) && (
            <p className="text-xs text-text-secondary">
              {selectedVariantName ? selectedVariantName : null}
              {selectedVariantName && selectedModifierNames.length > 0 ? ' • ' : null}
              {selectedModifierNames.length > 0 ? selectedModifierNames.join(', ') : null}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-xs font-medium ${statusColors[status]}`}>
              {t(`statuses.${status}`)}
            </p>
            {!isTemp && isComplimentary && status !== OrderStatus.CANCELED && (
              <p className="text-xs font-semibold text-text-secondary">
                {t('waiter.complimentary')}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className={`font-semibold ${status === OrderStatus.CANCELED ? 'line-through' : ''}`}>
            {formatCurrency(
              isComplimentary && status !== OrderStatus.CANCELED ? 0 : unitPrice * item.quantity,
              currency,
            )}
          </p>
          {status === OrderStatus.READY && (
            <button
              onClick={handleServeItem}
              disabled={!canServeItem}
              className="px-3 py-1 bg-accent text-white text-xs font-semibold rounded-full hover:bg-accent-hover transition-colors"
            >
              {t('actions.markAsServed')}
            </button>
          )}
        </div>
      </div>
      {isTemp ? (
        <div className="mt-2 space-y-2">
          {variants.length > 0 && (
            <div>
              <label className="text-xs font-medium text-text-secondary">
                {t('waiter.variant')}
              </label>
              <Select
                value={(item as any).variantId || variants[0]?.id}
                onChange={(e) => onUpdate({ variantId: e.target.value })}
                className="py-2"
                aria-label={t('waiter.variant')}
              >
                {variants.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({formatCurrency(v.price, currency)})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {modifiers.length > 0 && (
            <div>
              <label className="text-xs font-medium text-text-secondary">
                {t('waiter.modifiers')}
              </label>
              <div className="space-y-2">
                {modifiers.map((m: any) => (
                  <div key={m.id} className="space-y-1">
                    <p className="text-xs text-text-secondary">{m.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(m.options) ? m.options : []).map((opt: any) => {
                        const current = ((item as any).modifierOptionIds ?? []) as string[];
                        const selected = current.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              const next = selected
                                ? current.filter((id) => id !== opt.id)
                                : [...current, opt.id];
                              onUpdate({ modifierOptionIds: next });
                            }}
                            className={
                              selected
                                ? 'px-2 py-1 rounded-full text-xs font-semibold bg-accent text-white'
                                : 'px-2 py-1 rounded-full text-xs font-semibold bg-card-bg text-text-secondary hover:bg-gray-200'
                            }
                          >
                            {opt.name}
                            {Number(opt.priceDelta) > 0
                              ? ` (+${formatCurrency(Number(opt.priceDelta), currency)})`
                              : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
              className="w-16 text-center py-1"
            />
            <Input
              type="text"
              value={item.note}
              onChange={(e) => onUpdate({ note: e.target.value })}
              placeholder={t('waiter.addNote')}
              className="flex-grow py-1 px-2 text-sm"
            />
            <button onClick={onRemove} className="text-red-500 hover:text-red-700 p-1">
              <TrashIcon />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-1">
          {item.note ? (
            <p className="text-xs text-text-secondary italic">"{item.note}"</p>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {canToggleComplimentary && status !== OrderStatus.CANCELED && (
              <button
                onClick={handleToggleComplimentary}
                className="px-2 py-0.5 bg-border-color text-text-secondary text-xs font-semibold rounded-full hover:opacity-90 transition-opacity"
              >
                {isComplimentary
                  ? t('actions.removeComplimentary')
                  : t('actions.makeComplimentary')}
              </button>
            )}
            {isCancelable && (
              <button
                onClick={handleCancelItem}
                className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full hover:bg-red-200 transition-colors"
              >
                {t('actions.cancelItem')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CurrentOrder: React.FC<CurrentOrderProps> = ({
  order,
  tempItems,
  onUpdateItem,
  onRemoveItem,
}) => {
  const { t } = useLanguage();
  const { menuItems } = useMenu();
  const { authState } = useAuth();
  const currency = authState?.tenant?.currency || 'USD';

  const allItems = [...(order?.items || []), ...tempItems];

  const subtotal = allItems
    .filter((item) => !('status' in item) || item.status !== OrderStatus.CANCELED)
    .reduce((acc, item) => {
      const isComplimentary = 'isComplimentary' in item ? Boolean(item.isComplimentary) : false;
      if (isComplimentary && (!('status' in item) || item.status !== OrderStatus.CANCELED))
        return acc;
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
      if (!menuItem) return acc;
      const unit = getUnitPrice(menuItem, {
        variantId: (item as any).variantId,
        modifierOptionIds: (item as any).modifierOptionIds,
      });
      return acc + unit * item.quantity;
    }, 0);

  const totalPrice = (() => {
    const discount = order?.discount;
    if (!discount || !Number.isFinite(discount.value) || discount.value <= 0) return subtotal;
    const discountAmount =
      discount.type === DiscountType.PERCENT
        ? (subtotal * Math.max(0, Math.min(100, discount.value))) / 100
        : Math.max(0, discount.value);
    const total = subtotal - Math.min(subtotal, discountAmount);
    return total > 0 ? total : 0;
  })();

  return (
    <div className="flex-1 p-4 flex flex-col">
      <h3 className="text-lg font-bold pb-2 border-b border-border-color">
        {t('waiter.currentOrder')}
      </h3>
      <div className="flex-1 divide-y divide-border-color overflow-y-auto -mx-4 px-4">
        {order?.items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            isTemp={false}
            onUpdate={() => {}}
            onRemove={() => {}}
          />
        ))}
        {tempItems.map((item) => (
          <OrderItemRow
            key={item.tempId}
            item={item}
            isTemp={true}
            onUpdate={(updates) => onUpdateItem(item.tempId, updates)}
            onRemove={() => onRemoveItem(item.tempId)}
          />
        ))}
        {allItems.length === 0 && (
          <p className="text-text-secondary text-center pt-10">Select items from the menu.</p>
        )}
      </div>
      <div className="mt-auto pt-4 flex justify-between items-center font-bold text-lg border-t border-border-color">
        <span>{t('waiter.total')}</span>
        <span>{formatCurrency(totalPrice, currency)}</span>
      </div>
    </div>
  );
};

export default CurrentOrder;
