import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../api';
import { AuthState } from '../types';
import { Tenant, User } from '../../../shared/types';

const AUTH_STORAGE_KEY = 'authState';

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
    (value.tenantId === undefined || typeof value.tenantId === 'string')
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
  }

  return hydrated;
};

interface AuthContextData {
  authState: AuthState | null;
  isLoading: boolean;
  login: (email: string, passwordOrSlug: string) => Promise<boolean>;
  logout: () => void;
  register: (payload: api.RegisterPayload) => Promise<boolean>;
  updateTenantInState: (tenant: Tenant) => void;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedAuthState = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuthState) {
      try {
        const parsedState = JSON.parse(storedAuthState);
        setAuthState(hydrateAuthStateFromStorage(parsedState));
      } catch (e) {
        console.error('Failed to parse auth state from localStorage', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, passwordOrSlug: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, passwordOrSlug);
      if (response) {
        const sanitized = sanitizeAuthStateForStorage(response);
        setAuthState(sanitized);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitized));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: api.RegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await api.registerTenant(payload);
      if (response) {
        const sanitized = sanitizeAuthStateForStorage(response);
        setAuthState(sanitized);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitized));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Navigate to the marketing homepage first.
    window.location.hash = '#/';

    // Use a timeout to ensure the hash change is processed by the router's
    // event listener before the auth state changes. This reliably prevents
    // the race condition that was redirecting to /login.
    setTimeout(() => {
      setAuthState(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }, 0);
  };

  const updateTenantInState = (tenant: Tenant) => {
    setAuthState((prevState) => {
      if (!prevState) return null;
      const newState = { ...prevState, tenant };
      const sanitized = sanitizeAuthStateForStorage(newState);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitized));
      return sanitized;
    });
  };

  return (
    <AuthContext.Provider
      value={{ authState, isLoading, login, logout, register, updateTenantInState }}
    >
      {children}
    </AuthContext.Provider>
  );
};
