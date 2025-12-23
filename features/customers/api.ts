import { addData, getDataByTenant, updateData } from '../../shared/lib/mockApi';
import { Customer } from './types';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

const hydrateCustomer = (c: any): Customer => ({
  ...c,
  createdAt: c?.createdAt ? new Date(c.createdAt) : new Date(),
});

export const getCustomers = async (tenantId: string) => {
  if (!isRealApiEnabled()) return getDataByTenant<Customer>('customers', tenantId);
  const customers = await apiFetch<any[]>('/customers', { method: 'GET' });
  return customers.map(hydrateCustomer);
};

export const createCustomer = async (
  tenantId: string,
  fullName: string,
  phone?: string,
  email?: string,
) => {
  if (isRealApiEnabled()) {
    const created = await apiFetch<any>('/customers', {
      method: 'POST',
      body: JSON.stringify({ fullName, phone, email }),
    });
    return hydrateCustomer(created);
  }
  const customer: Customer = {
    id: `cus_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    tenantId,
    fullName,
    phone: phone?.trim() ? phone.trim() : undefined,
    email: email?.trim() ? email.trim() : undefined,
    createdAt: new Date(),
  };
  return addData('customers', customer);
};

export const updateCustomer = async (customer: Customer) => {
  if (isRealApiEnabled()) {
    const updated = await apiFetch<any>(`/customers/${encodeURIComponent(customer.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
      }),
    });
    return hydrateCustomer(updated);
  }
  const normalized: Customer = {
    ...customer,
    fullName: customer.fullName.trim(),
    phone: customer.phone?.trim() ? customer.phone.trim() : undefined,
    email: customer.email?.trim() ? customer.email.trim() : undefined,
  };
  return updateData('customers', normalized);
};
