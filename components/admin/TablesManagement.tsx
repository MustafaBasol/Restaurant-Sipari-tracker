
import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Table, TableStatus } from '../../types';

const TablesManagement: React.FC = () => {
    const { tables, addTable, updateTable, t } = useAppContext();
    const [newTableName, setNewTableName] = useState('');
    const [editingTable, setEditingTable] = useState<Table | null>(null);

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

    const StatusBadge: React.FC<{ status: TableStatus }> = ({ status }) => {
        const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full';
        const statusStyles = {
            [TableStatus.FREE]: 'bg-status-free/20 text-status-free',
            [TableStatus.OCCUPIED]: 'bg-status-occupied/20 text-status-occupied',
            [TableStatus.CLOSED]: 'bg-status-closed/20 text-status-closed',
        };
        return <span className={`${baseClasses} ${statusStyles[status]}`}>{t(status)}</span>;
    };

    return (
        <div>
            <div className="mb-6 flex gap-2">
                <input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder={t('tableName')}
                    className="flex-grow px-3 py-2 bg-light-bg border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button onClick={handleAddTable} className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover">{t('addTable')}</button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('name')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border-color">
                        {tables.map(table => (
                            <tr key={table.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                    {editingTable?.id === table.id ? (
                                        <input 
                                            value={editingTable.name} 
                                            onChange={(e) => setEditingTable({...editingTable, name: e.target.value})}
                                            className="px-2 py-1 bg-light-bg border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                                        />
                                    ) : table.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary"><StatusBadge status={table.status} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {editingTable?.id === table.id ? (
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={handleUpdateTable} className="text-accent hover:text-accent-hover">{t('save')}</button>
                                            <button onClick={() => setEditingTable(null)} className="text-text-secondary hover:text-text-primary">{t('cancel')}</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setEditingTable(table)} className="text-accent hover:text-accent-hover">{t('edit')}</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TablesManagement;
