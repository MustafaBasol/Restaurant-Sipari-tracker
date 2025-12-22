import { PermissionKey, Tenant, TenantPermissions, UserRole } from '../types';

export const PERMISSION_KEYS: PermissionKey[] = [
  'ORDER_PAYMENTS',
  'ORDER_DISCOUNT',
  'ORDER_COMPLIMENTARY',
  'ORDER_ITEM_CANCEL',
  'ORDER_ITEM_SERVE',
  'ORDER_TABLES',
  'ORDER_CLOSE',
  'KITCHEN_ITEM_STATUS',
  'KITCHEN_MARK_ALL_READY',
];

type NormalizedPermissions = Record<UserRole, Record<PermissionKey, boolean>>;

const buildAllFalse = (): Record<PermissionKey, boolean> =>
  Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>;

// Defaults are chosen to preserve the current role-based behavior.
const DEFAULT_PERMISSIONS: NormalizedPermissions = {
  [UserRole.SUPER_ADMIN]: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<
    PermissionKey,
    boolean
  >,
  [UserRole.ADMIN]: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<
    PermissionKey,
    boolean
  >,
  [UserRole.WAITER]: {
    ...buildAllFalse(),
    ORDER_PAYMENTS: true,
    ORDER_DISCOUNT: true,
    ORDER_COMPLIMENTARY: true,
    ORDER_ITEM_CANCEL: true,
    ORDER_ITEM_SERVE: true,
    ORDER_TABLES: true,
    ORDER_CLOSE: true,
  },
  [UserRole.KITCHEN]: {
    ...buildAllFalse(),
    KITCHEN_ITEM_STATUS: true,
    KITCHEN_MARK_ALL_READY: true,
  },
};

export const normalizeTenantPermissions = (tenant?: Tenant | null): NormalizedPermissions => {
  const tenantPerms: TenantPermissions | undefined = tenant?.permissions;

  const normalized: NormalizedPermissions = {
    [UserRole.SUPER_ADMIN]: { ...DEFAULT_PERMISSIONS[UserRole.SUPER_ADMIN] },
    [UserRole.ADMIN]: { ...DEFAULT_PERMISSIONS[UserRole.ADMIN] },
    [UserRole.WAITER]: { ...DEFAULT_PERMISSIONS[UserRole.WAITER] },
    [UserRole.KITCHEN]: { ...DEFAULT_PERMISSIONS[UserRole.KITCHEN] },
  };

  if (!tenantPerms) return normalized;

  for (const role of Object.values(UserRole)) {
    const roleOverrides = tenantPerms[role];
    if (!roleOverrides) continue;

    for (const key of PERMISSION_KEYS) {
      const val = roleOverrides[key];
      if (typeof val === 'boolean') {
        normalized[role][key] = val;
      }
    }
  }

  return normalized;
};

export const hasPermission = (
  tenant: Tenant | null | undefined,
  role: UserRole | null | undefined,
  key: PermissionKey,
): boolean => {
  if (!role) return false;
  if (role === UserRole.SUPER_ADMIN) return true;
  if (role === UserRole.ADMIN) return true;

  const perms = normalizeTenantPermissions(tenant);
  return Boolean(perms[role]?.[key]);
};
