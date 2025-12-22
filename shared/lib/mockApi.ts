import {
  Tenant,
  User,
  SubscriptionStatus,
  UserRole,
  TableStatus,
  OrderStatus,
  KitchenStation,
  PaymentMethod,
  PaymentStatus,
  BillingStatus,
  DiscountType,
  AuditLog,
  AuditAction,
  AuditEntityType,
  PermissionKey,
} from '../types';
import { Table } from '../../features/tables/types';
import { MenuCategory, MenuItem } from '../../features/menu/types';
import { Order, OrderItem, PaymentLine } from '../../features/orders/types';
import {
  EndOfDaySummary,
  PaymentMethodTotal,
  SummaryReport,
  TopItem,
  WaiterStat,
} from '../../features/reports/types';
import { hasPermission } from './permissions';

const cloneOrder = (order: Order): Order => ({
  ...order,
  items: order.items.map((i) => ({ ...i })),
  discount: order.discount ? { ...order.discount } : undefined,
  payments: order.payments ? order.payments.map((p) => ({ ...p })) : undefined,
  linkedTableIds: order.linkedTableIds ? [...order.linkedTableIds] : undefined,
});

const cloneTable = (table: Table): Table => ({ ...table });

type DbMeta = {
  // Global revision counter for the persisted DB.
  // Used for coarse conflict detection on reconnect.
  mutationCounter: number;
};
type ClientMeta = {
  // Snapshot of the server mutation counter at the time the client cache was last refreshed.
  lastKnownServerMutationCounter: number;
};
type OutboxItem = {
  id: string;
  createdAt: string;
  op:
    | 'addData'
    | 'updateData'
    | 'internalUpdateTableStatus'
    | 'internalCreateOrder'
    | 'internalUpdateOrderItemStatus'
    | 'internalMarkOrderAsReady'
    | 'internalServeOrderItem'
    | 'internalCloseOrder'
    | 'internalUpdateOrderNote'
    | 'internalAddOrderPayment'
    | 'internalRequestOrderBill'
    | 'internalConfirmOrderPayment'
    | 'internalSetOrderDiscount'
    | 'internalSetOrderItemComplimentary'
    | 'internalMoveOrderToTable'
    | 'internalMergeOrderWithTable'
    | 'internalUnmergeOrderFromTable'
    | 'internalChangeUserPassword'
    | 'simulateWebhookPaymentSucceeded'
    | 'createPaymentIntent';
  // JSON-serializable args only.
  args: unknown[];
};

type SyncConflict = {
  id: string;
  occurredAt: string;
  reason: string;
  serverMutationCounter: number;
  clientLastKnownServerMutationCounter: number;
  appliedOutboxCount: number;
};

const DB_SERVER_KEY = 'kitchorify-db';
const DB_CLIENT_KEY_PREFIX = 'kitchorify-db-client:';
const OUTBOX_KEY_PREFIX = 'kitchorify-outbox:';
const CONFLICTS_KEY_PREFIX = 'kitchorify-sync-conflicts:';
const DEVICE_ID_SESSION_KEY = 'kitchorify-device-id';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const getDeviceId = (): string => {
  if (!isBrowser()) return 'server';
  const existing = sessionStorage.getItem(DEVICE_ID_SESSION_KEY);
  if (existing) return existing;
  const created = `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(DEVICE_ID_SESSION_KEY, created);
  return created;
};

const getClientDbKey = (): string => `${DB_CLIENT_KEY_PREFIX}${getDeviceId()}`;
const getOutboxKey = (): string => `${OUTBOX_KEY_PREFIX}${getDeviceId()}`;
const getConflictsKey = (): string => `${CONFLICTS_KEY_PREFIX}${getDeviceId()}`;

const getIsOnline = (): boolean => {
  if (!isBrowser()) return true;
  // navigator.onLine is best-effort; still useful for our demo.
  return navigator.onLine;
};

// --- MOCK DATABASE ---

interface MockDB {
  tenants: Tenant[];
  users: User[];
  tables: Table[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  auditLogs: AuditLog[];
  __meta: DbMeta;
  __clientMeta?: ClientMeta;
}

const trialEndDate = new Date();
trialEndDate.setDate(trialEndDate.getDate() + 5); // Trial ends in 5 days

const seedData: MockDB = {
  tenants: [
    {
      id: 't1',
      name: 'Sunset Bistro',
      slug: 'sunset-bistro',
      defaultLanguage: 'en',
      subscriptionStatus: SubscriptionStatus.TRIAL,
      createdAt: new Date('2023-10-26T10:00:00Z'),
      currency: 'USD',
      timezone: 'America/New_York',
      taxRatePercent: 0,
      serviceChargePercent: 0,
      roundingIncrement: 0,
      permissions: {
        [UserRole.WAITER]: {
          ORDER_PAYMENTS: true,
          ORDER_DISCOUNT: true,
          ORDER_COMPLIMENTARY: true,
          ORDER_ITEM_CANCEL: true,
          ORDER_ITEM_SERVE: true,
          ORDER_TABLES: true,
          ORDER_CLOSE: true,
        },
        [UserRole.KITCHEN]: {
          KITCHEN_ITEM_STATUS: true,
          KITCHEN_MARK_ALL_READY: true,
        },
      },
      trialStartAt: new Date(),
      trialEndAt: trialEndDate,
    },
  ],
  users: [
    {
      id: 'su1',
      fullName: 'Super Admin',
      email: 'superadmin@kitchorify.com',
      passwordHash: 'superadmin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    {
      id: 'u1',
      tenantId: 't1',
      fullName: 'Admin User',
      email: 'admin@sunsetbistro.com',
      passwordHash: 'sunset-bistro',
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      id: 'u2',
      tenantId: 't1',
      fullName: 'Waiter User',
      email: 'waiter@sunsetbistro.com',
      passwordHash: 'sunset-bistro',
      role: UserRole.WAITER,
      isActive: true,
    },
    {
      id: 'u3',
      tenantId: 't1',
      fullName: 'Kitchen Staff',
      email: 'kitchen@sunsetbistro.com',
      passwordHash: 'sunset-bistro',
      role: UserRole.KITCHEN,
      isActive: true,
    },
  ],
  tables: Array.from({ length: 12 }, (_, i) => ({
    id: `tbl${i + 1}`,
    tenantId: 't1',
    name: `T${i + 1}`,
    status: TableStatus.FREE,
  })),
  menuCategories: [
    { id: 'cat1', tenantId: 't1', name: 'Appetizers' },
    { id: 'cat2', tenantId: 't1', name: 'Main Courses' },
    { id: 'cat3', tenantId: 't1', name: 'Desserts' },
    { id: 'cat4', tenantId: 't1', name: 'Drinks' },
  ],
  menuItems: [
    {
      id: 'item1',
      tenantId: 't1',
      categoryId: 'cat1',
      name: 'Bruschetta',
      station: KitchenStation.HOT,
      description: 'Grilled bread with tomatoes, garlic, and basil.',
      price: 8.5,
      isAvailable: true,
      allergens: ['gluten'],
    },
    {
      id: 'item2',
      tenantId: 't1',
      categoryId: 'cat1',
      name: 'Calamari',
      station: KitchenStation.HOT,
      description: 'Fried squid rings with dipping sauce.',
      price: 12.0,
      isAvailable: true,
    },
    {
      id: 'item3',
      tenantId: 't1',
      categoryId: 'cat2',
      name: 'Spaghetti Carbonara',
      station: KitchenStation.HOT,
      description: 'Pasta with eggs, cheese, pancetta, and pepper.',
      price: 16.0,
      isAvailable: true,
      allergens: ['gluten', 'egg', 'dairy'],
      variants: [
        { id: 'v_carbonara_regular', name: 'Regular', price: 16.0 },
        { id: 'v_carbonara_large', name: 'Large', price: 19.0 },
      ],
      modifiers: [
        {
          id: 'm_carbonara_extras',
          name: 'Extras',
          options: [
            { id: 'o_extra_parmesan', name: 'Extra Parmesan', priceDelta: 1.25 },
            { id: 'o_extra_pancetta', name: 'Extra Pancetta', priceDelta: 2.5 },
          ],
        },
      ],
    },
    {
      id: 'item4',
      tenantId: 't1',
      categoryId: 'cat2',
      name: 'Grilled Salmon',
      station: KitchenStation.HOT,
      description: 'Served with asparagus and lemon.',
      price: 22.5,
      isAvailable: true,
    },
    {
      id: 'item5',
      tenantId: 't1',
      categoryId: 'cat2',
      name: 'Margherita Pizza',
      station: KitchenStation.HOT,
      description: 'Classic pizza with tomatoes, mozzarella, and basil.',
      price: 14.0,
      isAvailable: false,
      variants: [
        { id: 'v_pizza_small', name: 'Small', price: 10.99 },
        { id: 'v_pizza_large', name: 'Large', price: 14.99 },
      ],
      modifiers: [
        {
          id: 'm_pizza_extras',
          name: 'Extras',
          options: [
            { id: 'o_extra_cheese', name: 'Extra Cheese', priceDelta: 1.5 },
            { id: 'o_olives', name: 'Olives', priceDelta: 1.0 },
          ],
        },
      ],
    },
    {
      id: 'item6',
      tenantId: 't1',
      categoryId: 'cat3',
      name: 'Tiramisu',
      station: KitchenStation.DESSERT,
      description: 'Coffee-flavoured Italian dessert.',
      price: 9.0,
      isAvailable: true,
    },
    {
      id: 'item7',
      tenantId: 't1',
      categoryId: 'cat4',
      name: 'Water',
      station: KitchenStation.BAR,
      description: 'Still or sparkling water.',
      price: 2.0,
      isAvailable: true,
    },
    {
      id: 'item8',
      tenantId: 't1',
      categoryId: 'cat4',
      name: 'Cola',
      station: KitchenStation.BAR,
      description: 'Classic soft drink.',
      price: 3.5,
      isAvailable: true,
    },
  ],
  orders: [],
  auditLogs: [],
  __meta: { mutationCounter: 0 },
};
let db: MockDB;

let activeDbKey: string | null = null;
let forcedDbKey: string | null = null;
let isFlushingOutbox = false;

const getActiveDbKey = (): string => {
  if (forcedDbKey) return forcedDbKey;
  if (!getIsOnline()) return getClientDbKey();
  return DB_SERVER_KEY;
};

const readJson = <T>(key: string): T | null => {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
};

const getOutbox = (): OutboxItem[] => {
  const items = readJson<OutboxItem[]>(getOutboxKey());
  return Array.isArray(items) ? items : [];
};

const setOutbox = (items: OutboxItem[]) => {
  writeJson(getOutboxKey(), items);
};

const appendOutbox = (item: OutboxItem) => {
  const items = getOutbox();
  items.push(item);
  setOutbox(items);
};

const getConflicts = (): SyncConflict[] => {
  const items = readJson<SyncConflict[]>(getConflictsKey());
  return Array.isArray(items) ? items : [];
};

const appendConflict = (conflict: SyncConflict) => {
  const items = getConflicts();
  items.push(conflict);
  writeJson(getConflictsKey(), items);
};

const ensureDbLoadedForActiveKey = () => {
  const key = getActiveDbKey();
  if (activeDbKey === key && db) return;
  activeDbKey = key;
  initializeDB();
};

const initializeDB = () => {
  if (!isBrowser()) {
    db = JSON.parse(JSON.stringify(seedData));
    return;
  }

  const key = activeDbKey ?? getActiveDbKey();
  const savedDb = localStorage.getItem(key);
  if (savedDb) {
    try {
      const parsed = JSON.parse(savedDb);
      // Date hydration
      parsed.orders = parsed.orders.map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
        orderClosedAt: o.orderClosedAt ? new Date(o.orderClosedAt) : undefined,
        billRequestedAt: o.billRequestedAt ? new Date(o.billRequestedAt) : undefined,
        paymentConfirmedAt: o.paymentConfirmedAt ? new Date(o.paymentConfirmedAt) : undefined,
        discount: o.discount
          ? {
              ...o.discount,
              updatedAt: o.discount.updatedAt ? new Date(o.discount.updatedAt) : new Date(),
            }
          : undefined,
        payments: Array.isArray(o.payments)
          ? o.payments.map((p: any) => ({
              ...p,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            }))
          : undefined,
      }));
      parsed.tenants = parsed.tenants.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        trialStartAt: t.trialStartAt ? new Date(t.trialStartAt) : undefined,
        trialEndAt: t.trialEndAt ? new Date(t.trialEndAt) : undefined,
      }));

      parsed.auditLogs = Array.isArray(parsed.auditLogs)
        ? parsed.auditLogs.map((l: any) => ({
            ...l,
            createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
          }))
        : [];

      parsed.__meta = parsed.__meta && typeof parsed.__meta === 'object' ? parsed.__meta : {};
      if (typeof parsed.__meta.mutationCounter !== 'number') {
        parsed.__meta.mutationCounter = 0;
      }

      // Client cache meta defaults.
      if (!parsed.__clientMeta || typeof parsed.__clientMeta !== 'object') {
        parsed.__clientMeta = undefined;
      }
      db = parsed;
    } catch (e) {
      console.error('Failed to parse DB, seeding new data.', e);
      db = JSON.parse(JSON.stringify(seedData));
    }
  } else {
    // If we're offline and don't have a client cache yet, seed from server snapshot if it exists.
    // This simulates having a last-known cache before losing connectivity.
    if (!getIsOnline() && key.startsWith(DB_CLIENT_KEY_PREFIX)) {
      const serverSnapshot = readJson<MockDB>(DB_SERVER_KEY);
      if (serverSnapshot) {
        const seeded = JSON.parse(JSON.stringify(serverSnapshot));
        if (!seeded.__clientMeta) {
          seeded.__clientMeta = {
            lastKnownServerMutationCounter:
              typeof seeded.__meta?.mutationCounter === 'number'
                ? seeded.__meta.mutationCounter
                : 0,
          };
        }
        db = seeded;
        writeJson(key, db);
        return;
      }
    }

    db = JSON.parse(JSON.stringify(seedData));
  }
};

const saveDb = () => {
  if (!isBrowser()) return;
  const key = activeDbKey ?? getActiveDbKey();
  localStorage.setItem(key, JSON.stringify(db));
};

activeDbKey = getActiveDbKey();
initializeDB();

const getMenuItemStation = (menuItemId: string): KitchenStation => {
  const menuItem = db.menuItems.find((mi) => mi.id === menuItemId);
  if (menuItem?.station) return menuItem.station;

  // Fallback heuristic (for older data)
  if (menuItem?.categoryId === 'cat4') return KitchenStation.BAR;
  if (menuItem?.categoryId === 'cat3') return KitchenStation.DESSERT;
  return KitchenStation.HOT;
};

const simulateDelay = async (ms = 200) => {
  ensureDbLoadedForActiveKey();
  return new Promise((res) => setTimeout(res, ms));
};

type Actor = { userId: string; role: UserRole };

const getTenantById = (tenantId: string): Tenant | undefined =>
  db.tenants.find((t) => t.id === tenantId);

const assertPermission = (tenantId: string, actor: Actor, key: PermissionKey, message: string) => {
  const tenant = getTenantById(tenantId);
  if (!hasPermission(tenant ?? null, actor.role, key)) {
    throw new Error(message);
  }
};

const writeAuditLog = (
  tenantId: string,
  actor: Actor,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  metadata?: Record<string, unknown>,
) => {
  const entry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    tenantId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    createdAt: new Date(),
    metadata,
  };
  db.auditLogs.push(entry);
};

const calcOrderItemUnitPrice = (item: OrderItem): number => {
  const menuItem = db.menuItems.find((mi) => mi.id === item.menuItemId);
  if (!menuItem) return 0;

  const variantPrice =
    item.variantId && Array.isArray((menuItem as any).variants)
      ? (menuItem as any).variants.find((v: any) => v.id === item.variantId)?.price
      : undefined;

  const basePrice = Number.isFinite(variantPrice) ? Number(variantPrice) : menuItem.price;

  const selectedOptionIds = item.modifierOptionIds ?? [];
  if (selectedOptionIds.length === 0) return basePrice;

  const modifiers = (menuItem as any).modifiers;
  if (!Array.isArray(modifiers)) return basePrice;

  let modifiersTotal = 0;
  for (const mod of modifiers) {
    if (!Array.isArray(mod?.options)) continue;
    for (const opt of mod.options) {
      if (selectedOptionIds.includes(opt.id)) {
        const delta = Number(opt.priceDelta);
        modifiersTotal += Number.isFinite(delta) ? delta : 0;
      }
    }
  }

  return basePrice + modifiersTotal;
};

const calcOrderTotal = (order: Order): number => {
  const subtotal = order.items
    .filter((i) => i.status !== OrderStatus.CANCELED)
    .reduce((sum, item) => {
      if (item.isComplimentary) return sum;
      const unitPrice = calcOrderItemUnitPrice(item);
      return sum + unitPrice * item.quantity;
    }, 0);

  const discount = order.discount;
  if (!discount) return subtotal;

  if (!Number.isFinite(discount.value) || discount.value <= 0) return subtotal;

  let discountAmount = 0;
  if (discount.type === DiscountType.PERCENT) {
    const pct = Math.max(0, Math.min(100, discount.value));
    discountAmount = (subtotal * pct) / 100;
  } else {
    discountAmount = Math.max(0, discount.value);
  }

  const total = subtotal - Math.min(subtotal, discountAmount);
  return total > 0 ? total : 0;
};

export const internalSetOrderDiscount = async (
  orderId: string,
  discountType: DiscountType,
  value: number,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_DISCOUNT', 'Not authorized to update discount');

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || Number.isNaN(numericValue)) {
    throw new Error('Invalid discount value');
  }

  if (numericValue <= 0) {
    order.discount = undefined;
  } else {
    if (discountType === DiscountType.PERCENT && (numericValue < 0 || numericValue > 100)) {
      throw new Error('Invalid discount percent');
    }
    order.discount = {
      type: discountType,
      value: numericValue,
      updatedAt: new Date(),
      updatedByUserId: actor.userId,
    };
  }

  order.updatedAt = new Date();
  updatePaymentStatus(order);

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.ORDER_DISCOUNT_UPDATED,
    AuditEntityType.ORDER,
    orderId,
    { discountType, value: numericValue, removed: numericValue <= 0 },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }
  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalSetOrderDiscount',
      args: [orderId, discountType, value, actor],
    });
  }
  return cloneOrder(order);
};

export const internalSetOrderItemComplimentary = async (
  orderId: string,
  itemId: string,
  isComplimentary: boolean,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_COMPLIMENTARY', 'Not authorized to update item');

  const item = order.items.find((i) => i.id === itemId);
  if (!item) return cloneOrder(order);
  if (item.status === OrderStatus.CANCELED) return cloneOrder(order);

  item.isComplimentary = Boolean(isComplimentary);
  order.updatedAt = new Date();
  updatePaymentStatus(order);

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.ORDER_ITEM_COMPLIMENTARY_UPDATED,
    AuditEntityType.ORDER_ITEM,
    itemId,
    { orderId, isComplimentary: item.isComplimentary },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }
  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalSetOrderItemComplimentary',
      args: [orderId, itemId, isComplimentary, actor],
    });
  }
  return cloneOrder(order);
};

const calcPaidTotal = (order: Order): number => {
  return (order.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
};

const updatePaymentStatus = (order: Order) => {
  const total = calcOrderTotal(order);
  const paid = calcPaidTotal(order);

  if (total <= 0) {
    order.paymentStatus = PaymentStatus.PAID;
    return;
  }

  const remaining = total - paid;
  if (remaining <= 0.00001) {
    order.paymentStatus = PaymentStatus.PAID;
  } else if (paid > 0) {
    order.paymentStatus = PaymentStatus.PARTIALLY_PAID;
  } else {
    order.paymentStatus = PaymentStatus.UNPAID;
  }
};

// --- "BACKEND" ONLY FUNCTIONS ---
// In a real app, these would be private functions on your server.

const _internalActivateSubscription = (tenantId: string): Tenant => {
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  tenant.subscriptionStatus = SubscriptionStatus.ACTIVE;
  // In a real app, you'd also set an `activatedAt` date, subscription period, etc.
  saveDb();
  return tenant;
};

// --- API FUNCTIONS (PUBLIC-FACING) ---

export interface RegisterPayload {
  tenantName: string;
  tenantSlug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export const registerTenant = async (
  payload: RegisterPayload,
): Promise<{ user: User; tenant: Tenant } | null> => {
  await simulateDelay();
  if (
    db.tenants.some((t) => t.slug === payload.tenantSlug) ||
    db.users.some((u) => u.email.toLowerCase() === payload.adminEmail.toLowerCase())
  ) {
    return null;
  }

  const now = new Date();
  const trialEndAt = new Date(now);
  trialEndAt.setDate(now.getDate() + 7);

  const newTenant: Tenant = {
    id: `t${Date.now()}`,
    name: payload.tenantName,
    slug: payload.tenantSlug,
    defaultLanguage: 'en',
    subscriptionStatus: SubscriptionStatus.TRIAL,
    createdAt: now,
    currency: 'USD',
    timezone: 'America/New_York',
    permissions: {
      [UserRole.WAITER]: {
        ORDER_PAYMENTS: true,
        ORDER_DISCOUNT: true,
        ORDER_COMPLIMENTARY: true,
        ORDER_ITEM_CANCEL: true,
        ORDER_ITEM_SERVE: true,
        ORDER_TABLES: true,
        ORDER_CLOSE: true,
      },
      [UserRole.KITCHEN]: {
        KITCHEN_ITEM_STATUS: true,
        KITCHEN_MARK_ALL_READY: true,
      },
    },
    trialStartAt: now,
    trialEndAt: trialEndAt,
  };
  db.tenants.push(newTenant);
  const newAdminUser: User = {
    id: `u${Date.now()}`,
    tenantId: newTenant.id,
    fullName: payload.adminFullName,
    email: payload.adminEmail,
    passwordHash: payload.adminPassword,
    role: UserRole.ADMIN,
    isActive: true,
  };
  db.users.push(newAdminUser);
  saveDb();
  return { user: newAdminUser, tenant: newTenant };
};

export const login = async (
  email: string,
  passwordOrSlug: string,
): Promise<{ user: User; tenant: Tenant | null } | null> => {
  await simulateDelay();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  if (user.role === UserRole.SUPER_ADMIN && user.passwordHash === passwordOrSlug) {
    return { user, tenant: null };
  }
  if (user.passwordHash === passwordOrSlug) {
    const tenant = db.tenants.find((t) => t.id === user.tenantId);
    return tenant ? { user, tenant } : null;
  }
  return null;
};

export const getDataByTenant = async <T extends { tenantId?: string }>(
  dataType: keyof MockDB,
  tenantId: string,
): Promise<T[]> => {
  await simulateDelay();
  return (db[dataType] as unknown as T[]).filter((item) => item.tenantId === tenantId);
};

export const getAllData = async <T>(dataType: keyof MockDB): Promise<T[]> => {
  await simulateDelay();
  return db[dataType] as T[];
};

export const addData = async <T>(dataType: keyof MockDB, item: T): Promise<T> => {
  await simulateDelay();
  (db[dataType] as T[]).push(item);

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }
  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'addData',
      args: [dataType, item],
    });
  }
  return item;
};

export const updateData = async <T extends { id: string }>(
  dataType: keyof MockDB,
  updatedItem: T,
): Promise<T> => {
  await simulateDelay();
  const table = db[dataType] as unknown as T[];
  const index = table.findIndex((i) => i.id === updatedItem.id);
  if (index > -1) {
    table[index] = updatedItem;

    if (db.__meta) {
      db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
    }
    saveDb();

    if (!getIsOnline() && !isFlushingOutbox) {
      appendOutbox({
        id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        op: 'updateData',
        args: [dataType, updatedItem],
      });
    }
    return updatedItem;
  }
  throw new Error('Item not found');
};

// Complex mutations
export const internalCreateOrder = async (
  tenantId: string,
  tableId: string,
  items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note' | 'variantId' | 'modifierOptionIds'>[],
  waiterId: string,
  note?: string,
): Promise<Order> => {
  await simulateDelay();
  const waiter = db.users.find((u) => u.id === waiterId);

  const isOrderForTable = (o: Order, tId: string): boolean =>
    o.tableId === tId || (Array.isArray(o.linkedTableIds) && o.linkedTableIds.includes(tId));

  let order = db.orders.find((o) => isOrderForTable(o, tableId) && o.status !== OrderStatus.CLOSED);

  if (order) {
    if (order.status === OrderStatus.CLOSED) throw new Error('Cannot add items to a closed order.');
    const newItems: OrderItem[] = items.map((item, index) => ({
      ...item,
      id: `orditem${Date.now()}-${index}`,
      orderId: order!.id,
      status: OrderStatus.NEW,
      modifierOptionIds: item.modifierOptionIds ?? [],
    }));
    order.items.push(...newItems);
    order.updatedAt = new Date();
    if (note) {
      order.note = note;
    }
  } else {
    const orderId = `ord${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      tenantId,
      tableId,
      status: OrderStatus.NEW,
      items: items.map((item, index) => ({
        ...item,
        id: `orditem${Date.now()}-${index}`,
        orderId,
        status: OrderStatus.NEW,
        modifierOptionIds: item.modifierOptionIds ?? [],
      })),
      payments: [],
      paymentStatus: PaymentStatus.UNPAID,
      billingStatus: BillingStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
      waiterId: waiter?.id,
      waiterName: waiter?.fullName,
      note: note,
    };
    db.orders.push(newOrder);
    order = newOrder;

    if (waiter) {
      writeAuditLog(
        tenantId,
        { userId: waiter.id, role: waiter.role },
        AuditAction.ORDER_CREATED,
        AuditEntityType.ORDER,
        orderId,
        { tableId, itemsCount: items.length },
      );
    }
  }
  const table = db.tables.find((t) => t.id === tableId);
  if (table && table.status === TableStatus.FREE) {
    table.status = TableStatus.OCCUPIED;
  }

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }
  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalCreateOrder',
      args: [tenantId, tableId, items, waiterId, note],
    });
  }
  return cloneOrder(order);
};

export const internalRequestOrderBill = async (
  orderId: string,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_PAYMENTS', 'Not authorized to request bill');

  // Default for older orders
  if (!order.billingStatus) order.billingStatus = BillingStatus.OPEN;
  if (order.status === OrderStatus.CLOSED)
    throw new Error('Cannot request bill for a closed order');

  order.billingStatus = BillingStatus.BILL_REQUESTED;
  order.billRequestedAt = new Date();
  order.billRequestedByUserId = actor.userId;
  order.updatedAt = new Date();

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.ORDER_BILL_REQUESTED,
    AuditEntityType.ORDER,
    orderId,
    { tableId: order.tableId },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }
  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalRequestOrderBill',
      args: [orderId, actor],
    });
  }
  return cloneOrder(order);
};

export const internalConfirmOrderPayment = async (
  orderId: string,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_PAYMENTS', 'Not authorized to confirm payment');

  if (!order.billingStatus) order.billingStatus = BillingStatus.OPEN;
  if (order.status === OrderStatus.CLOSED)
    throw new Error('Cannot confirm payment for a closed order');

  updatePaymentStatus(order);
  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new Error('Cannot confirm payment when payment is not complete');
  }

  order.billingStatus = BillingStatus.PAID;
  order.paymentConfirmedAt = new Date();
  order.paymentConfirmedByUserId = actor.userId;
  order.updatedAt = new Date();

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.ORDER_PAYMENT_CONFIRMED,
    AuditEntityType.ORDER,
    orderId,
    { tableId: order.tableId },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }
  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalConfirmOrderPayment',
      args: [orderId, actor],
    });
  }
  return cloneOrder(order);
};

export const internalMoveOrderToTable = async (
  orderId: string,
  toTableId: string,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();

  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_TABLES', 'Not authorized to move order');
  if (order.status === OrderStatus.CLOSED) throw new Error('Cannot move a closed order');

  const fromTableId = order.tableId;
  if (fromTableId === toTableId) return cloneOrder(order);

  if (Array.isArray(order.linkedTableIds) && order.linkedTableIds.length > 0) {
    throw new Error('Cannot move a merged order');
  }

  const toTable = db.tables.find((t) => t.id === toTableId);
  if (!toTable) throw new Error('Target table not found');
  if (toTable.status !== TableStatus.FREE) {
    throw new Error('Target table is not free');
  }

  const isOrderForTable = (o: Order, tId: string): boolean =>
    o.tableId === tId || (Array.isArray(o.linkedTableIds) && o.linkedTableIds.includes(tId));

  const existingOnTarget = db.orders.some(
    (o) => o.status !== OrderStatus.CLOSED && isOrderForTable(o, toTableId) && o.id !== orderId,
  );
  if (existingOnTarget) {
    throw new Error('Target table already has an active order');
  }

  order.tableId = toTableId;
  order.updatedAt = new Date();

  const fromTable = db.tables.find((t) => t.id === fromTableId);
  if (fromTable) fromTable.status = TableStatus.FREE;
  toTable.status = TableStatus.OCCUPIED;

  writeAuditLog(order.tenantId, actor, AuditAction.ORDER_MOVED, AuditEntityType.ORDER, orderId, {
    fromTableId,
    toTableId,
  });

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }

  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalMoveOrderToTable',
      args: [orderId, toTableId, actor],
    });
  }
  return cloneOrder(order);
};

export const internalMergeOrderWithTable = async (
  orderId: string,
  secondaryTableId: string,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_TABLES', 'Not authorized to merge tables');
  if (order.status === OrderStatus.CLOSED) throw new Error('Cannot merge a closed order');

  if (order.tableId === secondaryTableId) return cloneOrder(order);

  const secondaryTable = db.tables.find((t) => t.id === secondaryTableId);
  if (!secondaryTable) throw new Error('Secondary table not found');

  const isOrderForTable = (o: Order, tId: string): boolean =>
    o.tableId === tId || (Array.isArray(o.linkedTableIds) && o.linkedTableIds.includes(tId));

  const secondaryHasActive = db.orders.some(
    (o) =>
      o.status !== OrderStatus.CLOSED && isOrderForTable(o, secondaryTableId) && o.id !== orderId,
  );
  if (secondaryHasActive) {
    throw new Error('Secondary table already has an active order');
  }

  if (!Array.isArray(order.linkedTableIds)) order.linkedTableIds = [];
  if (!order.linkedTableIds.includes(secondaryTableId)) {
    order.linkedTableIds.push(secondaryTableId);
  }

  secondaryTable.status = TableStatus.OCCUPIED;
  order.updatedAt = new Date();

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.ORDER_TABLE_MERGED,
    AuditEntityType.ORDER,
    orderId,
    { primaryTableId: order.tableId, secondaryTableId },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }

  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalMergeOrderWithTable',
      args: [orderId, secondaryTableId, actor],
    });
  }
  return cloneOrder(order);
};

export const internalUnmergeOrderFromTable = async (
  orderId: string,
  tableIdToDetach: string,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_TABLES', 'Not authorized to unmerge tables');
  if (!Array.isArray(order.linkedTableIds) || order.linkedTableIds.length === 0) {
    return cloneOrder(order);
  }

  if (!order.linkedTableIds.includes(tableIdToDetach)) {
    return cloneOrder(order);
  }

  order.linkedTableIds = order.linkedTableIds.filter((t) => t !== tableIdToDetach);
  if (order.linkedTableIds.length === 0) {
    delete (order as any).linkedTableIds;
  }

  const table = db.tables.find((t) => t.id === tableIdToDetach);
  if (table) table.status = TableStatus.FREE;

  order.updatedAt = new Date();

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.ORDER_TABLE_UNMERGED,
    AuditEntityType.ORDER,
    orderId,
    { primaryTableId: order.tableId, detachedTableId: tableIdToDetach },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }

  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalUnmergeOrderFromTable',
      args: [orderId, tableIdToDetach, actor],
    });
  }
  return cloneOrder(order);
};

export const internalUpdateOrderItemStatus = async (
  orderId: string,
  itemId: string,
  status: OrderStatus,
  actor?: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    if (actor) {
      if (status === OrderStatus.CANCELED) {
        assertPermission(
          order.tenantId,
          actor,
          'ORDER_ITEM_CANCEL',
          'Not authorized to cancel item',
        );
      } else if (status === OrderStatus.IN_PREPARATION || status === OrderStatus.READY) {
        assertPermission(
          order.tenantId,
          actor,
          'KITCHEN_ITEM_STATUS',
          'Not authorized to update kitchen item status',
        );
      }
    }

    const item = order.items.find((i) => i.id === itemId);
    if (item && item.status !== OrderStatus.SERVED && item.status !== OrderStatus.CLOSED) {
      item.status = status;
      order.updatedAt = new Date();
      if (
        order.items.every((i) => i.status === OrderStatus.READY || i.status === OrderStatus.SERVED)
      ) {
        order.status = OrderStatus.READY;
      }
      if (order.items.every((i) => i.status === OrderStatus.SERVED)) {
        order.status = OrderStatus.SERVED;
      }

      updatePaymentStatus(order);

      if (actor) {
        writeAuditLog(
          order.tenantId,
          actor,
          AuditAction.ORDER_ITEM_STATUS_UPDATED,
          AuditEntityType.ORDER_ITEM,
          itemId,
          { orderId, newStatus: status },
        );
      }

      if (db.__meta) {
        db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
      }
      saveDb();

      if (!getIsOnline() && !isFlushingOutbox) {
        appendOutbox({
          id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          op: 'internalUpdateOrderItemStatus',
          args: [orderId, itemId, status, actor],
        });
      }
    }
    return cloneOrder(order);
  }
  return undefined;
};

export const internalMarkOrderAsReady = async (
  orderId: string,
  station?: KitchenStation,
  actor?: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    if (actor) {
      assertPermission(
        order.tenantId,
        actor,
        'KITCHEN_MARK_ALL_READY',
        'Not authorized to mark all items ready',
      );
    }

    order.items.forEach((item) => {
      const matchesStation = station ? getMenuItemStation(item.menuItemId) === station : true;
      if (
        matchesStation &&
        (item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION)
      )
        item.status = OrderStatus.READY;
    });

    if (
      order.items.every((i) => i.status === OrderStatus.SERVED || i.status === OrderStatus.CANCELED)
    ) {
      order.status = OrderStatus.SERVED;
    } else if (
      order.items.every((i) =>
        [OrderStatus.READY, OrderStatus.SERVED, OrderStatus.CANCELED].includes(i.status),
      )
    ) {
      order.status = OrderStatus.READY;
    }

    order.updatedAt = new Date();
    updatePaymentStatus(order);

    if (db.__meta) {
      db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
    }
    saveDb();

    if (!getIsOnline() && !isFlushingOutbox) {
      appendOutbox({
        id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        op: 'internalMarkOrderAsReady',
        args: [orderId, station, actor],
      });
    }
    return cloneOrder(order);
  }
  return undefined;
};

export const internalServeOrderItem = async (
  orderId: string,
  itemId: string,
  actor?: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    if (actor) {
      assertPermission(order.tenantId, actor, 'ORDER_ITEM_SERVE', 'Not authorized to serve item');
    }

    const item = order.items.find((i) => i.id === itemId);
    if (item && item.status === OrderStatus.READY) {
      item.status = OrderStatus.SERVED;
      order.updatedAt = new Date();
      // Check if the whole order is now served
      if (
        order.items.every(
          (i) => i.status === OrderStatus.SERVED || i.status === OrderStatus.CANCELED,
        )
      ) {
        order.status = OrderStatus.SERVED;
      }

      updatePaymentStatus(order);

      if (actor) {
        writeAuditLog(
          order.tenantId,
          actor,
          AuditAction.ORDER_ITEM_STATUS_UPDATED,
          AuditEntityType.ORDER_ITEM,
          itemId,
          { orderId, newStatus: OrderStatus.SERVED },
        );
      }

      if (db.__meta) {
        db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
      }
      saveDb();

      if (!getIsOnline() && !isFlushingOutbox) {
        appendOutbox({
          id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          op: 'internalServeOrderItem',
          args: [orderId, itemId, actor],
        });
      }
    }
    return cloneOrder(order);
  }
  return undefined;
};

export const internalAddOrderPayment = async (
  orderId: string,
  method: PaymentMethod,
  amount: number,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return undefined;

  assertPermission(order.tenantId, actor, 'ORDER_PAYMENTS', 'Not authorized to add payment');

  if (amount <= 0 || Number.isNaN(amount) || !Number.isFinite(amount)) {
    throw new Error('Invalid amount');
  }

  const payment: PaymentLine = {
    id: `pay_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    orderId,
    method,
    amount,
    createdAt: new Date(),
    createdByUserId: actor.userId,
  };

  if (!order.payments) order.payments = [];
  order.payments.push(payment);
  order.updatedAt = new Date();
  updatePaymentStatus(order);

  writeAuditLog(
    order.tenantId,
    actor,
    AuditAction.PAYMENT_ADDED,
    AuditEntityType.PAYMENT,
    payment.id,
    {
      orderId,
      method,
      amount,
    },
  );

  if (db.__meta) {
    db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
  }

  saveDb();

  if (!getIsOnline() && !isFlushingOutbox) {
    appendOutbox({
      id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      op: 'internalAddOrderPayment',
      args: [orderId, method, amount, actor],
    });
  }
  return cloneOrder(order);
};

export const internalCloseOrder = async (
  orderId: string,
  actor: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    assertPermission(order.tenantId, actor, 'ORDER_CLOSE', 'Not authorized to close order');

    updatePaymentStatus(order);
    if (!order.billingStatus) order.billingStatus = BillingStatus.OPEN;

    if (
      order.status === OrderStatus.SERVED &&
      order.paymentStatus === PaymentStatus.PAID &&
      order.billingStatus === BillingStatus.PAID
    ) {
      order.status = OrderStatus.CLOSED;
      order.orderClosedAt = new Date();
      order.updatedAt = new Date();

      const table = db.tables.find((t) => t.id === order.tableId);
      if (table) {
        table.status = TableStatus.FREE;
      }

      if (Array.isArray(order.linkedTableIds)) {
        for (const linkedId of order.linkedTableIds) {
          const linked = db.tables.find((t) => t.id === linkedId);
          if (linked) linked.status = TableStatus.FREE;
        }
      }

      writeAuditLog(
        order.tenantId,
        actor,
        AuditAction.ORDER_CLOSED,
        AuditEntityType.ORDER,
        orderId,
        { tableId: order.tableId },
      );

      if (db.__meta) {
        db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
      }
      saveDb();

      if (!getIsOnline() && !isFlushingOutbox) {
        appendOutbox({
          id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          op: 'internalCloseOrder',
          args: [orderId, actor],
        });
      }
    }
    return cloneOrder(order);
  }
  return undefined;
};

export const internalUpdateTableStatus = async (
  tableId: string,
  status: TableStatus,
): Promise<Table | undefined> => {
  await simulateDelay();
  const table = db.tables.find((t) => t.id === tableId);
  if (table) {
    table.status = status;

    if (db.__meta) {
      db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
    }
    saveDb();

    if (!getIsOnline() && !isFlushingOutbox) {
      appendOutbox({
        id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        op: 'internalUpdateTableStatus',
        args: [tableId, status],
      });
    }
    return cloneTable(table);
  }
  return undefined;
};

export const internalUpdateOrderNote = async (
  orderId: string,
  note: string,
  actor?: Actor,
): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    order.note = note;
    order.updatedAt = new Date();

    if (actor) {
      writeAuditLog(
        order.tenantId,
        actor,
        AuditAction.ORDER_NOTE_UPDATED,
        AuditEntityType.ORDER,
        orderId,
        { hasNote: Boolean(note && note.trim().length > 0) },
      );
    }

    if (db.__meta) {
      db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
    }

    saveDb();

    if (!getIsOnline() && !isFlushingOutbox) {
      appendOutbox({
        id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        op: 'internalUpdateOrderNote',
        args: [orderId, note, actor],
      });
    }
    return cloneOrder(order);
  }
  return undefined;
};

export const internalGetSummaryReport = async (
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<SummaryReport> => {
  await simulateDelay(500);

  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const closedOrders = db.orders.filter((order) => {
    if (
      order.tenantId !== tenantId ||
      order.status !== OrderStatus.CLOSED ||
      !order.orderClosedAt
    ) {
      return false;
    }
    const closedDate = new Date(order.orderClosedAt);
    return closedDate >= start && closedDate <= end;
  });

  let totalRevenue = 0;
  let grossSales = 0;
  let discountTotal = 0;
  let complimentaryTotal = 0;
  let canceledItemsCount = 0;
  let canceledItemsAmount = 0;

  const paymentAggregation: Record<PaymentMethod, number> = {
    [PaymentMethod.CASH]: 0,
    [PaymentMethod.CARD]: 0,
    [PaymentMethod.MEAL_CARD]: 0,
  };
  const itemAggregation: Record<string, { quantity: number; revenue: number }> = {};
  const waiterAggregation: Record<
    string,
    { waiterName: string; totalOrders: number; totalRevenue: number }
  > = {};

  for (const order of closedOrders) {
    const orderNet = calcOrderTotal(order);

    const orderSubtotal = order.items
      .filter((i) => i.status !== OrderStatus.CANCELED)
      .reduce((sum, item) => {
        if (item.isComplimentary) return sum;
        const unitPrice = calcOrderItemUnitPrice(item);
        return sum + unitPrice * item.quantity;
      }, 0);

    const orderComplimentary = order.items
      .filter((i) => i.status !== OrderStatus.CANCELED)
      .reduce((sum, item) => {
        if (!item.isComplimentary) return sum;
        const unitPrice = calcOrderItemUnitPrice(item);
        return sum + unitPrice * item.quantity;
      }, 0);

    const orderDiscount = Math.max(0, orderSubtotal - orderNet);

    grossSales += orderSubtotal;
    discountTotal += orderDiscount;
    complimentaryTotal += orderComplimentary;
    totalRevenue += orderNet;

    const waiterId = order.waiterId || 'unknown';
    const waiterName =
      order.waiterName || db.users.find((u) => u.id === order.waiterId)?.fullName || 'Unknown';
    if (!waiterAggregation[waiterId]) {
      waiterAggregation[waiterId] = { waiterName, totalOrders: 0, totalRevenue: 0 };
    }
    waiterAggregation[waiterId].totalOrders += 1;
    waiterAggregation[waiterId].totalRevenue += orderNet;

    for (const item of order.items) {
      if (item.status !== OrderStatus.CANCELED) continue;
      canceledItemsCount += item.quantity;
      canceledItemsAmount += calcOrderItemUnitPrice(item) * item.quantity;
    }

    if (Array.isArray(order.payments)) {
      for (const p of order.payments) {
        if (!p?.method) continue;
        const amount = Number(p.amount);
        if (!Number.isFinite(amount) || amount <= 0) continue;

        if ((paymentAggregation as any)[p.method] === undefined) {
          (paymentAggregation as any)[p.method] = 0;
        }
        (paymentAggregation as any)[p.method] += amount;
      }
    }

    for (const item of order.items) {
      if (item.status === OrderStatus.CANCELED) continue;
      if (item.isComplimentary) continue;

      const menuItem = db.menuItems.find((mi) => mi.id === item.menuItemId);
      const unit = calcOrderItemUnitPrice(item);
      const itemRevenue = item.quantity * unit;

      const key = menuItem?.id ?? item.menuItemId;
      if (!itemAggregation[key]) {
        itemAggregation[key] = { quantity: 0, revenue: 0 };
      }
      itemAggregation[key].quantity += item.quantity;
      itemAggregation[key].revenue += itemRevenue;
    }
  }

  const topItems: TopItem[] = Object.keys(itemAggregation)
    .map((menuItemId) => {
      const menuItem = db.menuItems.find((mi) => mi.id === menuItemId);
      return {
        name: menuItem?.name || 'Unknown Item',
        quantity: itemAggregation[menuItemId].quantity,
        revenue: itemAggregation[menuItemId].revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalOrders = closedOrders.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const paymentsByMethod: PaymentMethodTotal[] = Object.entries(paymentAggregation)
    .map(([method, amount]) => ({ method: method as PaymentMethod, amount }))
    .filter((x) => x.amount > 0);

  const endOfDay: EndOfDaySummary = {
    grossSales,
    discountTotal,
    complimentaryTotal,
    netSales: totalRevenue,
    paymentsByMethod,
    canceledItemsCount,
    canceledItemsAmount,
  };

  const waiterStats: WaiterStat[] = Object.entries(waiterAggregation)
    .map(([waiterId, s]) => {
      const avg = s.totalOrders > 0 ? s.totalRevenue / s.totalOrders : 0;
      return {
        waiterId,
        waiterName: s.waiterName,
        totalOrders: s.totalOrders,
        totalRevenue: s.totalRevenue,
        averageTicket: avg,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    startDate,
    endDate,
    totalOrders,
    totalRevenue,
    averageTicket,
    topItems,
    waiterStats,
    endOfDay,
  };
};

export const internalChangeUserPassword = async (
  userId: string,
  newPassword: string,
): Promise<void> => {
  await simulateDelay();
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    // In a real app, you would hash this password
    user.passwordHash = newPassword;

    if (db.__meta) {
      db.__meta.mutationCounter = (db.__meta.mutationCounter ?? 0) + 1;
    }
    saveDb();

    if (!getIsOnline() && !isFlushingOutbox) {
      appendOutbox({
        id: `out_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        op: 'internalChangeUserPassword',
        args: [userId, newPassword],
      });
    }
  } else {
    throw new Error('User not found');
  }
};

export const flushOutbox = async (): Promise<{
  applied: number;
  conflicts: number;
  remaining: number;
}> => {
  if (!isBrowser()) return { applied: 0, conflicts: 0, remaining: 0 };

  // Only makes sense when we are online.
  if (!getIsOnline()) {
    return { applied: 0, conflicts: 0, remaining: getOutbox().length };
  }

  const clientKey = getClientDbKey();
  const clientSnapshot = readJson<MockDB>(clientKey);
  const outbox = getOutbox();
  if (!clientSnapshot || outbox.length === 0) {
    return { applied: 0, conflicts: 0, remaining: outbox.length };
  }

  const serverSnapshot = readJson<MockDB>(DB_SERVER_KEY);
  const serverCounter = Number(serverSnapshot?.__meta?.mutationCounter ?? 0);
  const clientCounter = Number(clientSnapshot.__clientMeta?.lastKnownServerMutationCounter ?? 0);

  const hasPotentialConflict = serverCounter !== clientCounter;
  if (hasPotentialConflict) {
    appendConflict({
      id: `conf_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      occurredAt: new Date().toISOString(),
      reason: 'Server changed while offline; applying LWW replay',
      serverMutationCounter: serverCounter,
      clientLastKnownServerMutationCounter: clientCounter,
      appliedOutboxCount: outbox.length,
    });
  }

  // Replay operations onto the server DB.
  isFlushingOutbox = true;
  const prevForced = forcedDbKey;
  forcedDbKey = DB_SERVER_KEY;
  try {
    let applied = 0;
    for (const item of outbox) {
      switch (item.op) {
        case 'addData': {
          await addData(item.args[0] as any, item.args[1] as any);
          break;
        }
        case 'updateData': {
          await updateData(item.args[0] as any, item.args[1] as any);
          break;
        }
        case 'internalUpdateTableStatus': {
          await internalUpdateTableStatus(item.args[0] as string, item.args[1] as TableStatus);
          break;
        }
        case 'internalCreateOrder': {
          await internalCreateOrder(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as any,
            item.args[3] as string,
            item.args[4] as any,
          );
          break;
        }
        case 'internalUpdateOrderItemStatus': {
          await internalUpdateOrderItemStatus(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as OrderStatus,
            item.args[3] as any,
          );
          break;
        }
        case 'internalMarkOrderAsReady': {
          await internalMarkOrderAsReady(
            item.args[0] as string,
            item.args[1] as any,
            item.args[2] as any,
          );
          break;
        }
        case 'internalServeOrderItem': {
          await internalServeOrderItem(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as any,
          );
          break;
        }
        case 'internalCloseOrder': {
          await internalCloseOrder(item.args[0] as string, item.args[1] as any);
          break;
        }
        case 'internalUpdateOrderNote': {
          await internalUpdateOrderNote(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as any,
          );
          break;
        }
        case 'internalAddOrderPayment': {
          await internalAddOrderPayment(
            item.args[0] as string,
            item.args[1] as PaymentMethod,
            item.args[2] as number,
            item.args[3] as any,
          );
          break;
        }

        case 'internalRequestOrderBill': {
          await internalRequestOrderBill(item.args[0] as string, item.args[1] as any);
          break;
        }

        case 'internalConfirmOrderPayment': {
          await internalConfirmOrderPayment(item.args[0] as string, item.args[1] as any);
          break;
        }
        case 'internalSetOrderDiscount': {
          await internalSetOrderDiscount(
            item.args[0] as string,
            item.args[1] as DiscountType,
            item.args[2] as number,
            item.args[3] as any,
          );
          break;
        }
        case 'internalSetOrderItemComplimentary': {
          await internalSetOrderItemComplimentary(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as boolean,
            item.args[3] as any,
          );
          break;
        }
        case 'internalMoveOrderToTable': {
          await internalMoveOrderToTable(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as any,
          );
          break;
        }
        case 'internalMergeOrderWithTable': {
          await internalMergeOrderWithTable(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as any,
          );
          break;
        }
        case 'internalUnmergeOrderFromTable': {
          await internalUnmergeOrderFromTable(
            item.args[0] as string,
            item.args[1] as string,
            item.args[2] as any,
          );
          break;
        }
        case 'internalChangeUserPassword': {
          await internalChangeUserPassword(item.args[0] as string, item.args[1] as string);
          break;
        }
        case 'createPaymentIntent': {
          await createPaymentIntent(item.args[0] as any, item.args[1] as any);
          break;
        }
        case 'simulateWebhookPaymentSucceeded': {
          await simulateWebhookPaymentSucceeded(item.args[0] as string);
          break;
        }
        default: {
          // Exhaustive guard
          const _never: never = item.op;
          throw new Error(`Unsupported outbox op: ${_never}`);
        }
      }
      applied += 1;
    }

    // Clear outbox.
    setOutbox([]);

    // Refresh the client cache from the server snapshot after replay.
    const latestServer = readJson<MockDB>(DB_SERVER_KEY);
    const nextClient: MockDB = latestServer
      ? {
          ...latestServer,
          __clientMeta: {
            lastKnownServerMutationCounter: Number(latestServer.__meta?.mutationCounter ?? 0),
          },
        }
      : {
          ...JSON.parse(JSON.stringify(seedData)),
          __clientMeta: { lastKnownServerMutationCounter: 0 },
        };

    writeJson(clientKey, nextClient);

    // If we were previously running on client DB, reload so UI sees newest.
    ensureDbLoadedForActiveKey();

    return { applied, conflicts: hasPotentialConflict ? 1 : 0, remaining: 0 };
  } finally {
    forcedDbKey = prevForced;
    isFlushingOutbox = false;
  }
};

export const createPaymentIntent = async (
  _amount: number,
  _currency: string,
): Promise<{ clientSecret: string }> => {
  await simulateDelay(500);
  // This is a mock secret. In a real app, this would be generated by your server
  // after creating a PaymentIntent with the Stripe API.
  return { clientSecret: `pi_${Date.now()}_secret_${Date.now()}` };
};

// This function simulates the backend receiving a webhook from Stripe after a successful payment.
export const simulateWebhookPaymentSucceeded = async (tenantId: string): Promise<Tenant> => {
  // Add a longer delay to mimic network latency and backend processing.
  await simulateDelay(1500);
  console.log(
    `SIMULATING WEBHOOK: Payment succeeded for tenant ${tenantId}. Activating subscription.`,
  );
  return _internalActivateSubscription(tenantId);
};
