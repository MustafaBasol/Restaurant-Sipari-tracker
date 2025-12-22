const DEVICE_ID_SESSION_KEY = 'kitchorify-device-id';

export const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const getDeviceId = (): string => {
  if (!isBrowser()) return 'server';

  const existing = sessionStorage.getItem(DEVICE_ID_SESSION_KEY);
  if (existing) return existing;

  const created = `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(DEVICE_ID_SESSION_KEY, created);
  return created;
};
