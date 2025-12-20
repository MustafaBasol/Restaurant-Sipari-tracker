import { getAllData, updateData } from '../../shared/lib/mockApi';
import { Tenant } from './types';
import { User } from '../users/types';
import { SubscriptionStatus } from '../../shared/types';

export const getAllTenants = () => getAllData<Tenant>('tenants');
export const getAllUsers = () => getAllData<User>('users');

export const updateTenantSubscription = async (
  tenantId: string,
  status: SubscriptionStatus,
): Promise<Tenant> => {
  // This requires getting the tenant first, then updating.
  const tenants = await getAllData<Tenant>('tenants');
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const updatedTenant = { ...tenant, subscriptionStatus: status };
  return updateData('tenants', updatedTenant);
};
