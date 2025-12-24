import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import {
  BillingStatus,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  UserRole,
} from '../../../shared/types';
import { Table } from '../../tables/types';
import { useTables } from '../../tables/hooks/useTables';
import { MenuItem } from '../../menu/types';
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
import { formatCurrency, formatDateTime } from '../../../shared/lib/utils';
import { calcOrderPricing } from '../../../shared/lib/billing';
import { hasPermission } from '../../../shared/lib/permissions';
import { getCustomers } from '../../customers/api';
import { Customer } from '../../customers/types';
import {
  buildKitchenTicketText,
  buildReceiptText,
  isPrintableOrderItem,
} from '../../../shared/lib/printTemplates';
import { openPrintWindow } from '../../../shared/lib/print';
import { sendToPrintServer } from '../../../shared/lib/printClient';
import {
  getServiceOriginAllowlist,
  isTrustedServiceBaseUrl,
  shouldAllowInsecureServices,
} from '../../../shared/lib/urlSecurity';

interface OrderModalProps {
  table: Table;
  onClose: () => void;
}

type TempOrderItem = {
  tempId: string;
  menuItemId: string;
  variantId?: string;
  modifierOptionIds?: string[];
  quantity: number;
  note: string;
};

const makeTempId = () => `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const signatureForTempItem = (
  item: Pick<TempOrderItem, 'menuItemId' | 'variantId' | 'modifierOptionIds'>,
) => {
  const mods = [...(item.modifierOptionIds ?? [])].sort().join('|');
  return `${item.menuItemId}::${item.variantId ?? ''}::${mods}`;
};

const getUnitPrice = (
  menuItem: any,
  item: { variantId?: string; modifierOptionIds?: string[] },
) => {
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

const OrderModal: React.FC<OrderModalProps> = ({ table: initialTable, onClose }) => {
  const { authState } = useAuth();
  const {
    orders,
    createOrder,
    closeOrder,
    updateOrderNote,
    addOrderPayment,
    requestOrderBill,
    confirmOrderPayment,
    setOrderDiscount,
    moveOrderToTable,
    mergeOrderWithTable,
    unmergeOrderFromTable,
  } = useOrders();
  const { tables, updateTable } = useTables();
  const { menuItems } = useMenu();
  const { t } = useLanguage();

  const currency = authState?.tenant?.currency || 'USD';
  const timezone = authState?.tenant?.timezone || 'UTC';
  const taxRatePercent = authState?.tenant?.taxRatePercent ?? 0;
  const serviceChargePercent = authState?.tenant?.serviceChargePercent ?? 0;
  const roundingIncrement = authState?.tenant?.roundingIncrement ?? 0;

  const table = useMemo(
    () => tables.find((t) => t.id === initialTable.id) || initialTable,
    [tables, initialTable],
  );

  const [currentOrderItems, setCurrentOrderItems] = useState<TempOrderItem[]>([]);
  const [sendToKitchenError, setSendToKitchenError] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(table.customerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState(table.customerName || '');
  const [tableNote, setTableNote] = useState(table.note || '');
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    setCustomerId(table.customerId || '');
    setCustomerName(table.customerName || '');
    setTableNote(table.note || '');
    setCustomerSearch('');
  }, [table]);

  const canManageCustomers =
    authState?.user?.role === UserRole.ADMIN || authState?.user?.role === UserRole.WAITER;

  useEffect(() => {
    const tenantId = authState?.tenant?.id;
    if (!tenantId || !canManageCustomers) return;

    getCustomers(tenantId)
      .then((items) =>
        setCustomers(items.slice().sort((a, b) => a.fullName.localeCompare(b.fullName))),
      )
      .catch((e) => console.error('Failed to load customers', e));
  }, [authState?.tenant?.id, canManageCustomers]);

  const activeOrder = useMemo(
    () =>
      orders?.find(
        (o) =>
          (o.tableId === table.id || o.linkedTableIds?.includes(table.id)) &&
          o.status !== OrderStatus.CLOSED,
      ),
    [orders, table.id],
  );

  const mergedTableIds = useMemo(() => {
    return activeOrder?.linkedTableIds ?? [];
  }, [activeOrder]);

  const [moveToTableId, setMoveToTableId] = useState<string>('');
  const [mergeWithTableId, setMergeWithTableId] = useState<string>('');
  const [detachTableId, setDetachTableId] = useState<string>('');

  const tableHasActiveOrder = useMemo(() => {
    const isOrderForTable = (
      o: { tableId: string; linkedTableIds?: string[] },
      tId: string,
    ): boolean => o.tableId === tId || o.linkedTableIds?.includes(tId) === true;
    return (tableId: string): boolean =>
      Boolean(
        orders?.some(
          (o) =>
            o.status !== OrderStatus.CLOSED &&
            o.status !== OrderStatus.CANCELED &&
            isOrderForTable(o, tableId),
        ),
      );
  }, [orders]);

  useEffect(() => {
    if (activeOrder) {
      setOrderNote(activeOrder.note || '');
    }
  }, [activeOrder]);

  const handleTableInfoSave = () => {
    const normalizedCustomerId = customerId || undefined;
    const normalizedCustomerName = customerName.trim() || undefined;
    const normalizedNote = tableNote.trim() || undefined;

    if (
      table.customerId !== normalizedCustomerId ||
      table.customerName !== normalizedCustomerName ||
      table.note !== normalizedNote
    ) {
      updateTable({
        ...table,
        customerId: normalizedCustomerId,
        customerName: normalizedCustomerName,
        note: normalizedNote,
      });
    }
  };

  const handleCustomerSelect = (nextCustomerId: string) => {
    const normalizedId = nextCustomerId || '';
    const selected = normalizedId ? customers.find((c) => c.id === normalizedId) : undefined;
    const nextName = selected?.fullName || '';
    setCustomerId(normalizedId);
    setCustomerName(nextName);
    updateTable({
      ...table,
      customerId: normalizedId || undefined,
      customerName: nextName || undefined,
      note: tableNote.trim() || undefined,
    });
  };

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const haystack = `${c.fullName} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, customerSearch]);

  const handleClearCustomerSelection = () => {
    setCustomerId('');
    setCustomerName('');
    updateTable({
      ...table,
      customerId: undefined,
      customerName: undefined,
      note: tableNote.trim() || undefined,
    });
  };

  const handleOrderNoteSave = () => {
    if (activeOrder && activeOrder.note !== orderNote) {
      updateOrderNote(activeOrder.id, orderNote);
    }
  };

  const handleAddItem = (menuItem: MenuItem) => {
    const bundleItemIds = Array.isArray((menuItem as any).bundleItemIds)
      ? ((menuItem as any).bundleItemIds as string[])
      : undefined;
    const isBundle = (menuItem as any).bundleItemIds !== undefined;
    const bundleItems = bundleItemIds
      ? bundleItemIds.map((id) => menuItems.find((mi) => mi.id === id)).filter(Boolean)
      : [];
    const isOrderable =
      menuItem.isAvailable !== false &&
      (!isBundle ||
        (bundleItems.length > 0 && bundleItems.every((mi) => mi!.isAvailable !== false)));
    if (!isOrderable) return;

    const variants = Array.isArray((menuItem as any).variants) ? (menuItem as any).variants : [];
    const defaultVariantId = variants.length > 0 ? variants[0]?.id : undefined;
    const newEntry: TempOrderItem = {
      tempId: makeTempId(),
      menuItemId: menuItem.id,
      quantity: 1,
      note: '',
      variantId: defaultVariantId,
      modifierOptionIds: [],
    };

    setCurrentOrderItems((prevItems) => {
      const sig = signatureForTempItem(newEntry);
      const existingIndex = prevItems.findIndex((i) => signatureForTempItem(i) === sig);
      if (existingIndex >= 0) {
        return prevItems.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it,
        );
      }
      return [...prevItems, newEntry];
    });
  };

  const handleUpdateItem = (
    tempId: string,
    updates: Partial<Pick<TempOrderItem, 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>>,
  ) => {
    setCurrentOrderItems((prevItems) =>
      prevItems.map((item) => (item.tempId === tempId ? { ...item, ...updates } : item)),
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setCurrentOrderItems((prevItems) => prevItems.filter((item) => item.tempId !== tempId));
  };

  const handleSendToKitchen = async () => {
    if (currentOrderItems.length > 0 && authState?.user.id) {
      const payload = currentOrderItems.map(({ tempId: _tempId, ...rest }) => rest);
      setSendToKitchenError('');
      try {
        await createOrder(table.id, payload, authState.user.id, orderNote);
        setCurrentOrderItems([]);
      } catch {
        setSendToKitchenError(t('waiter.sendToKitchenFailedUnavailable'));
      }
    }
  };

  const handleCloseTable = async () => {
    if (!canCloseOrder) return;
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

  const billingStatus = activeOrder?.billingStatus ?? BillingStatus.OPEN;

  const orderPricing = useMemo(() => {
    if (!activeOrder) {
      return calcOrderPricing({
        subtotal: 0,
        taxRatePercent,
        serviceChargePercent,
        roundingIncrement,
      });
    }

    const subtotal = activeOrder.items
      .filter((i) => i.status !== OrderStatus.CANCELED)
      .reduce((sum, item) => {
        if (item.isComplimentary) return sum;
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        if (!menuItem) return sum;
        const unit = getUnitPrice(menuItem, {
          variantId: (item as any).variantId,
          modifierOptionIds: (item as any).modifierOptionIds,
        });
        return sum + unit * item.quantity;
      }, 0);

    return calcOrderPricing({
      subtotal,
      discount: activeOrder.discount,
      taxRatePercent,
      serviceChargePercent,
      roundingIncrement,
    });
  }, [activeOrder, menuItems, taxRatePercent, serviceChargePercent, roundingIncrement]);

  const orderTotal = orderPricing.total;

  const paidTotal = useMemo(() => {
    if (!activeOrder?.payments) return 0;
    return activeOrder.payments.reduce((sum, p) => sum + p.amount, 0);
  }, [activeOrder]);

  const remainingTotal = useMemo(() => {
    const remaining = orderTotal - paidTotal;
    return remaining > 0 ? remaining : 0;
  }, [orderTotal, paidTotal]);

  const printableItems = useMemo(() => {
    if (!activeOrder) return [];
    return activeOrder.items.filter((i) => isPrintableOrderItem(i));
  }, [activeOrder]);

  const buildReceiptLines = () => {
    if (!activeOrder) return null;

    const currencySymbol =
      currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '';
    const dateTimeText = formatDateTime(activeOrder.createdAt, timezone, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const items = printableItems.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);

      const details: string[] = [];
      const variants = Array.isArray((menuItem as any)?.variants) ? (menuItem as any).variants : [];
      const variantName = item.variantId
        ? variants.find((v: any) => v.id === item.variantId)?.name
        : undefined;
      if (variantName) details.push(`${t('waiter.variant')}: ${variantName}`);

      const selectedOptionIds = item.modifierOptionIds ?? [];
      const modifiers = Array.isArray((menuItem as any)?.modifiers)
        ? (menuItem as any).modifiers
        : [];
      if (selectedOptionIds.length > 0 && modifiers.length > 0) {
        const optionNames: string[] = [];
        for (const mod of modifiers) {
          const options = Array.isArray(mod?.options) ? mod.options : [];
          for (const opt of options) {
            if (selectedOptionIds.includes(opt.id)) optionNames.push(opt.name);
          }
        }
        if (optionNames.length > 0)
          details.push(`${t('waiter.modifiers')}: ${optionNames.join(', ')}`);
      }

      const unitPrice = menuItem
        ? getUnitPrice(menuItem, {
            variantId: item.variantId,
            modifierOptionIds: item.modifierOptionIds,
          })
        : 0;

      return {
        quantity: item.quantity,
        name: menuItem?.name || 'Unknown Item',
        note: item.note,
        isComplimentary: item.isComplimentary === true,
        unitPrice,
        lineTotal: item.isComplimentary === true ? 0 : unitPrice * item.quantity,
        details,
      };
    });

    const subtotal = items.reduce((sum, it) => {
      if (it.isComplimentary) return sum;
      return sum + (Number.isFinite(it.lineTotal as number) ? (it.lineTotal as number) : 0);
    }, 0);

    const pricing = calcOrderPricing({
      subtotal,
      discount: activeOrder.discount,
      taxRatePercent,
      serviceChargePercent,
      roundingIncrement,
    });

    const paid = paidTotal;
    const remaining = Math.max(0, pricing.total - paid);

    return buildReceiptText(
      {
        restaurantName: authState?.tenant?.name || 'Restaurant',
        tableName: table.name,
        dateTimeText,
        orderId: activeOrder.id,
        currencySymbol,
      },
      items,
      {
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        serviceChargeAmount: pricing.serviceChargeAmount,
        taxAmount: pricing.taxAmount,
        roundingAdjustment: pricing.roundingAdjustment,
        total: pricing.total,
        paid,
        remaining,
      },
    );
  };

  const buildKitchenLines = () => {
    if (!activeOrder) return null;

    const currencySymbol =
      currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '';
    const dateTimeText = formatDateTime(activeOrder.createdAt, timezone, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const items = printableItems
      .filter((i) => !i.isComplimentary)
      .map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);

        const details: string[] = [];
        const variants = Array.isArray((menuItem as any)?.variants)
          ? (menuItem as any).variants
          : [];
        const variantName = item.variantId
          ? variants.find((v: any) => v.id === item.variantId)?.name
          : undefined;
        if (variantName) details.push(`${t('waiter.variant')}: ${variantName}`);

        const selectedOptionIds = item.modifierOptionIds ?? [];
        const modifiers = Array.isArray((menuItem as any)?.modifiers)
          ? (menuItem as any).modifiers
          : [];
        if (selectedOptionIds.length > 0 && modifiers.length > 0) {
          const optionNames: string[] = [];
          for (const mod of modifiers) {
            const options = Array.isArray(mod?.options) ? mod.options : [];
            for (const opt of options) {
              if (selectedOptionIds.includes(opt.id)) optionNames.push(opt.name);
            }
          }
          if (optionNames.length > 0)
            details.push(`${t('waiter.modifiers')}: ${optionNames.join(', ')}`);
        }

        return {
          quantity: item.quantity,
          name: menuItem?.name || 'Unknown Item',
          note: item.note,
          details,
          currencySymbol,
        };
      });

    return buildKitchenTicketText(
      {
        restaurantName: authState?.tenant?.name || 'Restaurant',
        tableName: table.name,
        dateTimeText,
        orderId: activeOrder.id,
        currencySymbol,
      },
      items,
    );
  };

  const handlePrintReceipt = async () => {
    const text = buildReceiptLines();
    if (!text) return;

    const tenantPrintConfig = authState?.tenant?.printConfig;
    const tenantServerUrl =
      tenantPrintConfig?.mode === 'server' ? tenantPrintConfig.serverUrl?.trim() : undefined;

    const requireHttps = Boolean((import.meta as any).env?.PROD) && !shouldAllowInsecureServices();
    const allowedOrigins = getServiceOriginAllowlist();

    const tenantServerUrlOk =
      !!tenantServerUrl &&
      isTrustedServiceBaseUrl(tenantServerUrl, { allowedOrigins, requireHttps });
    const envServerUrl = import.meta.env.VITE_PRINT_SERVER_URL;
    const envServerUrlOk =
      !!envServerUrl && isTrustedServiceBaseUrl(envServerUrl, { allowedOrigins, requireHttps });

    const prefersServer = Boolean(tenantServerUrlOk || envServerUrlOk);
    if (prefersServer) {
      await sendToPrintServer('receipt', text, {
        serverUrl: tenantServerUrlOk ? tenantServerUrl : undefined,
      });
      return;
    }

    openPrintWindow(
      `<div class="ticket">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
      {
        title: 'Receipt',
      },
    );
  };

  const handlePrintKitchenTicket = async () => {
    const text = buildKitchenLines();
    if (!text) return;

    const tenantPrintConfig = authState?.tenant?.printConfig;
    const tenantServerUrl =
      tenantPrintConfig?.mode === 'server' ? tenantPrintConfig.serverUrl?.trim() : undefined;

    const requireHttps = Boolean((import.meta as any).env?.PROD) && !shouldAllowInsecureServices();
    const allowedOrigins = getServiceOriginAllowlist();

    const tenantServerUrlOk =
      !!tenantServerUrl &&
      isTrustedServiceBaseUrl(tenantServerUrl, { allowedOrigins, requireHttps });
    const envServerUrl = import.meta.env.VITE_PRINT_SERVER_URL;
    const envServerUrlOk =
      !!envServerUrl && isTrustedServiceBaseUrl(envServerUrl, { allowedOrigins, requireHttps });

    const prefersServer = Boolean(tenantServerUrlOk || envServerUrlOk);
    if (prefersServer) {
      await sendToPrintServer('kitchen', text, {
        serverUrl: tenantServerUrlOk ? tenantServerUrl : undefined,
      });
      return;
    }

    openPrintWindow(
      `<div class="ticket">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
      {
        title: 'Kitchen Ticket',
      },
    );
  };

  const isPaymentComplete = useMemo(() => {
    return remainingTotal <= 0.00001;
  }, [remainingTotal]);

  const isBillingPaid = billingStatus === BillingStatus.PAID;

  const canManagePayment = hasPermission(
    authState?.tenant,
    authState?.user?.role,
    'ORDER_PAYMENTS',
  );

  const canManageDiscount = hasPermission(
    authState?.tenant,
    authState?.user?.role,
    'ORDER_DISCOUNT',
  );

  const canCloseOrder = hasPermission(authState?.tenant, authState?.user?.role, 'ORDER_CLOSE');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const [splitPeopleCount, setSplitPeopleCount] = useState<number>(2);

  const [itemSplitQtyById, setItemSplitQtyById] = useState<Record<string, number>>({});

  useEffect(() => {
    // Reset selection when switching tables/orders
    setItemSplitQtyById({});
  }, [activeOrder?.id]);

  const billableOrderItems = useMemo(() => {
    if (!activeOrder) return [];
    return activeOrder.items
      .filter((i) => i.status !== OrderStatus.CANCELED)
      .filter((i) => i.isComplimentary !== true)
      .map((i) => {
        const menuItem = menuItems.find((mi) => mi.id === i.menuItemId);
        const unitPrice = menuItem
          ? getUnitPrice(menuItem, {
              variantId: i.variantId,
              modifierOptionIds: i.modifierOptionIds,
            })
          : 0;
        return {
          id: i.id,
          menuItemId: i.menuItemId,
          name: menuItem?.name ?? 'Unknown Item',
          quantity: i.quantity,
          unitPrice,
        };
      });
  }, [activeOrder, menuItems]);

  const fullBillableSubtotal = useMemo(() => {
    return billableOrderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  }, [billableOrderItems]);

  const selectedItemSplitSubtotal = useMemo(() => {
    return billableOrderItems.reduce((sum, it) => {
      const selectedQty = Math.max(0, Math.min(it.quantity, itemSplitQtyById[it.id] ?? 0));
      return sum + it.unitPrice * selectedQty;
    }, 0);
  }, [billableOrderItems, itemSplitQtyById]);

  const selectedItemSplitTotal = useMemo(() => {
    if (!activeOrder) return 0;
    const selectedSubtotal = selectedItemSplitSubtotal;
    if (selectedSubtotal <= 0) return 0;

    // First compute selected discounted subtotal (same logic as before), then scale the full grand total.
    const discount = activeOrder.discount;
    let selectedDiscountedSubtotal = selectedSubtotal;

    if (discount && Number.isFinite(discount.value) && discount.value > 0) {
      if (discount.type === DiscountType.PERCENT) {
        const pct = Math.max(0, Math.min(100, discount.value));
        selectedDiscountedSubtotal = Math.max(0, selectedSubtotal - (selectedSubtotal * pct) / 100);
      } else {
        // Amount discount is distributed proportionally across billable subtotal.
        const fullSubtotal = Math.max(0, fullBillableSubtotal);
        if (fullSubtotal > 0) {
          const ratio = Math.max(0, Math.min(1, selectedSubtotal / fullSubtotal));
          const fullDiscountAmount = Math.max(0, discount.value);
          const allocated = Math.min(selectedSubtotal, fullDiscountAmount * ratio);
          selectedDiscountedSubtotal = Math.max(0, selectedSubtotal - allocated);
        }
      }
    }

    const fullPricing = calcOrderPricing({
      subtotal: fullBillableSubtotal,
      discount: activeOrder.discount,
      taxRatePercent,
      serviceChargePercent,
      roundingIncrement,
    });

    const base = Math.max(0, fullPricing.discountedSubtotal);
    if (base <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, selectedDiscountedSubtotal / base));

    // Minimal approach: allocate the order grand total proportionally.
    return Math.max(0, fullPricing.total * ratio);
  }, [
    activeOrder,
    selectedItemSplitSubtotal,
    fullBillableSubtotal,
    taxRatePercent,
    serviceChargePercent,
    roundingIncrement,
  ]);

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

  const handleRequestBill = async () => {
    if (!activeOrder || !canManagePayment) return;
    await requestOrderBill(activeOrder.id);
  };

  const handleConfirmPayment = async () => {
    if (!activeOrder || !canManagePayment) return;
    await confirmOrderPayment(activeOrder.id);
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

  const canManageTables = hasPermission(authState?.tenant, authState?.user?.role, 'ORDER_TABLES');

  const canMoveOrder = Boolean(activeOrder) && mergedTableIds.length === 0;

  const moveCandidates = useMemo(
    () =>
      tables.filter((t) => t.id !== table.id && t.status === 'FREE' && !tableHasActiveOrder(t.id)),
    [tables, table.id, tableHasActiveOrder],
  );

  const mergeCandidates = useMemo(
    () =>
      tables.filter(
        (t) => t.id !== table.id && !mergedTableIds.includes(t.id) && !tableHasActiveOrder(t.id),
      ),
    [tables, table.id, mergedTableIds, tableHasActiveOrder],
  );

  const handleMoveOrder = async () => {
    if (!activeOrder || !canManageTables) return;
    if (!moveToTableId) return;
    await moveOrderToTable(activeOrder.id, table.id, moveToTableId);
    onClose();
  };

  const handleMergeOrder = async () => {
    if (!activeOrder || !canManageTables) return;
    if (!mergeWithTableId) return;
    await mergeOrderWithTable(activeOrder.id, mergeWithTableId);
    setMergeWithTableId('');
  };

  const handleDetachTable = async () => {
    if (!activeOrder || !canManageTables) return;
    if (!detachTableId) return;
    await unmergeOrderFromTable(activeOrder.id, detachTableId);
    setDetachTableId('');
  };

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
                  {canManageCustomers ? (
                    <div className="space-y-2">
                      <Input
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder={t('customers.searchPlaceholder')}
                        className="py-2"
                      />
                      <Select
                        value={customerId}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="py-2"
                      >
                        <option value="">{t('customers.none')}</option>
                        {filteredCustomers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName}
                          </option>
                        ))}
                      </Select>

                      <div className="flex gap-2">
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          onBlur={handleTableInfoSave}
                          placeholder={t('waiter.customerName')}
                          className="py-2"
                          disabled={Boolean(customerId)}
                        />
                        <Button
                          variant="secondary"
                          onClick={handleClearCustomerSelection}
                          className="px-3 py-2"
                        >
                          {t('customers.clearSelection')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onBlur={handleTableInfoSave}
                      placeholder={t('waiter.customerName')}
                      className="py-2"
                    />
                  )}
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
            {sendToKitchenError && (
              <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                {sendToKitchenError}
              </div>
            )}
            {currentOrderItems.length > 0 && canAddItems && (
              <Button onClick={handleSendToKitchen} className="w-full">
                {t('waiter.sendToKitchen')}
              </Button>
            )}
            {activeOrder && activeOrder.items.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border-color bg-white p-3">
                {canManageTables && activeOrder && (
                  <div className="rounded-lg border border-border-color p-2">
                    <p className="text-sm font-medium text-text-secondary">
                      {t('waiter.tableActions')}
                    </p>

                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-text-secondary">
                            {t('waiter.moveToTable')}
                          </label>
                          <Select
                            value={moveToTableId}
                            onChange={(e) => setMoveToTableId(e.target.value)}
                            className="py-2"
                            disabled={!canMoveOrder}
                          >
                            <option value="">{t('waiter.selectTable')}</option>
                            {moveCandidates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <Button
                          onClick={handleMoveOrder}
                          disabled={!canMoveOrder || !moveToTableId}
                        >
                          {t('waiter.move')}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-text-secondary">
                            {t('waiter.mergeWithTable')}
                          </label>
                          <Select
                            value={mergeWithTableId}
                            onChange={(e) => setMergeWithTableId(e.target.value)}
                            className="py-2"
                          >
                            <option value="">{t('waiter.selectTable')}</option>
                            {mergeCandidates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <Button onClick={handleMergeOrder} disabled={!mergeWithTableId}>
                          {t('waiter.merge')}
                        </Button>
                      </div>

                      {mergedTableIds.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-text-secondary">
                              {t('waiter.splitFromTable')}
                            </label>
                            <Select
                              value={detachTableId}
                              onChange={(e) => setDetachTableId(e.target.value)}
                              className="py-2"
                            >
                              <option value="">{t('waiter.selectTable')}</option>
                              {mergedTableIds.map((id) => {
                                const tObj = tables.find((x) => x.id === id);
                                return (
                                  <option key={id} value={id}>
                                    {tObj?.name ?? id}
                                  </option>
                                );
                              })}
                            </Select>
                          </div>
                          <Button
                            onClick={handleDetachTable}
                            disabled={!detachTableId}
                            variant="secondary"
                          >
                            {t('waiter.split')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-secondary">{t('waiter.payment')}</span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(orderTotal, authState?.tenant?.currency || 'USD')}
                  </span>
                </div>

                {(orderPricing.serviceChargeAmount > 0.00001 ||
                  orderPricing.taxAmount > 0.00001 ||
                  Math.abs(orderPricing.roundingAdjustment) > 0.00001) && (
                  <div className="space-y-1">
                    {orderPricing.serviceChargeAmount > 0.00001 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{t('waiter.serviceCharge')}</span>
                        <span className="font-medium text-text-primary">
                          {formatCurrency(
                            orderPricing.serviceChargeAmount,
                            authState?.tenant?.currency || 'USD',
                          )}
                        </span>
                      </div>
                    )}
                    {orderPricing.taxAmount > 0.00001 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{t('waiter.tax')}</span>
                        <span className="font-medium text-text-primary">
                          {formatCurrency(
                            orderPricing.taxAmount,
                            authState?.tenant?.currency || 'USD',
                          )}
                        </span>
                      </div>
                    )}
                    {Math.abs(orderPricing.roundingAdjustment) > 0.00001 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{t('waiter.rounding')}</span>
                        <span className="font-medium text-text-primary">
                          {formatCurrency(
                            orderPricing.roundingAdjustment,
                            authState?.tenant?.currency || 'USD',
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
                            : formatCurrency(
                                activeOrder.discount.value,
                                authState?.tenant?.currency || 'USD',
                              )
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
                        <option value={DiscountType.PERCENT}>
                          {t('waiter.discountTypes.percent')}
                        </option>
                        <option value={DiscountType.AMOUNT}>
                          {t('waiter.discountTypes.amount')}
                        </option>
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
                          {t('waiter.billingFlow')}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {billingStatus === BillingStatus.OPEN
                            ? t('waiter.billingStatuses.open')
                            : billingStatus === BillingStatus.BILL_REQUESTED
                              ? t('waiter.billingStatuses.billRequested')
                              : t('waiter.billingStatuses.paid')}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={handleRequestBill}
                          className="px-4"
                          variant="secondary"
                          disabled={!activeOrder || billingStatus === BillingStatus.PAID}
                        >
                          {t('actions.requestBill')}
                        </Button>
                        <Button
                          onClick={handleConfirmPayment}
                          className="px-4"
                          disabled={!activeOrder || !isPaymentComplete || isBillingPaid}
                        >
                          {t('actions.confirmPayment')}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-color p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text-secondary">
                          {t('waiter.itemSplitTitle')}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {formatCurrency(
                            selectedItemSplitTotal,
                            authState?.tenant?.currency || 'USD',
                          )}
                        </span>
                      </div>

                      {billableOrderItems.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {billableOrderItems.map((it) => {
                            const selectedQty = Math.max(
                              0,
                              Math.min(it.quantity, itemSplitQtyById[it.id] ?? 0),
                            );
                            return (
                              <div key={it.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm text-text-primary truncate">
                                    {it.name}
                                  </div>
                                  <div className="text-xs text-text-secondary">
                                    {formatCurrency(
                                      it.unitPrice,
                                      authState?.tenant?.currency || 'USD',
                                    )}{' '}
                                    × {it.quantity}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-text-secondary">
                                    {t('waiter.itemSplitQty')}
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    max={String(it.quantity)}
                                    value={String(selectedQty)}
                                    onChange={(e) => {
                                      const next = Number(e.target.value);
                                      const clamped = Number.isFinite(next)
                                        ? Math.max(0, Math.min(it.quantity, Math.floor(next)))
                                        : 0;
                                      setItemSplitQtyById((prev) => ({
                                        ...prev,
                                        [it.id]: clamped,
                                      }));
                                    }}
                                    className="py-1 w-20"
                                  />
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex gap-2 pt-1">
                            <Button
                              onClick={() => setPaymentAmount(String(selectedItemSplitTotal))}
                              className="px-3 py-2"
                              variant="secondary"
                              disabled={selectedItemSplitTotal <= 0}
                            >
                              {t('actions.fillSelected')}
                            </Button>
                            <Button
                              onClick={() => setItemSplitQtyById({})}
                              className="px-3 py-2"
                              variant="secondary"
                              disabled={Object.values(itemSplitQtyById).every((v) => !v)}
                            >
                              {t('actions.clearSelection')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-text-secondary">
                          {t('waiter.itemSplitEmpty')}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-border-color p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text-secondary">
                          {t('waiter.splitBill')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">
                            {t('waiter.splitPeopleCount')}
                          </span>
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
                disabled={!isPaymentComplete || !isBillingPaid || !canCloseOrder}
              >
                {t('actions.closeTable')}
              </Button>
            )}

            {activeOrder && printableItems.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="secondary"
                  onClick={handlePrintKitchenTicket}
                  className="w-full"
                  disabled={!activeOrder}
                >
                  {t('actions.printKitchenTicket')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrintReceipt}
                  className="w-full"
                  disabled={!activeOrder}
                >
                  {t('actions.printReceipt')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

    </Modal>
  );
};

export default OrderModal;
