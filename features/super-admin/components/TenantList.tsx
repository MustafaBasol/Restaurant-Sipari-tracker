import React, { useState, useMemo } from 'react';
import { useTenants } from '../hooks/useTenants';
import { Tenant } from '../types';
import { User } from '../../users/types';
import { SubscriptionStatus } from '../../../shared/types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import UserListModal from './UserListModal';
import { Badge } from '../../../shared/components/ui/Badge';
import { Select } from '../../../shared/components/ui/Select';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../../shared/components/ui/Table';

type SortKey = 'name' | 'createdAt' | 'subscriptionStatus';

const TenantList: React.FC = () => {
    const { tenants, users, updateTenantSubscription } = useTenants();
    const { t } = useLanguage();
    const [viewingUsersFor, setViewingUsersFor] = useState<Tenant | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortAsc, setSortAsc] = useState(false);

    const sortedTenants = useMemo(() => {
        // FIX: Refactored sorting logic to handle date comparison correctly and avoid type errors.
        return [...tenants].sort((a, b) => {
            if (sortKey === 'createdAt') {
                const timeA = new Date(a.createdAt).getTime();
                const timeB = new Date(b.createdAt).getTime();
                return sortAsc ? timeA - timeB : timeB - timeA;
            }
            const compareA = a[sortKey];
            const compareB = b[sortKey];
            if (compareA < compareB) return sortAsc ? -1 : 1;
            if (compareA > compareB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [tenants, sortKey, sortAsc]);
    
    const handleSort = (key: SortKey) => {
        if (key === sortKey) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(true); }
    };

    const handleSubscriptionChange = (tenantId: string, status: SubscriptionStatus) => {
        updateTenantSubscription(tenantId, status);
    };
    
    const getTenantUsers = (tenantId: string): User[] => users.filter(user => user.tenantId === tenantId);

    const statusVariantMap: Record<SubscriptionStatus, 'green' | 'yellow' | 'red'> = {
        [SubscriptionStatus.ACTIVE]: 'green',
        [SubscriptionStatus.TRIAL]: 'yellow',
        [SubscriptionStatus.CANCELED]: 'red',
    };

    const SortableHeader: React.FC<{ sortKey: SortKey, labelKey: string }> = ({ sortKey: key, labelKey }) => (
        <th onClick={() => handleSort(key)} className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer">
            {t(labelKey)} {sortKey === key && (sortAsc ? '▲' : '▼')}
        </th>
    );

    return (
        <>
            <Table>
                <thead className="bg-gray-50">
                    <tr>
                        <SortableHeader sortKey="name" labelKey='general.name' />
                        <SortableHeader sortKey="createdAt" labelKey='superAdmin.registeredOn' />
                        <SortableHeader sortKey="subscriptionStatus" labelKey='superAdmin.subscription' />
                        <TableHeaderCell>{t('general.role', 'Users')}</TableHeaderCell>
                        <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
                    </tr>
                </thead>
                <TableBody>
                    {sortedTenants.map(tenant => (
                        <TableRow key={tenant.id}>
                            <TableCell>{tenant.name}</TableCell>
                            <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge variant={statusVariantMap[tenant.subscriptionStatus]}>
                                    {t(`statuses.${tenant.subscriptionStatus === SubscriptionStatus.CANCELED ? 'CANCELED_SUB' : tenant.subscriptionStatus}`)}
                                </Badge>
                            </TableCell>
                            <TableCell>{getTenantUsers(tenant.id).length}</TableCell>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                 <Select 
                                    value={tenant.subscriptionStatus}
                                    onChange={(e) => handleSubscriptionChange(tenant.id, e.target.value as SubscriptionStatus)}
                                    className="p-1 text-xs w-auto inline-block"
                                >
                                    <option value={SubscriptionStatus.TRIAL}>{t('statuses.TRIAL')}</option>
                                    <option value={SubscriptionStatus.ACTIVE}>{t('statuses.ACTIVE')}</option>
                                    <option value={SubscriptionStatus.CANCELED}>{t('statuses.CANCELED_SUB')}</option>
                                </Select>
                                <button onClick={() => setViewingUsersFor(tenant)} className="text-accent hover:text-accent-hover">{t('superAdmin.viewUsers')}</button>
                            </td>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {viewingUsersFor && (
                <UserListModal 
                    tenant={viewingUsersFor} 
                    users={getTenantUsers(viewingUsersFor.id)}
                    onClose={() => setViewingUsersFor(null)} 
                />
            )}
        </>
    );
};

export default TenantList;