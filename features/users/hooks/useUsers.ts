import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { User } from '../types';
import { User as SharedUser } from '../../../shared/types';

export const useUsers = () => {
    const { authState } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        if (authState?.tenant?.id) {
            setIsLoading(true);
            try {
                const data = await api.getUsers(authState.tenant.id);
                setUsers(data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [authState?.tenant?.id]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleMutation = async (mutationFn: () => Promise<any>) => {
        await mutationFn();
        await fetchUsers();
    };

    const addUser = (user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string }) => 
        handleMutation(() => api.addUser(authState!.tenant!.id, user));

    const updateUser = (user: User) => 
        handleMutation(() => api.updateUser(user));

    return { users, isLoading, addUser, updateUser, refetch: fetchUsers };
};
