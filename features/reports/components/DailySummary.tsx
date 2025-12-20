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
    { labelKey: 'reports.presets.last7days', value: 'last7days' },
    { labelKey: 'reports.presets.last30days', value: 'last30days' },
    { labelKey: 'reports.presets.thisMonth', value: 'thisMonth' },
    { labelKey: 'reports.presets.thisYear', value: 'thisYear' },
    { labelKey: 'reports.presets.lastYear', value: 'lastYear' },
  ];

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
        </>
      )}
    </div>
  );
};

export default DailySummary;
