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
    CLOSED = 'CLOSED',
}

export enum SubscriptionStatus {
    TRIAL = 'TRIAL',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELED = 'CANCELED',
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