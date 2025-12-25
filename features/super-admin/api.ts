import { deleteData, getAllData, updateData } from '../../shared/lib/mockApi';
import { Tenant } from './types';
import { User } from '../users/types';
import { SubscriptionStatus } from '../../shared/types';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

export const getAllTenants = async () => {
  if (!isRealApiEnabled()) return getAllData<Tenant>('tenants');
  return apiFetch<Tenant[]>('/super-admin/tenants', { method: 'GET' });
};

export const getAllUsers = async () => {
  if (!isRealApiEnabled()) return getAllData<User>('users');
  return apiFetch<User[]>('/super-admin/users', { method: 'GET' });
};

export const updateTenantSubscription = async (
  tenantId: string,
  status: SubscriptionStatus,
): Promise<Tenant> => {
  if (isRealApiEnabled()) {
    return apiFetch<Tenant>(`/super-admin/tenants/${tenantId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Mock-mode: requires getting the tenant first, then updating.
  const tenants = await getAllData<Tenant>('tenants');
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new Error('Tenant not found');
  const updatedTenant = { ...tenant, subscriptionStatus: status };
  return updateData('tenants', updatedTenant);
};

export const deleteTenant = async (tenantId: string): Promise<boolean> => {
  if (isRealApiEnabled()) {
    await apiFetch<boolean>(`/super-admin/tenants/${tenantId}`, { method: 'DELETE' });
    return true;
  }
  await deleteData('tenants', tenantId);
  return true;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  if (isRealApiEnabled()) {
    await apiFetch<boolean>(`/super-admin/users/${userId}`, { method: 'DELETE' });
    return true;
  }
  await deleteData('users', userId);
  return true;
};

export const verifyUserEmail = async (userId: string) => {
  if (isRealApiEnabled()) {
    return apiFetch<any>(`/super-admin/users/${userId}/verify-email`, { method: 'POST' });
  }

  // Mock-mode: treat as verified. (Best-effort; structure of mock users may vary)
  const users = await getAllData<any>('users');
  const user = users.find((u: any) => u.id === userId);
  if (!user) throw new Error('User not found');
  const updated = { ...user, emailVerifiedAt: new Date().toISOString() };
  return updateData('users', updated);
};
