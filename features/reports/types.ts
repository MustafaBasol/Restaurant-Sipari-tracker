export interface TopItem {
    name: string;
    quantity: number;
    revenue: number;
}

export interface DailySummaryReport {
    date: string;
    totalOrders: number;
    totalRevenue: number;
    averageTicket: number;
    topItems: TopItem[];
}