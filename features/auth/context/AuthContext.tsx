import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../api';
import { AuthState } from '../types';
import { Tenant, User } from '../../../shared/types';
import { getDeviceId } from '../../../shared/lib/device';
import { isRealApiEnabled } from '../../../shared/lib/runtimeApi';

const LEGACY_AUTH_STORAGE_KEY = 'authState';
const getAuthStorageKey = () => `authState:${getDeviceId()}`;

const isRecord = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null;
};

const isUserLike = (value: unknown): value is User => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.fullName === 'string' &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    typeof value.isActive === 'boolean' &&
    (value.tenantId === undefined || typeof value.tenantId === 'string') &&
    ((value as any).mfaEnabledAt === undefined ||
      (value as any).mfaEnabledAt === null ||
      typeof (value as any).mfaEnabledAt === 'string')
  );
};

const sanitizeAuthStateForStorage = (state: AuthState): AuthState => {
  return {
    ...state,
    user: {
      ...state.user,
      // Never persist credential-like fields to localStorage.
      passwordHash: '',
    },
  };
};

const hydrateAuthStateFromStorage = (raw: unknown): AuthState => {
  if (!isRecord(raw) || !isUserLike(raw.user)) {
    throw new Error('Invalid auth state in storage');
  }

  const hydrated: AuthState = {
    user: {
      ...raw.user,
      passwordHash: '',
    },
    tenant: raw.tenant ?? null,
  };

  if (hydrated.tenant) {
    hydrated.tenant.createdAt = new Date(hydrated.tenant.createdAt);
    if (hydrated.tenant.trialStartAt) {
      hydrated.tenant.trialStartAt = new Date(hydrated.tenant.trialStartAt);
    }
    if (hydrated.tenant.trialEndAt) {
      hydrated.tenant.trialEndAt = new Date(hydrated.tenant.trialEndAt);
    }
    if ((hydrated.tenant as any).subscriptionCurrentPeriodEndAt) {
      (hydrated.tenant as any).subscriptionCurrentPeriodEndAt = new Date(
        (hydrated.tenant as any).subscriptionCurrentPeriodEndAt,
      );
    }
  }

  return hydrated;
};

interface AuthContextData {
  authState: AuthState | null;
  isLoading: boolean;
  login: (
    email: string,
    passwordOrSlug: string,
    turnstileToken?: string,
    mfaCode?: string,
  ) => Promise<boolean>;
  logout: () => void;
  register: (payload: api.RegisterPayload) => Promise<boolean>;
  updateTenantInState: (tenant: Tenant) => void;
  updateUserInState: (patch: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const authStorageKey = getAuthStorageKey();
    const storedAuthState = localStorage.getItem(authStorageKey);
    if (storedAuthState) {
      try {
        const parsedState = JSON.parse(storedAuthState);
        setAuthState(hydrateAuthStateFromStorage(parsedState));
      } catch (e) {
        console.error('Failed to parse auth state from localStorage', e);
        localStorage.removeItem(authStorageKey);
      }
    } else {
      // Migrate legacy (shared) storage to per-device storage.
      const legacy = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
      if (legacy) {
        try {
          const parsedState = JSON.parse(legacy);
          const hydrated = hydrateAuthStateFromStorage(parsedState);
          setAuthState(hydrated);
          localStorage.setItem(
            authStorageKey,
            JSON.stringify(sanitizeAuthStateForStorage(hydrated)),
          );
        } catch (e) {
          console.error('Failed to migrate legacy auth state', e);
        } finally {
          localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    passwordOrSlug: string,
    turnstileToken?: string,
    mfaCode?: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, passwordOrSlug, turnstileToken, mfaCode);
      if (response) {
        const sanitized = sanitizeAuthStateForStorage(response);
        setAuthState(sanitized);
        localStorage.setItem(getAuthStorageKey(), JSON.stringify(sanitized));
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: api.RegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await api.registerTenant(payload);
      if (!response) return false;

      // Real API mode may require email verification and return no session.
      if ((response as any).emailVerificationRequired) {
        return true;
      }

      const sanitized = sanitizeAuthStateForStorage(response as any);
      setAuthState(sanitized);
      localStorage.setItem(getAuthStorageKey(), JSON.stringify(sanitized));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalAuth = () => {
    setAuthState(null);
    localStorage.removeItem(getAuthStorageKey());
  };

  const logout = () => {
    // Best-effort: revoke this device session server-side.
    if (authState?.sessionId) {
      api.logoutSession(authState.sessionId).catch(() => {
        // ignore
      });
    }

    // Navigate to the marketing homepage first.
    window.location.hash = '#/';

    // Use a timeout to ensure the hash change is processed by the router's
    // event listener before the auth state changes. This reliably prevents
    // the race condition that was redirecting to /login.
    setTimeout(() => {
      clearLocalAuth();
    }, 0);
  };

  const updateTenantInState = (tenant: Tenant) => {
    setAuthState((prevState) => {
      if (!prevState) return null;
      const newState = { ...prevState, tenant };
      const sanitized = sanitizeAuthStateForStorage(newState);
      localStorage.setItem(getAuthStorageKey(), JSON.stringify(sanitized));
      return sanitized;
    });
  };

  const updateUserInState = (patch: Partial<User>) => {
    setAuthState((prevState) => {
      if (!prevState) return null;
      const newState: AuthState = {
        ...prevState,
        user: {
          ...prevState.user,
          ...patch,
        },
      };
      const sanitized = sanitizeAuthStateForStorage(newState);
      localStorage.setItem(getAuthStorageKey(), JSON.stringify(sanitized));
      return sanitized;
    });
  };

  // Bootstrap session for legacy auth states that don't include a session id.
  useEffect(() => {
    if (!authState || authState.sessionId) return;

    // In real API mode, we never create a session from just a userId.
    // If a legacy state is missing a session id, require the user to log in again.
    if (isRealApiEnabled()) return;

    let cancelled = false;
    api
      .bootstrapSession(authState.user.id, authState.tenant?.id ?? null)
      .then((sessionId) => {
        if (cancelled || !sessionId) return;
        setAuthState((prev) => {
          if (!prev) return prev;
          const next: AuthState = { ...prev, sessionId, deviceId: getDeviceId() };
          const sanitized = sanitizeAuthStateForStorage(next);
          localStorage.setItem(getAuthStorageKey(), JSON.stringify(sanitized));
          return sanitized;
        });
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // Periodically validate the current session; if revoked/expired, force logout.
  useEffect(() => {
    if (!authState?.sessionId) return;

    let cancelled = false;

    const validate = async () => {
      try {
        const ok = await api.validateSession(authState.sessionId!);
        if (!ok && !cancelled) {
          window.location.hash = '#/';
          setTimeout(() => {
            clearLocalAuth();
          }, 0);
        }
      } catch {
        // ignore transient errors
      }
    };

    const onFocus = () => {
      validate().catch(() => {
        // ignore
      });
    };

    validate().catch(() => {
      // ignore
    });

    const interval = window.setInterval(() => {
      validate().catch(() => {
        // ignore
      });
    }, 15000);

    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [authState?.sessionId]);

  return (
    <AuthContext.Provider
      value={{
        authState,
        isLoading,
        login,
        logout,
        register,
        updateTenantInState,
        updateUserInState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
