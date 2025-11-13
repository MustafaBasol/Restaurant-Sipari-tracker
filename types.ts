export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    WAITER = 'WAITER',
    KITCHEN = 'KITCHEN',
}

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
}

export enum SubscriptionStatus {
    TRIAL = 'TRIAL',
    ACTIVE = 'ACTIVE',
    CANCELED = 'CANCELED',
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    defaultLanguage: 'tr' | 'en' | 'fr';
    subscriptionStatus: SubscriptionStatus;
    createdAt: Date;
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

export interface Table {
    id: string;
    tenantId: string;
    name: string;
    status: TableStatus;
}

export interface MenuCategory {
    id: string;
    tenantId: string;
    name: string;
}

export interface MenuItem {
    id: string;
    tenantId: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    isAvailable: boolean;
}

export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    note: string;
    status: OrderStatus;
}

export interface Order {
    id: string;
    tenantId: string;
    tableId: string;
    status: OrderStatus;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
