import { DiscountType, OrderStatus } from '../types';

type ReceiptItemLine = {
  quantity: number;
  name: string;
  note?: string;
  isComplimentary?: boolean;
  unitPrice?: number;
  lineTotal?: number;
  details?: string[];
};

type ReceiptTotals = {
  subtotal: number;
  discountAmount: number;
  total: number;
  paid: number;
  remaining: number;
};

type ReceiptMeta = {
  restaurantName: string;
  tableName: string;
  dateTimeText: string;
  orderId?: string;
  currencySymbol?: string;
};

const money = (value: number, currencySymbol?: string): string => {
  const v = Number.isFinite(value) ? value : 0;
  if (!currencySymbol) return v.toFixed(2);
  return `${currencySymbol}${v.toFixed(2)}`;
};

const padRight = (s: string, width: number) =>
  s.length >= width ? s : s + ' '.repeat(width - s.length);

const formatLine = (left: string, right: string, width = 32) => {
  const r = right.trim();
  const maxLeft = Math.max(0, width - r.length - 1);
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  return `${padRight(l, maxLeft)} ${r}`.trimEnd();
};

export const buildReceiptText = (
  meta: ReceiptMeta,
  items: ReceiptItemLine[],
  totals: ReceiptTotals,
) => {
  const lines: string[] = [];
  lines.push(meta.restaurantName);
  lines.push(`Masa: ${meta.tableName}`);
  lines.push(meta.dateTimeText);
  if (meta.orderId) lines.push(`Sipariş: ${meta.orderId}`);
  lines.push('');
  lines.push('--- Ürünler ---');

  for (const it of items) {
    const qtyPrefix = `${it.quantity}x `;
    lines.push(`${qtyPrefix}${it.name}${it.isComplimentary ? ' (İkram)' : ''}`);
    if (Array.isArray(it.details)) {
      for (const d of it.details) lines.push(`  - ${d}`);
    }
    if (it.note) lines.push(`  Not: ${it.note}`);
    if (!it.isComplimentary && typeof it.lineTotal === 'number') {
      lines.push(`  ${money(it.lineTotal, meta.currencySymbol)}`);
    }
    lines.push('');
  }

  lines.push('--- Toplam ---');
  lines.push(formatLine('Ara toplam', money(totals.subtotal, meta.currencySymbol)));
  if (totals.discountAmount > 0) {
    lines.push(formatLine('İndirim', `-${money(totals.discountAmount, meta.currencySymbol)}`));
  }
  lines.push(formatLine('Genel toplam', money(totals.total, meta.currencySymbol)));
  lines.push(formatLine('Ödenen', money(totals.paid, meta.currencySymbol)));
  lines.push(formatLine('Kalan', money(totals.remaining, meta.currencySymbol)));

  lines.push('');
  lines.push('Teşekkürler!');

  return lines.join('\n');
};

export const buildKitchenTicketText = (meta: ReceiptMeta, items: ReceiptItemLine[]) => {
  const lines: string[] = [];
  lines.push(meta.restaurantName);
  lines.push(`Masa: ${meta.tableName}`);
  lines.push(meta.dateTimeText);
  if (meta.orderId) lines.push(`Sipariş: ${meta.orderId}`);
  lines.push('');
  lines.push('--- Mutfak ---');

  for (const it of items) {
    lines.push(`${it.quantity}x ${it.name}`);
    if (Array.isArray(it.details)) {
      for (const d of it.details) lines.push(`  - ${d}`);
    }
    if (it.note) lines.push(`  Not: ${it.note}`);
    lines.push('');
  }

  return lines.join('\n');
};

export const calcDiscountAmount = (
  subtotal: number,
  discount?: { type: DiscountType; value: number },
) => {
  if (!discount) return 0;
  const value = Number(discount.value);
  if (!Number.isFinite(value) || value <= 0) return 0;

  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  if (safeSubtotal <= 0) return 0;

  const amount =
    discount.type === DiscountType.PERCENT
      ? (safeSubtotal * Math.max(0, Math.min(100, value))) / 100
      : Math.max(0, value);

  return Math.min(safeSubtotal, amount);
};

export const isPrintableOrderItem = (item: { status: OrderStatus; isComplimentary?: boolean }) => {
  return item.status !== OrderStatus.CANCELED;
};
