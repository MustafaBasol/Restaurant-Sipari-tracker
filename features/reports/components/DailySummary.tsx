import React from 'react';
import { useSummaryReport } from '../hooks/useDailySummary';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Input } from '../../../shared/components/ui/Input';
import { Card } from '../../../shared/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '../../../shared/components/ui/Table';
import { useAuth } from '../../auth/hooks/useAuth';
import { formatCurrency, formatDateTime } from '../../../shared/lib/utils';
import { KitchenStation, OrderStatus, PaymentMethod } from '../../../shared/types';
import { getOrders } from '../../orders/api';
import { getMenuItems } from '../../menu/api';

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <Card className="text-center">
    <p className="text-sm font-medium text-text-secondary">{title}</p>
    <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
  </Card>
);

const toDateString = (date: Date): string => date.toISOString().split('T')[0];

const DateRangePresets: React.FC<{ onSelect: (start: string, end: string) => void }> = ({
  onSelect,
}) => {
  const { t } = useLanguage();

  const presets = [
    { labelKey: 'reports.presets.today', value: 'today' },
    { labelKey: 'reports.presets.yesterday', value: 'yesterday' },
    { labelKey: 'reports.presets.thisWeek', value: 'thisWeek' },
    { labelKey: 'reports.presets.lastWeek', value: 'lastWeek' },
    { labelKey: 'reports.presets.last7days', value: 'last7days' },
    { labelKey: 'reports.presets.last30days', value: 'last30days' },
    { labelKey: 'reports.presets.thisMonth', value: 'thisMonth' },
    { labelKey: 'reports.presets.thisYear', value: 'thisYear' },
    { labelKey: 'reports.presets.lastYear', value: 'lastYear' },
  ];

  const startOfWeekMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Mon=0 ... Sun=6
    d.setDate(d.getDate() - diff);
    return d;
  };

  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'thisWeek':
        start = startOfWeekMonday(today);
        break;
      case 'lastWeek': {
        const thisWeekStart = startOfWeekMonday(today);
        start = new Date(thisWeekStart);
        start.setDate(thisWeekStart.getDate() - 7);
        end = new Date(thisWeekStart);
        end.setDate(thisWeekStart.getDate() - 1);
        break;
      }
      case 'last7days':
        start.setDate(today.getDate() - 6);
        break;
      case 'last30days':
        start.setDate(today.getDate() - 29);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'lastYear': {
        const lastYear = today.getFullYear() - 1;
        start = new Date(lastYear, 0, 1);
        end = new Date(lastYear, 11, 31);
        break;
      }
    }
    onSelect(toDateString(start), toDateString(end));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => handlePresetClick(p.value)}
          className="px-3 py-1 text-sm font-medium bg-gray-200 text-text-secondary rounded-full hover:bg-gray-300 transition-colors"
        >
          {t(p.labelKey)}
        </button>
      ))}
    </div>
  );
};

const DailySummary: React.FC = () => {
  const { startDate, endDate, setDateRange, data, isLoading, error } = useSummaryReport();
  const { t } = useLanguage();
  const { authState } = useAuth();
  const currency = authState?.tenant?.currency || 'USD';
  const timezone = authState?.tenant?.timezone || 'UTC';
  const tenantId = authState?.tenant?.id;

  const [extraLoading, setExtraLoading] = React.useState(false);
  const [hourlyOrders, setHourlyOrders] = React.useState<Array<{ hour: number; orders: number }>>(
    [],
  );
  const [stationItemCounts, setStationItemCounts] = React.useState<
    Array<{ station: KitchenStation; quantity: number }>
  >([]);

  const isSingleDay = startDate === endDate;

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH:
        return t('waiter.paymentMethods.cash');
      case PaymentMethod.CARD:
        return t('waiter.paymentMethods.card');
      case PaymentMethod.MEAL_CARD:
        return t('waiter.paymentMethods.mealCard');
      default:
        return String(method);
    }
  };

  const getStationLabel = (station: KitchenStation): string => {
    switch (station) {
      case KitchenStation.BAR:
        return t('kitchen.stations.bar');
      case KitchenStation.HOT:
        return t('kitchen.stations.hot');
      case KitchenStation.COLD:
        return t('kitchen.stations.cold');
      case KitchenStation.DESSERT:
        return t('kitchen.stations.dessert');
      default:
        return String(station);
    }
  };

  React.useEffect(() => {
    const run = async () => {
      if (!tenantId) return;
      setExtraLoading(true);
      try {
        const [orders, menuItems] = await Promise.all([
          getOrders(tenantId),
          getMenuItems(tenantId),
        ]);

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const closedInRange = orders.filter((o) => {
          if (o.status !== OrderStatus.CLOSED || !o.orderClosedAt) return false;
          const d = new Date(o.orderClosedAt as any);
          return d >= start && d <= end;
        });

        const hourly: Array<{ hour: number; orders: number }> = Array.from(
          { length: 24 },
          (_, h) => ({
            hour: h,
            orders: 0,
          }),
        );
        for (const o of closedInRange) {
          const d = new Date(o.orderClosedAt as any);
          const hour = d.getUTCHours();
          if (hourly[hour]) hourly[hour].orders += 1;
        }
        setHourlyOrders(hourly);

        const stationCounts: Record<string, number> = {};
        for (const o of closedInRange) {
          for (const item of o.items ?? []) {
            if (item.status === OrderStatus.CANCELED) continue;
            const mi = menuItems.find((m) => m.id === item.menuItemId);
            const station = mi?.station;
            if (!station) continue;
            stationCounts[station] = (stationCounts[station] ?? 0) + (item.quantity ?? 0);
          }
        }
        const stationRows = Object.entries(stationCounts)
          .map(([station, quantity]) => ({ station: station as KitchenStation, quantity }))
          .sort((a, b) => b.quantity - a.quantity);
        setStationItemCounts(stationRows);
      } catch (e) {
        console.error('Failed to fetch extended report data', e);
        setHourlyOrders([]);
        setStationItemCounts([]);
      } finally {
        setExtraLoading(false);
      }
    };

    run();
  }, [tenantId, startDate, endDate]);

  const formattedStartDate = formatDateTime(startDate + 'T00:00:00', timezone, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const formattedEndDate = formatDateTime(endDate + 'T00:00:00', timezone, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const title =
    startDate === endDate
      ? t('reports.title', `Daily Summary for {date}`).replace('{date}', formattedStartDate)
      : t('reports.titleDateRange', `Summary for {startDate} to {endDate}`)
          .replace('{startDate}', formattedStartDate)
          .replace('{endDate}', formattedEndDate);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>

      <Card>
        <div className="space-y-4">
          <DateRangePresets onSelect={setDateRange} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t('reports.startDate')}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setDateRange(e.target.value, endDate)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('reports.endDate')}</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setDateRange(startDate, e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : !data || data.totalOrders === 0 ? (
        <p className="text-text-secondary text-center py-10">{t('reports.noData')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              title={t('reports.totalRevenue')}
              value={formatCurrency(data.totalRevenue, currency)}
            />
            <StatCard title={t('reports.totalOrders')} value={data.totalOrders} />
            <StatCard
              title={t('reports.averageTicket')}
              value={formatCurrency(data.averageTicket, currency)}
            />
          </div>

          <Card>
            <h3 className="text-lg font-semibold mb-4">{t('reports.topItems')}</h3>
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('reports.headers.item')}</TableHeaderCell>
                <TableHeaderCell align="right">{t('reports.headers.quantity')}</TableHeaderCell>
                <TableHeaderCell align="right">{t('reports.headers.revenue')}</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {data.topItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {data.waiterStats.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">{t('reports.waiterPerformance')}</h3>
              <Table>
                <TableHeader>
                  <TableHeaderCell>{t('reports.headers.waiter')}</TableHeaderCell>
                  <TableHeaderCell align="right">{t('reports.headers.orders')}</TableHeaderCell>
                  <TableHeaderCell align="right">{t('reports.totalRevenue')}</TableHeaderCell>
                  <TableHeaderCell align="right">
                    {t('reports.headers.averageTicket')}
                  </TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {data.waiterStats.map((w) => (
                    <TableRow key={w.waiterId}>
                      <TableCell>{w.waiterName}</TableCell>
                      <TableCell align="right">{w.totalOrders}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(w.totalRevenue, currency)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(w.averageTicket, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {isSingleDay && data.endOfDay && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">{t('reports.endOfDayTitle')}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title={t('reports.grossSales')}
                  value={formatCurrency(data.endOfDay.grossSales, currency)}
                />
                <StatCard
                  title={t('reports.discountTotal')}
                  value={formatCurrency(data.endOfDay.discountTotal, currency)}
                />
                <StatCard
                  title={t('reports.complimentaryTotal')}
                  value={formatCurrency(data.endOfDay.complimentaryTotal, currency)}
                />
                <StatCard
                  title={t('reports.netSales')}
                  value={formatCurrency(data.endOfDay.netSales, currency)}
                />
              </div>

              {data.endOfDay.paymentsByMethod.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">
                    {t('reports.paymentsByMethod')}
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableHeaderCell>{t('reports.headers.method')}</TableHeaderCell>
                      <TableHeaderCell align="right">{t('reports.headers.amount')}</TableHeaderCell>
                    </TableHeader>
                    <TableBody>
                      {data.endOfDay.paymentsByMethod.map((p) => (
                        <TableRow key={p.method}>
                          <TableCell>{getPaymentMethodLabel(p.method)}</TableCell>
                          <TableCell align="right">{formatCurrency(p.amount, currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              <div className="mt-4 text-sm text-text-secondary">
                {t('reports.canceledItems')}: {data.endOfDay.canceledItemsCount} (
                {formatCurrency(data.endOfDay.canceledItemsAmount, currency)})
              </div>
            </Card>
          )}

          {!extraLoading && hourlyOrders.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">{t('reports.hourlyOrders')}</h3>
              <Table>
                <TableHeader>
                  <TableHeaderCell>{t('reports.headers.hour')}</TableHeaderCell>
                  <TableHeaderCell align="right">{t('reports.headers.orders')}</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {hourlyOrders
                    .filter((x) => x.orders > 0)
                    .map((x) => (
                      <TableRow key={x.hour}>
                        <TableCell>{String(x.hour).padStart(2, '0')}:00</TableCell>
                        <TableCell align="right">{x.orders}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {hourlyOrders.every((x) => x.orders === 0) && (
                <p className="text-text-secondary text-sm">{t('reports.noData')}</p>
              )}
            </Card>
          )}

          {!extraLoading && stationItemCounts.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">{t('reports.stationBreakdown')}</h3>
              <Table>
                <TableHeader>
                  <TableHeaderCell>{t('reports.headers.station')}</TableHeaderCell>
                  <TableHeaderCell align="right">{t('reports.headers.quantity')}</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {stationItemCounts.map((row) => (
                    <TableRow key={row.station}>
                      <TableCell>{getStationLabel(row.station)}</TableCell>
                      <TableCell align="right">{row.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DailySummary;
