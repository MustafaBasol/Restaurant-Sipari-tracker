import { getDeviceId } from './device';

const trimTrailingSlash = (s: string) => s.replace(/\/+$/, '');

export const getApiBaseUrl = (): string | null => {
  const raw = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (!raw || !raw.trim()) return null;
  try {
    // Accept absolute URLs (https://x/y) or same-origin paths (/api)
    const candidate = raw.trim();
    if (candidate.startsWith('/')) return trimTrailingSlash(candidate);
    const u = new URL(candidate);
    return trimTrailingSlash(u.toString());
  } catch {
    return null;
  }
};

export const isRealApiEnabled = (): boolean => Boolean(getApiBaseUrl());

export type StoredAuthState = {
  sessionId?: string;
};

export const getStoredSessionId = (): string | null => {
  try {
    const key = `authState:${getDeviceId()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthState;
    if (parsed?.sessionId && typeof parsed.sessionId === 'string') return parsed.sessionId;
    return null;
  } catch {
    return null;
  }
};

export const apiFetch = async <T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> => {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API is not configured');

  const url = base.startsWith('/') ? `${base}${path}` : `${base}${path}`;

  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has('content-type') && init?.body) {
    headers.set('content-type', 'application/json');
  }

  if (!init?.skipAuth) {
    const sessionId = getStoredSessionId();
    if (sessionId) headers.set('x-session-id', sessionId);
  }

  const resp = await fetch(url, {
    ...init,
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `HTTP ${resp.status}`);
  }

  // 204
  if (resp.status === 204) return undefined as T;

  const contentType = resp.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await resp.json()) as T;
  }

  return (await resp.text()) as T;
};
