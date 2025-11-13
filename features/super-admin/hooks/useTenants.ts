import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { Tenant } from '../types';
import { User } from '../../users/types';
import { SubscriptionStatus } from '../../../shared/types';

export const useTenants = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tenantsData, usersData] = await Promise.all([
                api.getAllTenants(),
                api.getAllUsers(),
            ]);
            setTenants(tenantsData.map(t => ({...t, createdAt: new Date(t.createdAt)})));
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch super admin data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMutation = async (mutationFn: () => Promise<any>) => {
        await mutationFn();
        await fetchData();
    };

    const updateTenantSubscription = (tenantId: string, status: SubscriptionStatus) => 
        handleMutation(() => api.updateTenantSubscription(tenantId, status));

    return { tenants, users, isLoading, updateTenantSubscription };
};
