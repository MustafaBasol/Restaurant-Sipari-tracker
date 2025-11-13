
import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Table } from '../types';
import TableGrid from '../components/waiter/TableGrid';
import OrderModal from '../components/waiter/OrderModal';

const WaiterDashboard: React.FC = () => {
    const { t } = useAppContext();
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    const handleSelectTable = (table: Table) => {
        setSelectedTable(table);
    };

    const handleCloseModal = () => {
        setSelectedTable(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary">{t('tables')}</h1>
            <TableGrid onSelectTable={handleSelectTable} />
            {selectedTable && (
                <OrderModal
                    table={selectedTable}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default WaiterDashboard;
