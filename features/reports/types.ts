export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface SummaryReport {
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  topItems: TopItem[];
}
