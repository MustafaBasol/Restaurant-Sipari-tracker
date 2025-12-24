import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useContext,
} from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { User } from '../types';
import { User as SharedUser } from '../../../shared/types';
import type { CreateUserResult } from '../api';

interface UserContextData {
  users: User[];
  isLoading: boolean;
  addUser: (
    user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string },
  ) => Promise<CreateUserResult | void>;
  updateUser: (user: User) => Promise<void>;
  changeUserPassword: (userId: string, newPassword: string) => Promise<void>;
  disableUserMfa: (userId: string) => Promise<void>;
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
        console.error('Failed to fetch users', error);
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

  const handleMutation = async <T,>(mutationFn: () => Promise<T>): Promise<T> => {
    const result = await mutationFn();
    await fetchUsers();
    return result;
  };

  const addUser = (
    user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string },
  ) => handleMutation(() => api.addUser(authState!.tenant!.id, user));

  const updateUser = (user: User) => handleMutation(() => api.updateUser(user));

  const changeUserPassword = async (userId: string, newPassword: string) => {
    await api.changeUserPassword(userId, newPassword);
    // No refetch needed as the user list UI does not change.
  };

  const disableUserMfa = (userId: string) => handleMutation(() => api.disableUserMfa(userId));

  return (
    <UserContext.Provider
      value={{
        users,
        isLoading,
        addUser,
        updateUser,
        changeUserPassword,
        disableUserMfa,
        refetch: fetchUsers,
      }}
    >
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
