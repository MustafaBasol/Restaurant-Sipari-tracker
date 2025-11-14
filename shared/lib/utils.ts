import { Tenant, SubscriptionStatus } from '../types';

export const formatCurrency = (amount: number, currency: string): string => {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
        }).format(amount);
    } catch (e) {
        // Fallback for invalid currency code
        console.warn(`Invalid currency code: ${currency}`);
        return `$${amount.toFixed(2)}`;
    }
};

export const formatDateTime = (date: Date | string, timeZone: string, options?: Intl.DateTimeFormatOptions): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(undefined, {
            ...options,
            timeZone,
        }).format(dateObj);
    } catch (e) {
        console.warn(`Invalid timezone or date: ${timeZone}`, date);
        // Fallback
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleString();
    }
};

export const getTrialDaysLeft = (tenant: Tenant): number => {
    if (tenant.subscriptionStatus !== SubscriptionStatus.TRIAL || !tenant.trialEndAt) {
        return 0;
    }
    const trialEndAt = new Date(tenant.trialEndAt);
    const now = new Date();
    const diffTime = trialEndAt.getTime() - now.getTime();
    if (diffTime <= 0) {
        return 0;
    }
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isSubscriptionActive = (tenant: Tenant): boolean => {
    if (tenant.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        return true;
    }
    if (tenant.subscriptionStatus === SubscriptionStatus.TRIAL) {
        const daysLeft = getTrialDaysLeft(tenant);
        return daysLeft > 0;
    }
    return false;
};
