import { DiscountType } from '../types';

export type DiscountLike = { type: DiscountType; value: number } | undefined;

export type OrderPricing = {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalBeforeRounding: number;
  roundingAdjustment: number;
  total: number;
};

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const clampPercent = (v: unknown): number => {
  const n = toNumber(v);
  return Math.max(0, Math.min(100, n));
};

const decimalsFromIncrement = (increment: number): number => {
  const s = String(increment);
  if (!s.includes('.')) return 0;
  return s.split('.')[1]?.length ?? 0;
};

export const roundToIncrement = (
  amount: number,
  increment: number,
): { rounded: number; adjustment: number } => {
  const a = toNumber(amount);
  const inc = toNumber(increment);
  if (inc <= 0) return { rounded: a, adjustment: 0 };

  const roundedRaw = Math.round(a / inc) * inc;
  const decimals = decimalsFromIncrement(inc);
  const rounded = Number(roundedRaw.toFixed(decimals));
  const adjustment = Number((rounded - a).toFixed(decimals));
  return { rounded, adjustment };
};

export const calcDiscountAmount = (subtotal: number, discount?: DiscountLike): number => {
  if (!discount) return 0;
  const safeSubtotal = Math.max(0, toNumber(subtotal));
  if (safeSubtotal <= 0) return 0;

  const value = toNumber(discount.value);
  if (value <= 0) return 0;

  const amount =
    discount.type === DiscountType.PERCENT
      ? (safeSubtotal * clampPercent(value)) / 100
      : Math.max(0, value);

  return Math.min(safeSubtotal, amount);
};

export const calcOrderPricing = (params: {
  subtotal: number;
  discount?: DiscountLike;
  taxRatePercent?: number;
  serviceChargePercent?: number;
  roundingIncrement?: number;
}): OrderPricing => {
  const subtotal = Math.max(0, toNumber(params.subtotal));
  const discountAmount = calcDiscountAmount(subtotal, params.discount);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const servicePct = clampPercent(params.serviceChargePercent);
  const taxPct = clampPercent(params.taxRatePercent);

  const serviceChargeAmount = (discountedSubtotal * servicePct) / 100;
  const taxableBase = discountedSubtotal + serviceChargeAmount;
  const taxAmount = (taxableBase * taxPct) / 100;

  const totalBeforeRounding = taxableBase + taxAmount;
  const { rounded: total, adjustment: roundingAdjustment } = roundToIncrement(
    totalBeforeRounding,
    toNumber(params.roundingIncrement),
  );

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    serviceChargeAmount,
    taxAmount,
    totalBeforeRounding,
    roundingAdjustment,
    total,
  };
};
