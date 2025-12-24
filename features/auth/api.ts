import * as mockApi from '../../shared/lib/mockApi';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';
import { getDeviceId } from '../../shared/lib/device';

export type RegisterPayload = mockApi.RegisterPayload;

export type RegisterResult =
  | ({ emailVerificationRequired: true } & Record<string, unknown>)
  | (Awaited<ReturnType<typeof mockApi.registerTenant>> extends infer R ? R : never);

export const login: typeof mockApi.login = async (
  email,
  passwordOrSlug,
  turnstileToken,
  mfaCode?: string,
) => {
  if (!isRealApiEnabled()) return mockApi.login(email, passwordOrSlug, turnstileToken);
  const response = await apiFetch<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: passwordOrSlug,
      deviceId: getDeviceId(),
      turnstileToken: turnstileToken ?? undefined,
      mfaCode: mfaCode?.trim() ? mfaCode.trim() : undefined,
    }),
    skipAuth: true,
  });
  return response;
};

export const mfaSetup = async (): Promise<{
  secret: string;
  otpauthUri: string;
  issuer: string;
}> => {
  if (!isRealApiEnabled()) {
    return { secret: 'MOCK-SECRET', otpauthUri: 'otpauth://totp/mock', issuer: 'Kitchorify' };
  }
  return apiFetch('/auth/mfa/setup', { method: 'POST' });
};

export const mfaVerify = async (
  code: string,
): Promise<{ mfaEnabledAt: string; recoveryCodes?: string[] }> => {
  if (!isRealApiEnabled()) {
    return {
      mfaEnabledAt: new Date().toISOString(),
      recoveryCodes: ['aaaa-bbbb-cccc-dddd', 'eeee-ffff-gggg-hhhh'],
    };
  }
  return apiFetch('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) });
};

export const registerTenant = async (payload: RegisterPayload): Promise<RegisterResult> => {
  if (!isRealApiEnabled()) return mockApi.registerTenant(payload);
  const response = await apiFetch<any>('/auth/register-tenant', {
    method: 'POST',
    body: JSON.stringify({ ...payload, deviceId: getDeviceId() }),
    skipAuth: true,
  });

  // Real API mode: register returns no session; it requires email verification.
  if (
    response &&
    typeof response === 'object' &&
    (response as any).emailVerificationRequired === true
  ) {
    return { emailVerificationRequired: true };
  }

  return response as RegisterResult;
};

export const resendVerificationEmail = async (email: string): Promise<boolean> => {
  if (!isRealApiEnabled()) return true;
  return apiFetch<boolean>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
};

export const verifyEmail = async (token: string): Promise<boolean> => {
  if (!isRealApiEnabled()) return true;
  return apiFetch<boolean>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
    skipAuth: true,
  });
};

export const requestPasswordReset = async (email: string): Promise<boolean> => {
  if (!isRealApiEnabled()) return true;
  return apiFetch<boolean>('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
};

export const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
  if (!isRealApiEnabled()) return true;
  return apiFetch<boolean>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
    skipAuth: true,
  });
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

export const getMe = async (): Promise<{ user: any; tenant: any | null } | null> => {
  if (!isRealApiEnabled()) return null;
  return apiFetch<{ user: any; tenant: any | null }>('/auth/me', { method: 'GET' });
};

export const bootstrapSession: typeof mockApi.bootstrapSession = async (userId, tenantId) => {
  // Only used for legacy localStorage auth states; never in real API mode.
  if (!isRealApiEnabled()) return mockApi.bootstrapSession(userId, tenantId);
  return null;
};
