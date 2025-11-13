import React from 'react';
import { useDailySummary } from '../hooks/useDailySummary';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Input } from '../../../shared/components/ui/Input';
import { Card } from '../../../shared/components/ui/Card';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '../../../shared/components/ui/Table';

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <Card className="text-center">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
    </Card>
);

const DailySummary: React.FC = () => {
    const { date, setDate, data, isLoading, error } = useDailySummary();
    const { t } = useLanguage();

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-text-primary">
                {t('reports.title', `Daily Summary for {date}`).replace('{date}', formattedDate)}
            </h2>
            
            <div>
                <label className="text-sm font-medium">{t('reports.selectDate')}</label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="max-w-xs mt-1"
                />
            </div>

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
                        <StatCard title={t('reports.totalRevenue')} value={`$${data.totalRevenue.toFixed(2)}`} />
                        <StatCard title={t('reports.totalOrders')} value={data.totalOrders} />
                        <StatCard title={t('reports.averageTicket')} value={`$${data.averageTicket.toFixed(2)}`} />
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
                                        <TableCell align="right">${item.revenue.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}
        </div>
    );
};

export default DailySummary;