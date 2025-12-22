import { addData, getDataByTenant } from '../../shared/lib/mockApi';
import { Customer } from './types';

export const getCustomers = (tenantId: string) => getDataByTenant<Customer>('customers', tenantId);

export const createCustomer = async (tenantId: string, fullName: string, phone?: string) => {
  const customer: Customer = {
    id: `cus_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    tenantId,
    fullName,
    phone: phone?.trim() ? phone.trim() : undefined,
    createdAt: new Date(),
  };
  return addData('customers', customer);
};
