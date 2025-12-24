import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  setupUserMfa: (userId: string) => Promise<{ secret: string; otpauthUri: string; issuer: string }>;
  verifyUserMfa: (userId: string, code: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const UserContext = createContext<UserContextData | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = authState?.tenant?.id;

  const fetchUsers = useCallback(async () => {
    if (tenantId) {
      setIsLoading(true);
      try {
        const data = await api.getUsers(tenantId);
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
  }, [tenantId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleMutation = useCallback(
    async <T,>(mutationFn: () => Promise<T>): Promise<T> => {
      const result = await mutationFn();
      await fetchUsers();
      return result;
    },
    [fetchUsers],
  );

  const addUser = useCallback(
    (
      user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string },
    ) => {
      if (!tenantId) return Promise.reject(new Error('TENANT_REQUIRED'));
      return handleMutation(() => api.addUser(tenantId, user));
    },
    [handleMutation, tenantId],
  );

  const updateUser = useCallback(
    (user: User) => handleMutation(() => api.updateUser(user)),
    [handleMutation],
  );

  const changeUserPassword = useCallback(async (userId: string, newPassword: string) => {
    await api.changeUserPassword(userId, newPassword);
    // No refetch needed as the user list UI does not change.
  }, []);

  const disableUserMfa = useCallback(
    (userId: string) => handleMutation(() => api.disableUserMfa(userId)),
    [handleMutation],
  );

  const setupUserMfa = useCallback(
    (userId: string) => handleMutation(() => api.setupUserMfa(userId)),
    [handleMutation],
  );

  const verifyUserMfa = useCallback(
    (userId: string, code: string) => handleMutation(() => api.verifyUserMfa(userId, code)),
    [handleMutation],
  );

  const value = useMemo<UserContextData>(
    () => ({
      users,
      isLoading,
      addUser,
      updateUser,
      changeUserPassword,
      disableUserMfa,
      setupUserMfa,
      verifyUserMfa: (userId: string, code: string) => verifyUserMfa(userId, code).then(() => undefined),
      refetch: fetchUsers,
    }),
    [
      addUser,
      changeUserPassword,
      disableUserMfa,
      fetchUsers,
      isLoading,
      setupUserMfa,
      updateUser,
      users,
      verifyUserMfa,
    ],
  );

  return (
    <UserContext.Provider value={value}>
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
