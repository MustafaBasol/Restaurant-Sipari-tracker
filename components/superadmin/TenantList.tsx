import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Tenant, SubscriptionStatus, User } from '../../types';
import UserListModal from './UserListModal';

type SortKey = 'name' | 'createdAt' | 'subscriptionStatus';

const TenantList: React.FC = () => {
    const { allTenants, allUsers, updateTenantSubscription, t } = useAppContext();
    const [viewingUsersFor, setViewingUsersFor] = useState<Tenant | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortAsc, setSortAsc] = useState(false);

    const sortedTenants = useMemo(() => {
        // FIX: Refactored sorting logic to handle date comparison correctly and avoid type errors.
        return [...allTenants].sort((a, b) => {
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
    }, [allTenants, sortKey, sortAsc]);
    
    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const handleSubscriptionChange = (tenantId: string, status: SubscriptionStatus) => {
        updateTenantSubscription(tenantId, status);
    };
    
    const getTenantUsers = (tenantId: string): User[] => {
        return allUsers.filter(user => user.tenantId === tenantId);
    };

    const StatusBadge: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
        const styles: Record<SubscriptionStatus, string> = {
            [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
            [SubscriptionStatus.TRIAL]: 'bg-yellow-100 text-yellow-800',
            [SubscriptionStatus.CANCELED]: 'bg-red-100 text-red-800',
        };
        const textKey = status === SubscriptionStatus.CANCELED ? 'CANCELED_SUB' : status;
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{t(textKey, status)}</span>;
    };

    const SortableHeader: React.FC<{ sortKey: SortKey, label: string }> = ({ sortKey: key, label }) => (
        <th onClick={() => handleSort(key)} className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer">
            {label} {sortKey === key && (sortAsc ? '▲' : '▼')}
        </th>
    );

    return (
        <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader sortKey="name" label={t('name')} />
                            <SortableHeader sortKey="createdAt" label={t('registeredOn')} />
                            <SortableHeader sortKey="subscriptionStatus" label={t('subscription')} />
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('users')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border-color">
                        {sortedTenants.map(tenant => (
                            <tr key={tenant.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{tenant.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={tenant.subscriptionStatus} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{getTenantUsers(tenant.id).length}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                     <select 
                                        value={tenant.subscriptionStatus}
                                        onChange={(e) => handleSubscriptionChange(tenant.id, e.target.value as SubscriptionStatus)}
                                        className="p-1 rounded-md bg-light-bg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                                    >
                                        <option value={SubscriptionStatus.TRIAL}>{t('TRIAL')}</option>
                                        <option value={SubscriptionStatus.ACTIVE}>{t('ACTIVE')}</option>
                                        <option value={SubscriptionStatus.CANCELED}>{t('CANCELED_SUB')}</option>
                                    </select>
                                    <button onClick={() => setViewingUsersFor(tenant)} className="text-accent hover:text-accent-hover">{t('viewUsers')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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