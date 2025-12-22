import {
  getDataByTenant,
  addData,
  updateData,
  internalChangeUserPassword,
  getUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
} from '../../shared/lib/mockApi';
import { User } from './types';
import { User as SharedUser, UserRole } from '../../shared/types';

type Actor = { userId: string; role: UserRole };

export const getUsers = (tenantId: string) => getDataByTenant<User>('users', tenantId);

export const addUser = (
  tenantId: string,
  user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string },
) => {
  const newUser: User = {
    id: `user${Date.now()}`,
    tenantId,
    fullName: user.fullName,
    email: user.email,
    passwordHash: user.password || '123456', // Mock hash
    role: user.role,
    isActive: true,
  };
  return addData('users', newUser);
};

export const updateUser = (user: User) => updateData('users', user);

export const changeUserPassword = (userId: string, newPassword: string) => {
  return internalChangeUserPassword(userId, newPassword);
};

export const getSessionsForUser = (tenantId: string, userId: string, actor: Actor) =>
  getUserSessions(tenantId, userId, actor);

export const revokeSessionForUser = (tenantId: string, sessionId: string, actor: Actor) =>
  revokeUserSession(tenantId, sessionId, actor);

export const revokeAllSessionsForUser = (tenantId: string, userId: string, actor: Actor) =>
  revokeAllUserSessions(tenantId, userId, actor);
