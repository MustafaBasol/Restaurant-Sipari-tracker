import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';
import { Input } from '../../../shared/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '../../../shared/components/ui/Table';
import { Button } from '../../../shared/components/ui/Button';
import { getCustomers, createCustomer, updateCustomer } from '../api';
import { Customer } from '../types';
import CustomerCreateModal from './CustomerCreateModal';
import CustomerDetailsModal from './CustomerDetailsModal';
import { useOrders } from '../../orders/hooks/useOrders';
import { formatDateTime } from '../../../shared/lib/utils';

const CustomersManagement: React.FC = () => {
  const { t } = useLanguage();
  const { authState } = useAuth();
  const { orders } = useOrders();

  const timezone = authState?.tenant?.timezone || 'UTC';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const tenantId = authState?.tenant?.id;

  useEffect(() => {
    if (!tenantId) return;
    setIsLoading(true);
    setError('');
    getCustomers(tenantId)
      .then((items) =>
        setCustomers(items.slice().sort((a, b) => a.fullName.localeCompare(b.fullName))),
      )
      .catch((e) => {
        console.error('Failed to load customers', e);
        setError(t('customers.validation.loadFailed'));
      })
      .finally(() => setIsLoading(false));
  }, [tenantId, t]);

  const ordersByCustomerId = useMemo(() => {
    const map = new Map<string, typeof orders extends (infer T)[] ? T[] : any[]>();
    const list = orders ?? [];
    for (const o of list) {
      const cid = (o as any).customerId as string | undefined;
      if (!cid) continue;
      const arr = map.get(cid) ?? [];
      arr.push(o as any);
      map.set(cid, arr);
    }
    return map;
  }, [orders]);

  const getLastOrderAt = (customer: Customer): Date | undefined => {
    const byId = ordersByCustomerId.get(customer.id) ?? [];
    if (byId.length > 0) {
      const latest = byId.reduce((acc, o) => {
        const d = new Date((o as any).createdAt);
        return d > acc ? d : acc;
      }, new Date(0));
      return latest.getTime() > 0 ? latest : undefined;
    }

    // Fallback for legacy orders without customerId: match by name snapshot.
    const legacy = (orders ?? []).filter(
      (o: any) => o.customerName && o.customerName === customer.fullName,
    );
    if (legacy.length === 0) return undefined;
    const latest = legacy.reduce((acc: Date, o: any) => {
      const d = new Date(o.createdAt);
      return d > acc ? d : acc;
    }, new Date(0));
    return latest.getTime() > 0 ? latest : undefined;
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = `${c.fullName} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [customers, search]);

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex-1 max-w-xl">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('customers.searchPlaceholder')}
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>{t('customers.addNew')}</Button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {isLoading && <div className="text-sm text-text-secondary">{t('general.loading')}</div>}

      <Table>
        <TableHeader>
          <TableHeaderCell>{t('customers.headers.fullName')}</TableHeaderCell>
          <TableHeaderCell>{t('customers.headers.phone')}</TableHeaderCell>
          <TableHeaderCell>{t('customers.headers.email')}</TableHeaderCell>
          <TableHeaderCell>{t('customers.headers.createdAt')}</TableHeaderCell>
          <TableHeaderCell>{t('customers.headers.lastOrderAt')}</TableHeaderCell>
        </TableHeader>
        <TableBody>
          {filteredCustomers.map((c) => {
            const lastOrderAt = getLastOrderAt(c);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <button
                    className="text-accent hover:text-accent-hover text-sm font-medium"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    {c.fullName}
                  </button>
                </TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>
                  {formatDateTime(c.createdAt, timezone, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </TableCell>
                <TableCell>
                  {lastOrderAt
                    ? formatDateTime(lastOrderAt, timezone, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <CustomerCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(payload) =>
          createCustomer(tenantId, payload.fullName, payload.phone, payload.email)
        }
        onCreated={(created) => {
          setCustomers((prev) =>
            [...prev, created].slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
          );
        }}
      />

      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={true}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          orders={(ordersByCustomerId.get(selectedCustomer.id) as any[]) ?? []}
          onUpdateCustomer={async (updates) => {
            const updated = await updateCustomer({
              ...selectedCustomer,
              ...updates,
            });
            setCustomers((prev) =>
              prev
                .map((x) => (x.id === updated.id ? updated : x))
                .slice()
                .sort((a, b) => a.fullName.localeCompare(b.fullName)),
            );
            setSelectedCustomer(updated);
            return updated;
          }}
        />
      )}
    </div>
  );
};

export default CustomersManagement;
