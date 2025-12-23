import * as mockApi from '../../shared/lib/mockApi';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';
import { getDeviceId } from '../../shared/lib/device';

export type RegisterPayload = mockApi.RegisterPayload;

export const login: typeof mockApi.login = async (email, passwordOrSlug) => {
  if (!isRealApiEnabled()) return mockApi.login(email, passwordOrSlug);
  const response = await apiFetch<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: passwordOrSlug, deviceId: getDeviceId() }),
    skipAuth: true,
  });
  return response;
};

export const registerTenant: typeof mockApi.registerTenant = async (payload) => {
  if (!isRealApiEnabled()) return mockApi.registerTenant(payload);
  const response = await apiFetch<any>('/auth/register-tenant', {
    method: 'POST',
    body: JSON.stringify({ ...payload, deviceId: getDeviceId() }),
    skipAuth: true,
  });
  return response;
};

export const logoutSession: typeof mockApi.logoutSession = async (sessionId) => {
  if (!isRealApiEnabled()) return mockApi.logoutSession(sessionId);
  await apiFetch<boolean>(`/auth/sessions/${encodeURIComponent(sessionId)}/logout`, {
    method: 'POST',
  });
  return true;
};

export const logoutOtherSessions: typeof mockApi.logoutOtherSessions = async (_sessionId) => {
  if (!isRealApiEnabled()) return mockApi.logoutOtherSessions(_sessionId);
  await apiFetch<boolean>('/auth/logout-other', { method: 'POST' });
  return true;
};

export const getMySessions: typeof mockApi.getMySessions = async (_sessionId) => {
  if (!isRealApiEnabled()) return mockApi.getMySessions(_sessionId);
  return apiFetch<any>('/auth/my-sessions', { method: 'GET' });
};

export const validateSession: typeof mockApi.validateSession = async (_sessionId) => {
  if (!isRealApiEnabled()) return mockApi.validateSession(_sessionId);
  try {
    return await apiFetch<boolean>('/auth/validate', { method: 'GET' });
  } catch {
    return false;
  }
};

export const bootstrapSession: typeof mockApi.bootstrapSession = async (userId, tenantId) => {
  // Only used for legacy localStorage auth states; never in real API mode.
  if (!isRealApiEnabled()) return mockApi.bootstrapSession(userId, tenantId);
  return null;
};
