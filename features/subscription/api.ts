import { internalActivateSubscription } from '../../shared/lib/mockApi';
import { Tenant } from '../../shared/types';

export const activateSubscription = (tenantId: string): Promise<Tenant> => {
    return internalActivateSubscription(tenantId);
};
