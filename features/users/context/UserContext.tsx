import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { User } from '../types';
import { User as SharedUser } from '../../../shared/types';

interface UserContextData {
    users: User[];
    isLoading: boolean;
    addUser: (user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    refetch: () => Promise<void>;
}

export const UserContext = createContext<UserContextData | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
        } else {
            setUsers([]);
            setIsLoading(false);
        }
    }, [authState]);

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

    return (
        <UserContext.Provider value={{ users, isLoading, addUser, updateUser, refetch: fetchUsers }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
