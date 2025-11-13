import { SubscriptionStatus } from '../../shared/types';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    defaultLanguage: 'tr' | 'en' | 'fr';
    subscriptionStatus: SubscriptionStatus;
    createdAt: Date;
}
