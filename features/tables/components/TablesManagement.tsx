import React, { useEffect, useMemo, useState } from 'react';
import { useTables } from '../hooks/useTables';
import { Table, TableStatus } from '../types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import {
  Table as UiTable,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '../../../shared/components/ui/Table';
import { useOrders } from '../../orders/hooks/useOrders';
import AdminOrderViewModal from '../../admin/components/AdminOrderViewModal';
import { OrderStatus } from '../../../shared/types';
import { Order } from '../../orders/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { UserRole } from '../../../shared/types';
import { getCustomers } from '../../customers/api';
import { Customer } from '../../customers/types';

const TablesManagement: React.FC = () => {
  const { tables, addTable, updateTable } = useTables();
  const { orders } = useOrders();
  const { t } = useLanguage();
  const { authState } = useAuth();
  const [newTableName, setNewTableName] = useState('');
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const canCreateCustomers = authState?.user?.role === UserRole.ADMIN;

  useEffect(() => {
    const tenantId = authState?.tenant?.id;
    if (!tenantId || !canCreateCustomers) return;
    getCustomers(tenantId)
      .then((items) =>
        setCustomers(items.slice().sort((a, b) => a.fullName.localeCompare(b.fullName))),
      )
      .catch((e) => console.error('Failed to load customers', e));
  }, [authState?.tenant?.id, canCreateCustomers]);

  useEffect(() => {
    if (!editingTable) {
      setCustomerSearch('');
      setIsCustomerDropdownOpen(false);
      return;
    }

    const resolved =
      editingTable.customerName ||
      (editingTable.customerId
        ? customers.find((c) => c.id === editingTable.customerId)?.fullName
        : undefined) ||
      '';
    setCustomerSearch(resolved);
    setIsCustomerDropdownOpen(false);
  }, [customers, editingTable]);

  const customersById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const haystack = `${c.fullName} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, customerSearch]);

  const handleAddTable = async () => {
    if (newTableName.trim()) {
      await addTable(newTableName.trim());
      setNewTableName('');
    }
  };

  const handleUpdateTable = async () => {
    if (editingTable) {
      await updateTable(editingTable);
      setEditingTable(null);
    }
  };

  const statusVariantMap: Record<TableStatus, 'green' | 'orange' | 'gray'> = {
    [TableStatus.FREE]: 'green',
    [TableStatus.OCCUPIED]: 'orange',
    [TableStatus.CLOSED]: 'gray',
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {t('admin.tables.name')}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder={t('admin.tables.name')}
            className="w-full sm:flex-grow"
          />
          <Button onClick={handleAddTable} className="px-4 py-2 w-full sm:w-auto">
            {t('admin.tables.add')}
          </Button>
        </div>
      </div>

      <UiTable>
        <TableHeader>
          <TableHeaderCell>{t('general.name')}</TableHeaderCell>
          <TableHeaderCell>{t('general.status')}</TableHeaderCell>
          <TableHeaderCell>{t('waiter.customerName')}</TableHeaderCell>
          <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
        </TableHeader>
        <TableBody>
          {tables.map((table) => {
            const activeOrder = orders?.find(
              (o) =>
                (o.tableId === table.id || o.linkedTableIds?.includes(table.id)) &&
                o.status !== OrderStatus.SERVED &&
                o.status !== OrderStatus.CANCELED,
            );

            const resolvedCustomerName =
              table.customerName ||
              (table.customerId ? customersById.get(table.customerId)?.fullName : undefined);

            return (
              <TableRow key={table.id}>
                <TableCell>
                  {editingTable?.id === table.id ? (
                    <Input
                      value={editingTable.name}
                      onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                      className="py-1"
                    />
                  ) : (
                    table.name
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[table.status]}>
                    {t(`statuses.${table.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingTable?.id === table.id ? (
                    <div className="relative">
                      <Input
                        value={customerSearch}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCustomerSearch(next);
                          setEditingTable({
                            ...editingTable,
                            customerId: undefined,
                            customerName: next.trim() ? next : undefined,
                          });
                          setIsCustomerDropdownOpen(next.trim().length >= 2);
                        }}
                        onFocus={() => {
                          if (customerSearch.trim().length >= 2) setIsCustomerDropdownOpen(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setIsCustomerDropdownOpen(false), 120);
                        }}
                        placeholder={t('customers.searchPlaceholder')}
                        className="py-2 pr-12"
                      />

                      {(editingTable.customerId || editingTable.customerName) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearch('');
                            setIsCustomerDropdownOpen(false);
                            setEditingTable({
                              ...editingTable,
                              customerId: undefined,
                              customerName: undefined,
                            });
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                          aria-label={t('customers.clearSelection')}
                          title={t('customers.clearSelection')}
                        >
                          ×
                        </button>
                      )}

                      {isCustomerDropdownOpen && customerSearch.trim().length >= 2 && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border-color bg-card-bg shadow-medium max-h-56 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.slice(0, 8).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setCustomerSearch(c.fullName);
                                  setIsCustomerDropdownOpen(false);
                                  setEditingTable({
                                    ...editingTable,
                                    customerId: c.id,
                                    customerName: c.fullName,
                                  });
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-light-bg"
                              >
                                <div className="text-sm font-medium text-text-primary">
                                  {c.fullName}
                                </div>
                                {(c.phone || c.email) && (
                                  <div className="text-xs text-text-secondary">
                                    {[c.phone, c.email].filter(Boolean).join(' • ')}
                                  </div>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-text-secondary">
                              {t('customers.none')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-text-secondary">
                      {resolvedCustomerName || '-'}
                    </span>
                  )}
                </TableCell>
                <TableCell align="right">
                  <div className="flex flex-wrap gap-2 justify-end items-center">
                    {activeOrder && (
                      <button
                        onClick={() => setViewingOrder(activeOrder)}
                        className="text-accent hover:text-accent-hover text-sm font-medium"
                      >
                        {t('admin.tables.viewOrder')}
                      </button>
                    )}
                    {editingTable?.id === table.id ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleUpdateTable}
                          className="text-accent hover:text-accent-hover text-sm font-medium"
                        >
                          {t('general.save')}
                        </button>
                        <button
                          onClick={() => setEditingTable(null)}
                          className="text-text-secondary hover:text-text-primary text-sm font-medium"
                        >
                          {t('general.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTable(table)}
                        className="text-accent hover:text-accent-hover text-sm font-medium"
                      >
                        {t('general.edit')}
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </UiTable>

      {viewingOrder && (
        <AdminOrderViewModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}

    </div>
  );
};

export default TablesManagement;
