import {
  Tenant,
  User,
  SubscriptionStatus,
  UserRole,
  TableStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  AuditLog,
  AuditAction,
  AuditEntityType,
} from '../types';
import { Table } from '../../features/tables/types';
import { MenuCategory, MenuItem } from '../../features/menu/types';
import { Order, OrderItem, PaymentLine } from '../../features/orders/types';
import { SummaryReport, TopItem } from '../../features/reports/types';

const cloneOrder = (order: Order): Order => ({
  ...order,
  items: order.items.map((i) => ({ ...i })),
  discount: order.discount ? { ...order.discount } : undefined,
  payments: order.payments ? order.payments.map((p) => ({ ...p })) : undefined,
});

const cloneTable = (table: Table): Table => ({ ...table });

// --- MOCK DATABASE ---

interface MockDB {
  tenants: Tenant[];
  users: User[];
  tables: Table[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  auditLogs: AuditLog[];
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
      description: 'Grilled bread with tomatoes, garlic, and basil.',
      price: 8.5,
      isAvailable: true,
    },
    {
      id: 'item2',
      tenantId: 't1',
      categoryId: 'cat1',
      name: 'Calamari',
      description: 'Fried squid rings with dipping sauce.',
      price: 12.0,
      isAvailable: true,
    },
    {
      id: 'item3',
      tenantId: 't1',
      categoryId: 'cat2',
      name: 'Spaghetti Carbonara',
      description: 'Pasta with eggs, cheese, pancetta, and pepper.',
      price: 16.0,
      isAvailable: true,
    },
    {
      id: 'item4',
      tenantId: 't1',
      categoryId: 'cat2',
      name: 'Grilled Salmon',
      description: 'Served with asparagus and lemon.',
      price: 22.5,
      isAvailable: true,
    },
    {
      id: 'item5',
      tenantId: 't1',
      categoryId: 'cat2',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomatoes, mozzarella, and basil.',
      price: 14.0,
      isAvailable: false,
    },
    {
      id: 'item6',
      tenantId: 't1',
      categoryId: 'cat3',
      name: 'Tiramisu',
      description: 'Coffee-flavoured Italian dessert.',
      price: 9.0,
      isAvailable: true,
    },
    {
      id: 'item7',
      tenantId: 't1',
      categoryId: 'cat4',
      name: 'Water',
      description: 'Still or sparkling water.',
      price: 2.0,
      isAvailable: true,
    },
    {
      id: 'item8',
      tenantId: 't1',
      categoryId: 'cat4',
      name: 'Cola',
      description: 'Classic soft drink.',
      price: 3.5,
      isAvailable: true,
    },
  ],
  orders: [],
  auditLogs: [],
};

let db: MockDB;

const initializeDB = () => {
  const savedDb = localStorage.getItem('kitchorify-db');
  if (savedDb) {
    try {
      const parsed = JSON.parse(savedDb);
      // Date hydration
      parsed.orders = parsed.orders.map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
        orderClosedAt: o.orderClosedAt ? new Date(o.orderClosedAt) : undefined,
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
      db = parsed;
    } catch (e) {
      console.error('Failed to parse DB, seeding new data.', e);
      db = JSON.parse(JSON.stringify(seedData));
    }
  } else {
    db = JSON.parse(JSON.stringify(seedData));
  }
};

const saveDb = () => {
  localStorage.setItem('kitchorify-db', JSON.stringify(db));
};

initializeDB();

const simulateDelay = (ms = 200) => new Promise((res) => setTimeout(res, ms));

type Actor = { userId: string; role: UserRole };

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

const calcOrderTotal = (order: Order): number => {
  const subtotal = order.items
    .filter((i) => i.status !== OrderStatus.CANCELED)
    .reduce((sum, item) => {
      if (item.isComplimentary) return sum;
      const menuItem = db.menuItems.find((mi) => mi.id === item.menuItemId);
      return sum + (menuItem ? menuItem.price * item.quantity : 0);
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

  if (![UserRole.WAITER, UserRole.ADMIN].includes(actor.role)) {
    throw new Error('Not authorized to update discount');
  }

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

  saveDb();
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

  if (![UserRole.WAITER, UserRole.ADMIN].includes(actor.role)) {
    throw new Error('Not authorized to update item');
  }

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

  saveDb();
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
  saveDb();
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
    saveDb();
    return updatedItem;
  }
  throw new Error('Item not found');
};

// Complex mutations
export const internalCreateOrder = async (
  tenantId: string,
  tableId: string,
  items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[],
  waiterId: string,
  note?: string,
): Promise<Order> => {
  await simulateDelay();
  const waiter = db.users.find((u) => u.id === waiterId);
  let order = db.orders.find((o) => o.tableId === tableId && o.status !== OrderStatus.CLOSED);

  if (order) {
    if (order.status === OrderStatus.CLOSED) throw new Error('Cannot add items to a closed order.');
    const newItems: OrderItem[] = items.map((item, index) => ({
      ...item,
      id: `orditem${Date.now()}-${index}`,
      orderId: order!.id,
      status: OrderStatus.NEW,
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
      })),
      payments: [],
      paymentStatus: PaymentStatus.UNPAID,
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
  saveDb();
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
      saveDb();
    }
    return cloneOrder(order);
  }
  return undefined;
};

export const internalMarkOrderAsReady = async (orderId: string): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    order.items.forEach((item) => {
      if (item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION)
        item.status = OrderStatus.READY;
    });
    order.status = OrderStatus.READY;
    order.updatedAt = new Date();
    saveDb();
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
      saveDb();
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

  if (![UserRole.WAITER, UserRole.ADMIN].includes(actor.role)) {
    throw new Error('Not authorized to add payment');
  }

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

  writeAuditLog(order.tenantId, actor, AuditAction.PAYMENT_ADDED, AuditEntityType.PAYMENT, payment.id, {
    orderId,
    method,
    amount,
  });

  saveDb();
  return cloneOrder(order);
};

export const internalCloseOrder = async (orderId: string, actor: Actor): Promise<Order | undefined> => {
  await simulateDelay();
  const order = db.orders.find((o) => o.id === orderId);
  if (order) {
    if (![UserRole.WAITER, UserRole.ADMIN].includes(actor.role)) {
      throw new Error('Not authorized to close order');
    }

    updatePaymentStatus(order);
    if (order.status === OrderStatus.SERVED && order.paymentStatus === PaymentStatus.PAID) {
      order.status = OrderStatus.CLOSED;
      order.orderClosedAt = new Date();
      order.updatedAt = new Date();

      const table = db.tables.find((t) => t.id === order.tableId);
      if (table) {
        table.status = TableStatus.FREE;
      }

      writeAuditLog(
        order.tenantId,
        actor,
        AuditAction.ORDER_CLOSED,
        AuditEntityType.ORDER,
        orderId,
        { tableId: order.tableId },
      );
      saveDb();
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
    saveDb();
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

    saveDb();
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
  const itemAggregation: { [key: string]: { quantity: number; revenue: number } } = {};

  closedOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.status === OrderStatus.CANCELED) return;
      const menuItem = db.menuItems.find((mi) => mi.id === item.menuItemId);
      if (menuItem) {
        const itemRevenue = item.quantity * menuItem.price;
        totalRevenue += itemRevenue;

        if (!itemAggregation[menuItem.id]) {
          itemAggregation[menuItem.id] = { quantity: 0, revenue: 0 };
        }
        itemAggregation[menuItem.id].quantity += item.quantity;
        itemAggregation[menuItem.id].revenue += itemRevenue;
      }
    });
  });

  const topItems: TopItem[] = Object.keys(itemAggregation)
    .map((menuItemId) => {
      const menuItem = db.menuItems.find((mi) => mi.id === menuItemId);
      return {
        name: menuItem?.name || 'Unknown Item',
        quantity: itemAggregation[menuItem.id].quantity,
        revenue: itemAggregation[menuItem.id].revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalOrders = closedOrders.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    startDate,
    endDate,
    totalOrders,
    totalRevenue,
    averageTicket,
    topItems,
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
    saveDb();
  } else {
    throw new Error('User not found');
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
