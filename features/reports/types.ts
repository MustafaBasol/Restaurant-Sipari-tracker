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

export interface SummaryReport {
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  topItems: TopItem[];
  waiterStats: WaiterStat[];
}
