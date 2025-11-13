import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Order, OrderStatus, UserRole } from '../../types';

const OrderHistory: React.FC = () => {
    const { orders, users, tables, menuItems, t } = useAppContext();
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        waiterId: '',
        tableId: '',
    });

    const waiters = useMemo(() => users.filter(u => u.role === UserRole.WAITER), [users]);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => {
                const orderDate = new Date(order.createdAt);
                if (filters.startDate && orderDate < new Date(filters.startDate)) {
                    return false;
                }
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    if (orderDate > endDate) return false;
                }
                if (filters.waiterId && order.waiterId !== filters.waiterId) {
                    return false;
                }
                if (filters.tableId && order.tableId !== filters.tableId) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, filters]);

    const getOrderTotal = (order: Order) => {
        return order.items.reduce((acc, item) => {
            const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
            return acc + (menuItem ? menuItem.price * item.quantity : 0);
        }, 0);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-light-bg rounded-xl">
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('startDate')}</label>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full mt-1 px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('endDate')}</label>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full mt-1 px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('waiter')}</label>
                    <select name="waiterId" value={filters.waiterId} onChange={handleFilterChange} className="w-full mt-1 px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
                        <option value="">{t('allWaiters')}</option>
                        {waiters.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('table')}</label>
                    <select name="tableId" value={filters.tableId} onChange={handleFilterChange} className="w-full mt-1 px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
                        <option value="">{t('allTables')}</option>
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('table')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('waiter')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('total')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('status')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border-color">
                        {filteredOrders.map(order => {
                            const table = tables.find(t => t.id === order.tableId);
                            return (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(order.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{table?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{order.waiterName || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">${getOrderTotal(order).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800`}>
                                            {t(order.status)}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderHistory;
