import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useOrders } from '../hooks/useOrders';
import { useUsers } from '../../users/hooks/useUsers';
import { useTables } from '../../tables/hooks/useTables';
import { useMenu } from '../../menu/hooks/useMenu';
import { UserRole } from '../../../shared/types';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../../shared/components/ui/Table';
import { Badge } from '../../../shared/components/ui/Badge';
import { OrderStatus } from '../../../shared/types';

const OrderHistory: React.FC = () => {
    const { t } = useLanguage();
    const { orders, isLoading: isLoadingOrders } = useOrders();
    const { users, isLoading: isLoadingUsers } = useUsers();
    const { tables, isLoading: isLoadingTables } = useTables();
    const { menuItems } = useMenu();

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        waiterId: '',
        tableId: '',
    });

    const waiters = useMemo(() => users.filter(u => u.role === UserRole.WAITER), [users]);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        return orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            if (filters.startDate && orderDate < new Date(filters.startDate)) return false;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999); // Include the whole day
                if (orderDate > endDate) return false;
            }
            if (filters.waiterId && order.waiterId !== filters.waiterId) return false;
            if (filters.tableId && order.tableId !== filters.tableId) return false;
            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, filters]);
    
    const getOrderTotal = (orderId: string) => {
        const order = orders?.find(o => o.id === orderId);
        if (!order) return 0;
        return order.items.reduce((total, item) => {
            const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
            return total + (menuItem ? menuItem.price * item.quantity : 0);
        }, 0);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const statusVariantMap: Record<OrderStatus, 'blue' | 'orange' | 'green' | 'gray' | 'red'> = {
        [OrderStatus.NEW]: 'blue',
        [OrderStatus.IN_PREPARATION]: 'orange',
        [OrderStatus.READY]: 'green',
        [OrderStatus.SERVED]: 'gray',
        [OrderStatus.CANCELED]: 'red',
        [OrderStatus.CLOSED]: 'gray',
    };

    if (isLoadingOrders || isLoadingUsers || isLoadingTables) {
        return <div>Loading...</div>;
    }
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-light-bg rounded-xl">
                <div>
                    <label className="text-sm font-medium">{t('admin.history.startDate')}</label>
                    <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                </div>
                <div>
                    <label className="text-sm font-medium">{t('admin.history.endDate')}</label>
                    <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                </div>
                <div>
                    <label className="text-sm font-medium">{t('admin.history.waiter')}</label>
                    <Select name="waiterId" value={filters.waiterId} onChange={handleFilterChange}>
                        <option value="">{t('admin.history.allWaiters')}</option>
                        {waiters.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                    </Select>
                </div>
                 <div>
                    <label className="text-sm font-medium">{t('admin.history.table')}</label>
                    <Select name="tableId" value={filters.tableId} onChange={handleFilterChange}>
                        <option value="">{t('admin.history.allTables')}</option>
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                </div>
            </div>
            
            <Table>
                <TableHeader>
                    <TableHeaderCell>{t('admin.history.header.date')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.history.header.closedAt')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.history.header.table')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.history.header.waiter')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.history.header.total')}</TableHeaderCell>
                    <TableHeaderCell>{t('admin.history.header.status')}</TableHeaderCell>
                </TableHeader>
                <TableBody>
                    {filteredOrders.map(order => {
                        const table = tables.find(t => t.id === order.tableId);
                        return (
                             <TableRow key={order.id}>
                                <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                                <TableCell>{order.orderClosedAt ? new Date(order.orderClosedAt).toLocaleTimeString() : '-'}</TableCell>
                                <TableCell>{table?.name || 'N/A'}</TableCell>
                                <TableCell>{order.waiterName || 'N/A'}</TableCell>
                                <TableCell>${getOrderTotal(order.id).toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariantMap[order.status] || 'gray'}>
                                        {t(`statuses.${order.status}`)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default OrderHistory;