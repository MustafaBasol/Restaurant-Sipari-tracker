type ServiceUrlValidationOptions = {
  allowedOrigins: string[];
  requireHttps: boolean;
};

type ServiceUrlValidationResult =
  | { ok: true; normalizedBaseUrl: string; origin: string }
  | { ok: false; reason: string };

const parseCommaList = (value: unknown): string[] => {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const isTruthyEnv = (value: unknown): boolean => {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

export const getServiceOriginAllowlist = (): string[] => {
  const raw = (import.meta as any).env?.VITE_SERVICE_ORIGIN_ALLOWLIST;
  const list = parseCommaList(raw);

  if (list.length > 0) return list;

  // Safe defaults:
  // - In production, if no allowlist is configured, only allow same-origin.
  // - In development, allow same-origin + common local ports.
  const sameOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isProd = Boolean((import.meta as any).env?.PROD);

  if (isProd) return sameOrigin ? [sameOrigin] : [];

  const devDefaults = [
    sameOrigin,
    'http://localhost:4242',
    'http://127.0.0.1:4242',
    'http://localhost:4243',
    'http://127.0.0.1:4243',
  ].filter(Boolean);

  return devDefaults;
};

export const validateServiceBaseUrl = (
  baseUrl: string,
  options: ServiceUrlValidationOptions,
): ServiceUrlValidationResult => {
  if (!baseUrl || typeof baseUrl !== 'string') {
    return { ok: false, reason: 'missing_url' };
  }

  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (u.username || u.password) {
    return { ok: false, reason: 'credentials_not_allowed' };
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: 'invalid_protocol' };
  }

  if (options.requireHttps && u.protocol !== 'https:') {
    return { ok: false, reason: 'https_required' };
  }

  if (u.hash) {
    return { ok: false, reason: 'hash_not_allowed' };
  }

  const origin = u.origin;
  if (!options.allowedOrigins.includes(origin)) {
    return { ok: false, reason: 'origin_not_allowed' };
  }

  const normalizedBaseUrl = `${origin}${u.pathname}`.replace(/\/+$/, '');
  return { ok: true, normalizedBaseUrl, origin };
};

export const isTrustedServiceBaseUrl = (
  baseUrl: string | undefined | null,
  options: ServiceUrlValidationOptions,
): boolean => {
  if (!baseUrl) return false;
  return validateServiceBaseUrl(baseUrl, options).ok;
};

export const assertTrustedServiceBaseUrl = (
  baseUrl: string,
  options: ServiceUrlValidationOptions,
): string => {
  const result = validateServiceBaseUrl(baseUrl, options);
  if ('reason' in result) {
    throw new Error(`INVALID_SERVICE_BASE_URL:${result.reason}`);
  }
  return result.normalizedBaseUrl;
};

export const isSafeExternalHttpUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export const shouldAllowInsecureServices = (): boolean => {
  return isTruthyEnv((import.meta as any).env?.VITE_ALLOW_INSECURE_SERVICES);
};
