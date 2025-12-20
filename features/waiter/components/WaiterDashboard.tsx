import React, { useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Table } from '../../tables/types';
import TableGrid from '../../tables/components/TableGrid';
import OrderModal from '../../orders/components/OrderModal';

const WaiterDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
  };

  const handleCloseModal = () => {
    setSelectedTable(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary">{t('waiter.tablesTitle')}</h1>
      <TableGrid onSelectTable={handleSelectTable} />
      {selectedTable && <OrderModal table={selectedTable} onClose={handleCloseModal} />}
    </div>
  );
};

export default WaiterDashboard;
