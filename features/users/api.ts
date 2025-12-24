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
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

type Actor = { userId: string; role: UserRole };

export type CreateUserResult = {
  user: User;
  generatedPassword?: string | null;
};

export const getUsers = (tenantId: string) => {
  if (!isRealApiEnabled()) return getDataByTenant<User>('users', tenantId);
  return apiFetch<User[]>('/users', { method: 'GET' });
};

export const addUser = (
  tenantId: string,
  user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string },
) => {
  if (isRealApiEnabled()) {
    return apiFetch<CreateUserResult>('/users', {
      method: 'POST',
      body: JSON.stringify({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        password: user.password && user.password.trim() ? user.password : undefined,
      }),
    });
  }
  const password = user.password && user.password.trim() ? user.password : undefined;
  const generatedPassword = password ? null : Math.random().toString(36).slice(2, 14);
  const newUser: User = {
    id: `user${Date.now()}`,
    tenantId,
    fullName: user.fullName,
    email: user.email,
    passwordHash: password || generatedPassword || '123456', // Mock hash
    role: user.role,
    isActive: true,
  };
  return addData('users', newUser).then((u) => ({ user: u, generatedPassword }));
};

export const updateUser = (user: User) => {
  if (!isRealApiEnabled()) return updateData('users', user);
  return apiFetch<User>(`/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }),
  });
};

export const changeUserPassword = (userId: string, newPassword: string) => {
  if (!isRealApiEnabled()) return internalChangeUserPassword(userId, newPassword);
  return apiFetch<boolean>(`/users/${encodeURIComponent(userId)}/change-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
};

export const disableUserMfa = (userId: string) => {
  if (isRealApiEnabled()) {
    return apiFetch<boolean>(`/users/${encodeURIComponent(userId)}/mfa/disable`, {
      method: 'POST',
    });
  }
  // Mock mode: best-effort update of the user record.
  return updateData('users', { id: userId, mfaEnabledAt: null } as any);
};

export const setupUserMfa = async (
  userId: string,
): Promise<{ secret: string; otpauthUri: string; issuer: string }> => {
  if (!isRealApiEnabled()) {
    return { secret: 'MOCK-SECRET', otpauthUri: 'otpauth://totp/mock', issuer: 'Kitchorify' };
  }
  return apiFetch(`/users/${encodeURIComponent(userId)}/mfa/setup`, { method: 'POST' });
};

export const verifyUserMfa = async (userId: string, code: string): Promise<{ mfaEnabledAt: string }> => {
  if (!isRealApiEnabled()) {
    return { mfaEnabledAt: new Date().toISOString() };
  }
  return apiFetch(`/users/${encodeURIComponent(userId)}/mfa/verify`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};

export const getSessionsForUser = (tenantId: string, userId: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<any[]>(`/users/${encodeURIComponent(userId)}/sessions`, { method: 'GET' })
    : getUserSessions(tenantId, userId, actor);

export const revokeSessionForUser = (
  tenantId: string,
  userId: string,
  sessionId: string,
  actor: Actor,
) =>
  isRealApiEnabled()
    ? apiFetch<boolean>(
        `/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}/revoke`,
        { method: 'POST' },
      )
    : revokeUserSession(tenantId, sessionId, actor);

export const revokeAllSessionsForUser = (tenantId: string, userId: string, actor: Actor) =>
  isRealApiEnabled()
    ? apiFetch<boolean>(`/users/${encodeURIComponent(userId)}/sessions/revoke-all`, {
        method: 'POST',
      })
    : revokeAllUserSessions(tenantId, userId, actor);
