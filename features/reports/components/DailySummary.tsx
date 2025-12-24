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
  <Card className="text-center border border-border-color notched" style={notchedStyle}>
    <p className="text-sm font-medium text-text-secondary">{title}</p>
    <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-1 break-words">{value}</p>
  </Card>
);

const NOTCHED_CLIP_PATH =
  'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))';

const notchedStyle: React.CSSProperties = {
  clipPath: NOTCHED_CLIP_PATH,
};

type ReportSectionId =
  | 'kpis'
  | 'revenueTrend'
  | 'netRatio'
  | 'topItems'
  | 'waiters'
  | 'endOfDay'
  | 'hourly'
  | 'stations';

const REPORT_VISIBILITY_KEY = 'kitchorify-reports-section-visibility';

const useSectionVisibility = () => {
  const [hidden, setHidden] = React.useState<Record<ReportSectionId, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem(REPORT_VISIBILITY_KEY);
      if (!raw) return {} as any;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out: Record<ReportSectionId, boolean> = {
        kpis: false,
        revenueTrend: false,
        netRatio: false,
        topItems: false,
        waiters: false,
        endOfDay: false,
        hourly: false,
        stations: false,
      };
      (Object.keys(out) as ReportSectionId[]).forEach((k) => {
        out[k] = parsed?.[k] === true;
      });
      return out;
    } catch {
      return {
        kpis: false,
        revenueTrend: false,
        netRatio: false,
        topItems: false,
        waiters: false,
        endOfDay: false,
        hourly: false,
        stations: false,
      };
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(REPORT_VISIBILITY_KEY, JSON.stringify(hidden));
    } catch {
      // ignore
    }
  }, [hidden]);

  const setSectionHidden = (id: ReportSectionId, isHidden: boolean) => {
    setHidden((prev) => ({ ...prev, [id]: isHidden }));
  };

  return { hidden, setSectionHidden };
};

const SectionCard: React.FC<{
  id: ReportSectionId;
  title: string;
  hidden: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ title, hidden, onToggle, children }) => {
  return (
    <Card className="border border-border-color notched" style={notchedStyle}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onToggle}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          {hidden ? 'Göster' : 'Gizle'}
        </button>
      </div>

      {!hidden && <div className="mt-4">{children}</div>}
    </Card>
  );
};

const MiniBarChart: React.FC<{
  title?: string;
  points: Array<{ label: string; value: number }>;
  formatValue?: (n: number) => string;
}> = ({ title, points, formatValue }) => {
  const max = Math.max(0, ...points.map((p) => p.value));
  const safeMax = max > 0 ? max : 1;

  return (
    <div>
      {title && <div className="text-sm font-medium text-text-secondary mb-2">{title}</div>}
      <div className="grid grid-cols-12 gap-2 items-end h-28">
        {points.slice(-12).map((p) => {
          const h = Math.round((p.value / safeMax) * 100);
          return (
            <div key={p.label} className="col-span-3 sm:col-span-1 flex flex-col items-center">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full bg-accent/20 border border-border-color"
                  style={{ height: `${h}%` }}
                  title={`${p.label} • ${formatValue ? formatValue(p.value) : p.value}`}
                />
              </div>
              <div className="mt-1 text-[10px] text-text-secondary whitespace-nowrap">
                {p.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Gauge: React.FC<{ label: string; value: number; suffix?: string }> = ({
  label,
  value,
  suffix,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = clamped / 100;
  const dash = c * pct;
  const gap = c - dash;

  return (
    <div className="flex items-center gap-4">
      <svg width="110" height="110" viewBox="0 0 110 110" className="text-accent">
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          opacity="0.2"
        />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
        <text
          x="55"
          y="60"
          textAnchor="middle"
          className="fill-text-primary"
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {Math.round(clamped)}{suffix ?? '%'}
        </text>
      </svg>
      <div>
        <div className="text-sm font-medium text-text-secondary">{label}</div>
        <div className="text-xs text-text-secondary">0–100{suffix ?? '%'} aralığı</div>
      </div>
    </div>
  );
};

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
          className="px-3 py-1 text-sm font-medium bg-card-bg text-text-secondary rounded-full border border-border-color hover:bg-light-bg transition-colors"
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
  const [dailyRevenue, setDailyRevenue] = React.useState<Array<{ day: string; revenue: number }>>(
    [],
  );

  const { hidden, setSectionHidden } = useSectionVisibility();

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

        const dayMap = new Map<string, number>();
        for (const o of closedInRange) {
          const d = new Date(o.orderClosedAt as any);
          const key = d.toISOString().slice(0, 10);
          const revenue = Array.isArray(o.payments)
            ? o.payments.reduce((s: number, p: any) => s + (Number(p?.amount) || 0), 0)
            : 0;
          dayMap.set(key, (dayMap.get(key) ?? 0) + revenue);
        }
        const dayRows = Array.from(dayMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([day, revenue]) => ({ day, revenue }));
        setDailyRevenue(dayRows);

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
        setDailyRevenue([]);
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

      {isLoading && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
        </div>
      )}

      {error && <p className="text-center text-text-secondary">{error}</p>}

      {!isLoading && !error && (!data || data.totalOrders === 0) && (
        <p className="text-text-secondary text-center">{t('reports.noData')}</p>
      )}

      {(() => {
        const safe =
          data ??
          ({
            startDate,
            endDate,
            totalOrders: 0,
            totalRevenue: 0,
            averageTicket: 0,
            topItems: [],
            waiterStats: [],
            endOfDay: {
              grossSales: 0,
              discountTotal: 0,
              complimentaryTotal: 0,
              netSales: 0,
              paymentsByMethod: [],
              canceledItemsCount: 0,
              canceledItemsAmount: 0,
            },
          } as any);

        const netRatioPct =
          safe.endOfDay?.grossSales && safe.endOfDay.grossSales > 0
            ? (safe.endOfDay.netSales / safe.endOfDay.grossSales) * 100
            : 0;

        const revenuePoints =
          dailyRevenue.length > 0
            ? dailyRevenue.map((x) => ({ label: x.day.slice(5), value: x.revenue }))
            : Array.from({ length: 7 }, (_, i) => ({ label: `-${6 - i}`, value: 0 }));

        return (
          <>
            <SectionCard
              id="kpis"
              title={t('reports.titleDateRange').includes('{startDate}') ? t('reports.totalRevenue') : t('reports.totalRevenue')}
              hidden={hidden.kpis}
              onToggle={() => setSectionHidden('kpis', !hidden.kpis)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard title={t('reports.totalRevenue')} value={formatCurrency(safe.totalRevenue, currency)} />
                <StatCard title={t('reports.totalOrders')} value={safe.totalOrders} />
                <StatCard title={t('reports.averageTicket')} value={formatCurrency(safe.averageTicket, currency)} />
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                id="revenueTrend"
                title="Ciro Trend (Günlük)"
                hidden={hidden.revenueTrend}
                onToggle={() => setSectionHidden('revenueTrend', !hidden.revenueTrend)}
              >
                <MiniBarChart
                  points={revenuePoints}
                  formatValue={(n) => formatCurrency(n, currency)}
                />
                {extraLoading && (
                  <div className="mt-2 text-xs text-text-secondary">Grafik verileri hazırlanıyor…</div>
                )}
              </SectionCard>

              <SectionCard
                id="netRatio"
                title="Net Satış Oranı"
                hidden={hidden.netRatio}
                onToggle={() => setSectionHidden('netRatio', !hidden.netRatio)}
              >
                <Gauge label="Net / Brüt" value={netRatioPct} />
                <div className="mt-3 text-sm text-text-secondary">
                  Brüt: {formatCurrency(safe.endOfDay.grossSales, currency)} • Net:{' '}
                  {formatCurrency(safe.endOfDay.netSales, currency)}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              id="topItems"
              title={t('reports.topItems')}
              hidden={hidden.topItems}
              onToggle={() => setSectionHidden('topItems', !hidden.topItems)}
            >
              <Table>
                <TableHeader>
                  <TableHeaderCell>{t('reports.headers.item')}</TableHeaderCell>
                  <TableHeaderCell align="right">{t('reports.headers.quantity')}</TableHeaderCell>
                  <TableHeaderCell align="right">{t('reports.headers.revenue')}</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {(safe.topItems ?? []).length > 0 ? (
                    safe.topItems.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.revenue, currency)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-text-secondary">{t('reports.noData')}</TableCell>
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </SectionCard>

            <SectionCard
              id="waiters"
              title={t('reports.waiterPerformance')}
              hidden={hidden.waiters}
              onToggle={() => setSectionHidden('waiters', !hidden.waiters)}
            >
              {(safe.waiterStats ?? []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableHeaderCell>{t('reports.headers.waiter')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('reports.headers.orders')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('reports.totalRevenue')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('reports.headers.averageTicket')}</TableHeaderCell>
                  </TableHeader>
                  <TableBody>
                    {safe.waiterStats.map((w: any) => (
                      <TableRow key={w.waiterId}>
                        <TableCell>{w.waiterName}</TableCell>
                        <TableCell align="right">{w.totalOrders}</TableCell>
                        <TableCell align="right">{formatCurrency(w.totalRevenue, currency)}</TableCell>
                        <TableCell align="right">{formatCurrency(w.averageTicket, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-text-secondary">{t('reports.noData')}</div>
              )}
            </SectionCard>

            {isSingleDay && (
              <SectionCard
                id="endOfDay"
                title={t('reports.endOfDayTitle')}
                hidden={hidden.endOfDay}
                onToggle={() => setSectionHidden('endOfDay', !hidden.endOfDay)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                  <StatCard title={t('reports.grossSales')} value={formatCurrency(safe.endOfDay.grossSales, currency)} />
                  <StatCard title={t('reports.discountTotal')} value={formatCurrency(safe.endOfDay.discountTotal, currency)} />
                  <StatCard title={t('reports.complimentaryTotal')} value={formatCurrency(safe.endOfDay.complimentaryTotal, currency)} />
                  <StatCard title={t('reports.netSales')} value={formatCurrency(safe.endOfDay.netSales, currency)} />
                </div>

                {(safe.endOfDay.paymentsByMethod ?? []).length > 0 ? (
                  <>
                    <h4 className="text-sm font-semibold text-text-secondary mb-2">{t('reports.paymentsByMethod')}</h4>
                    <Table>
                      <TableHeader>
                        <TableHeaderCell>{t('reports.headers.method')}</TableHeaderCell>
                        <TableHeaderCell align="right">{t('reports.headers.amount')}</TableHeaderCell>
                      </TableHeader>
                      <TableBody>
                        {safe.endOfDay.paymentsByMethod.map((p: any) => (
                          <TableRow key={p.method}>
                            <TableCell>{getPaymentMethodLabel(p.method as PaymentMethod)}</TableCell>
                            <TableCell align="right">{formatCurrency(p.amount, currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-sm text-text-secondary">{t('reports.noData')}</div>
                )}

                <div className="mt-4 text-sm text-text-secondary">
                  {t('reports.canceledItems')}: {safe.endOfDay.canceledItemsCount} ({formatCurrency(
                    safe.endOfDay.canceledItemsAmount,
                    currency,
                  )})
                </div>
              </SectionCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                id="hourly"
                title={t('reports.hourlyOrders')}
                hidden={hidden.hourly}
                onToggle={() => setSectionHidden('hourly', !hidden.hourly)}
              >
                {!extraLoading && hourlyOrders.length > 0 ? (
                  <MiniBarChart
                    points={hourlyOrders.map((x) => ({
                      label: String(x.hour).padStart(2, '0'),
                      value: x.orders,
                    }))}
                  />
                ) : (
                  <div className="text-sm text-text-secondary">Grafik verisi yok.</div>
                )}
              </SectionCard>

              <SectionCard
                id="stations"
                title={t('reports.stationBreakdown')}
                hidden={hidden.stations}
                onToggle={() => setSectionHidden('stations', !hidden.stations)}
              >
                {!extraLoading && stationItemCounts.length > 0 ? (
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
                ) : (
                  <div className="text-sm text-text-secondary">{t('reports.noData')}</div>
                )}
              </SectionCard>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default DailySummary;
