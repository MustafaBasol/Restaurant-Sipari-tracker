import { PaymentMethod } from '../../shared/types';

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface WaiterStat {
  waiterId: string;
  waiterName: string;
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
}

export interface PaymentMethodTotal {
  method: PaymentMethod;
  amount: number;
}

export interface EndOfDaySummary {
  grossSales: number;
  discountTotal: number;
  complimentaryTotal: number;
  netSales: number;
  paymentsByMethod: PaymentMethodTotal[];
  canceledItemsCount: number;
  canceledItemsAmount: number;
}

export interface SummaryReport {
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  topItems: TopItem[];
  waiterStats: WaiterStat[];
  endOfDay: EndOfDaySummary;
}
