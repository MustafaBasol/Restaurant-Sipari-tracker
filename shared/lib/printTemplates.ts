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
  serviceChargeAmount?: number;
  taxAmount?: number;
  roundingAdjustment?: number;
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

type PrintLabels = {
  tableLabel: string;
  orderLabel: string;
  itemsHeader: string;
  totalsHeader: string;
  kitchenHeader: string;
  noteLabel: string;
  complimentarySuffix: string;
  subtotalLabel: string;
  discountLabel: string;
  serviceLabel: string;
  taxLabel: string;
  roundingLabel: string;
  grandTotalLabel: string;
  paidLabel: string;
  remainingLabel: string;
  thanksFooter: string;
};

const DEFAULT_LABELS_TR: PrintLabels = {
  tableLabel: 'Masa',
  orderLabel: 'Sipariş',
  itemsHeader: 'Ürünler',
  totalsHeader: 'Toplam',
  kitchenHeader: 'Mutfak',
  noteLabel: 'Not',
  complimentarySuffix: ' (İkram)',
  subtotalLabel: 'Ara toplam',
  discountLabel: 'İndirim',
  serviceLabel: 'Servis',
  taxLabel: 'KDV/Vergi',
  roundingLabel: 'Yuvarlama',
  grandTotalLabel: 'Genel toplam',
  paidLabel: 'Ödenen',
  remainingLabel: 'Kalan',
  thanksFooter: 'Teşekkürler!',
};

const resolveLabels = (labels?: Partial<PrintLabels>): PrintLabels => {
  if (!labels) return DEFAULT_LABELS_TR;
  return { ...DEFAULT_LABELS_TR, ...labels };
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
  labels?: Partial<PrintLabels>,
) => {
  const l = resolveLabels(labels);
  const lines: string[] = [];
  lines.push(meta.restaurantName);
  lines.push(`${l.tableLabel}: ${meta.tableName}`);
  lines.push(meta.dateTimeText);
  if (meta.orderId) lines.push(`${l.orderLabel}: ${meta.orderId}`);
  lines.push('');
  lines.push(`--- ${l.itemsHeader} ---`);

  for (const it of items) {
    const qtyPrefix = `${it.quantity}x `;
    lines.push(`${qtyPrefix}${it.name}${it.isComplimentary ? l.complimentarySuffix : ''}`);
    if (Array.isArray(it.details)) {
      for (const d of it.details) lines.push(`  - ${d}`);
    }
    if (it.note) lines.push(`  ${l.noteLabel}: ${it.note}`);
    if (!it.isComplimentary && typeof it.lineTotal === 'number') {
      lines.push(`  ${money(it.lineTotal, meta.currencySymbol)}`);
    }
    lines.push('');
  }

  lines.push(`--- ${l.totalsHeader} ---`);
  lines.push(formatLine(l.subtotalLabel, money(totals.subtotal, meta.currencySymbol)));
  if (totals.discountAmount > 0) {
    lines.push(formatLine(l.discountLabel, `-${money(totals.discountAmount, meta.currencySymbol)}`));
  }
  const serviceChargeAmount = Number.isFinite(totals.serviceChargeAmount)
    ? (totals.serviceChargeAmount as number)
    : 0;
  if (serviceChargeAmount > 0.00001) {
    lines.push(formatLine(l.serviceLabel, money(serviceChargeAmount, meta.currencySymbol)));
  }

  const taxAmount = Number.isFinite(totals.taxAmount) ? (totals.taxAmount as number) : 0;
  if (taxAmount > 0.00001) {
    lines.push(formatLine(l.taxLabel, money(taxAmount, meta.currencySymbol)));
  }

  const roundingAdjustment = Number.isFinite(totals.roundingAdjustment)
    ? (totals.roundingAdjustment as number)
    : 0;
  if (Math.abs(roundingAdjustment) > 0.00001) {
    const sign = roundingAdjustment > 0 ? '+' : '';
    lines.push(formatLine(l.roundingLabel, `${sign}${money(roundingAdjustment, meta.currencySymbol)}`));
  }
  lines.push(formatLine(l.grandTotalLabel, money(totals.total, meta.currencySymbol)));
  lines.push(formatLine(l.paidLabel, money(totals.paid, meta.currencySymbol)));
  lines.push(formatLine(l.remainingLabel, money(totals.remaining, meta.currencySymbol)));

  lines.push('');
  lines.push(l.thanksFooter);

  return lines.join('\n');
};

export const buildKitchenTicketText = (
  meta: ReceiptMeta,
  items: ReceiptItemLine[],
  labels?: Partial<PrintLabels>,
) => {
  const l = resolveLabels(labels);
  const lines: string[] = [];
  lines.push(meta.restaurantName);
  lines.push(`${l.tableLabel}: ${meta.tableName}`);
  lines.push(meta.dateTimeText);
  if (meta.orderId) lines.push(`${l.orderLabel}: ${meta.orderId}`);
  lines.push('');
  lines.push(`--- ${l.kitchenHeader} ---`);

  for (const it of items) {
    lines.push(`${it.quantity}x ${it.name}`);
    if (Array.isArray(it.details)) {
      for (const d of it.details) lines.push(`  - ${d}`);
    }
    if (it.note) lines.push(`  ${l.noteLabel}: ${it.note}`);
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
