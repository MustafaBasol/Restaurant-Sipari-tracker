import React, { useState, useMemo, useEffect } from 'react';
import { useTenants } from '../hooks/useTenants';
// FIX: Changed import from `auth/types` to `shared/types` to resolve module export error and use the correct, complete type definition.
import { Tenant } from '../../../shared/types';
import { User } from '../../users/types';
import { SubscriptionStatus, UserRole } from '../../../shared/types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import TenantDetailModal from './UserListModal';
import { Badge } from '../../../shared/components/ui/Badge';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../../shared/components/ui/Table';
import { formatDateTime, getTrialDaysLeft } from '../../../shared/lib/utils';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

type SortKey = 'name' | 'createdAt' | 'subscriptionStatus';
type StatusFilter = 'ALL' | SubscriptionStatus;


const TenantList: React.FC = () => {
    const { tenants, users, updateTenantSubscription } = useTenants();
    const { t } = useLanguage();
    const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortAsc, setSortAsc] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    useEffect(() => {
        if (viewingTenant) {
            // Find the latest version of the tenant from the updated list
            const updatedTenantInList = tenants.find(t => t.id === viewingTenant.id);
            if (updatedTenantInList) {
                // If the tenant in the modal state is different from the one in the list, update it.
                // This keeps the modal's data in sync after a mutation.
                if (JSON.stringify(viewingTenant) !== JSON.stringify(updatedTenantInList)) {
                    setViewingTenant(updatedTenantInList);
                }
            }
        }
    }, [tenants, viewingTenant]);

    const tenantsWithDetails = useMemo(() => {
        return tenants.map(tenant => {
            const admin = users.find(u => u.tenantId === tenant.id && u.role === UserRole.ADMIN);
            const userCount = users.filter(u => u.tenantId === tenant.id).length;
            return {
                ...tenant,
                adminEmail: admin?.email,
                userCount,
            };
        });
    }, [tenants, users]);


    const filteredAndSortedTenants = useMemo(() => {
        let filtered = tenantsWithDetails;

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(t => t.subscriptionStatus === statusFilter);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(lowercasedQuery) ||
                (t.adminEmail && t.adminEmail.toLowerCase().includes(lowercasedQuery))
            );
        }

        return [...filtered].sort((a, b) => {
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
    }, [tenantsWithDetails, sortKey, sortAsc, searchQuery, statusFilter]);
    
    const handleSort = (key: SortKey) => {
        if (key === sortKey) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(true); }
    };

    const statusVariantMap: Record<SubscriptionStatus, 'green' | 'yellow' | 'red'> = {
        [SubscriptionStatus.ACTIVE]: 'green',
        [SubscriptionStatus.TRIAL]: 'yellow',
        [SubscriptionStatus.CANCELED]: 'red',
        [SubscriptionStatus.EXPIRED]: 'red',
    };

    const SortableHeader: React.FC<{ sortKey: SortKey, labelKey: string }> = ({ sortKey: key, labelKey }) => (
        <th onClick={() => handleSort(key)} className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer">
            {t(labelKey)} {sortKey === key && (sortAsc ? '▲' : '▼')}
        </th>
    );
    
    const filterOptions: {labelKey: string, value: StatusFilter}[] = [
        { labelKey: 'superAdmin.filters.all', value: 'ALL' },
        { labelKey: 'statuses.TRIAL', value: SubscriptionStatus.TRIAL },
        { labelKey: 'statuses.ACTIVE', value: SubscriptionStatus.ACTIVE },
        { labelKey: 'statuses.EXPIRED', value: SubscriptionStatus.EXPIRED },
        { labelKey: 'statuses.CANCELED_SUB', value: SubscriptionStatus.CANCELED },
    ];

    return (
        <>
            <div className="mb-4 space-y-4">
                <Input 
                    placeholder={t('superAdmin.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                    {filterOptions.map(opt => (
                        <Button
                            key={opt.value}
                            variant={statusFilter === opt.value ? 'primary' : 'secondary'}
                            onClick={() => setStatusFilter(opt.value)}
                            className="py-1.5 px-3 text-sm"
                        >
                            {t(opt.labelKey)}
                        </Button>
                    ))}
                </div>
            </div>
            <Table>
                <thead className="bg-gray-50">
                    <tr>
                        <SortableHeader sortKey="name" labelKey='superAdmin.headers.tenant' />
                        <TableHeaderCell>{t('superAdmin.headers.adminEmail')}</TableHeaderCell>
                        <SortableHeader sortKey="createdAt" labelKey='superAdmin.registeredOn' />
                        <SortableHeader sortKey="subscriptionStatus" labelKey='superAdmin.subscription' />
                        <TableHeaderCell>{t('superAdmin.headers.trialInfo')}</TableHeaderCell>
                        <TableHeaderCell>{t('superAdmin.headers.users')}</TableHeaderCell>
                        <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
                    </tr>
                </thead>
                <TableBody>
                    {filteredAndSortedTenants.map(tenant => {
                        // FIX: Removed unnecessary type cast `as Tenant` since the type from `useTenants` hook is now correct.
                        const trialDays = getTrialDaysLeft(tenant);
                        return(
                            <TableRow key={tenant.id}>
                                <TableCell>
                                    <div className="font-medium">{tenant.name}</div>
                                    <div className="text-xs text-text-secondary">{tenant.slug}</div>
                                </TableCell>
                                <TableCell>{tenant.adminEmail || 'N/A'}</TableCell>
                                <TableCell>{formatDateTime(tenant.createdAt, 'UTC', { dateStyle: 'medium' })}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariantMap[tenant.subscriptionStatus]}>
                                        {t(`statuses.${tenant.subscriptionStatus === SubscriptionStatus.CANCELED ? 'CANCELED_SUB' : tenant.subscriptionStatus}`)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {tenant.subscriptionStatus === SubscriptionStatus.TRIAL && trialDays > 0 ? 
                                        `${trialDays} days left` : '-'}
                                </TableCell>
                                <TableCell>{tenant.userCount}</TableCell>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {/* FIX: Removed unnecessary type cast `as Tenant` since the type from `useTenants` hook is now correct. */}
                                    <button onClick={() => setViewingTenant(tenant)} className="text-accent hover:text-accent-hover">{t('superAdmin.viewDetails')}</button>
                                </td>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>

            {viewingTenant && (
                <TenantDetailModal
                    tenant={viewingTenant}
                    users={users.filter(u => u.tenantId === viewingTenant.id)}
                    onClose={() => setViewingTenant(null)}
                    onSubscriptionChange={updateTenantSubscription}
                />
            )}
        </>
    );
};

export default TenantList;