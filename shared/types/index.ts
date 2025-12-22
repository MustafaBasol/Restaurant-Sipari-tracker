export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
}

export type PermissionKey =
  | 'ORDER_PAYMENTS'
  | 'ORDER_DISCOUNT'
  | 'ORDER_COMPLIMENTARY'
  | 'ORDER_ITEM_CANCEL'
  | 'ORDER_ITEM_SERVE'
  | 'ORDER_TABLES'
  | 'ORDER_CLOSE'
  | 'KITCHEN_ITEM_STATUS'
  | 'KITCHEN_MARK_ALL_READY';

export type RolePermissions = Partial<Record<PermissionKey, boolean>>;
export type TenantPermissions = Partial<Record<UserRole, RolePermissions>>;

export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  CLOSED = 'CLOSED',
}

export enum OrderStatus {
  NEW = 'NEW',
  IN_PREPARATION = 'IN_PREPARATION',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELED = 'CANCELED',
  CLOSED = 'CLOSED',
}

export enum KitchenStation {
  BAR = 'BAR',
  HOT = 'HOT',
  COLD = 'COLD',
  DESSERT = 'DESSERT',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  MEAL_CARD = 'MEAL_CARD',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum BillingStatus {
  OPEN = 'OPEN',
  BILL_REQUESTED = 'BILL_REQUESTED',
  PAID = 'PAID',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

export enum AuditEntityType {
  ORDER = 'ORDER',
  ORDER_ITEM = 'ORDER_ITEM',
  PAYMENT = 'PAYMENT',
}

export enum AuditAction {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_ITEM_STATUS_UPDATED = 'ORDER_ITEM_STATUS_UPDATED',
  ORDER_NOTE_UPDATED = 'ORDER_NOTE_UPDATED',
  PAYMENT_ADDED = 'PAYMENT_ADDED',
  ORDER_DISCOUNT_UPDATED = 'ORDER_DISCOUNT_UPDATED',
  ORDER_ITEM_COMPLIMENTARY_UPDATED = 'ORDER_ITEM_COMPLIMENTARY_UPDATED',
  ORDER_BILL_REQUESTED = 'ORDER_BILL_REQUESTED',
  ORDER_PAYMENT_CONFIRMED = 'ORDER_PAYMENT_CONFIRMED',
  ORDER_CLOSED = 'ORDER_CLOSED',
  ORDER_MOVED = 'ORDER_MOVED',
  ORDER_TABLE_MERGED = 'ORDER_TABLE_MERGED',
  ORDER_TABLE_UNMERGED = 'ORDER_TABLE_UNMERGED',
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorRole: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TenantPrintConfig {
  mode: 'browser' | 'server';
  serverUrl?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  defaultLanguage: 'tr' | 'en' | 'fr';
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  currency: string; // e.g. 'USD', 'EUR', 'TRY'
  timezone: string; // e.g. 'America/New_York'
  trialStartAt?: Date;
  trialEndAt?: Date;
  printConfig?: TenantPrintConfig;
  taxRatePercent?: number;
  serviceChargePercent?: number;
  roundingIncrement?: number;
  permissions?: TenantPermissions;
}

export interface User {
  id: string;
  tenantId?: string; // Optional for SUPER_ADMIN
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}

// Below types are aliased and moved to feature folders
// to demonstrate splitting types by feature.
// In a real app, you might keep them here or move them.
// For this refactoring, we will move them.
