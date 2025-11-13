import React, { useState } from 'react';
import { useTables } from '../hooks/useTables';
import { Table, TableStatus } from '../types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Badge } from '../../../shared/components/ui/Badge';
import { Table as UiTable, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../../shared/components/ui/Table';

const TablesManagement: React.FC = () => {
    const { tables, addTable, updateTable } = useTables();
    const { t } = useLanguage();
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

    const statusVariantMap: Record<TableStatus, 'green' | 'orange' | 'gray'> = {
        [TableStatus.FREE]: 'green',
        [TableStatus.OCCUPIED]: 'orange',
        [TableStatus.CLOSED]: 'gray',
    };

    return (
        <div>
            <div className="mb-6 flex gap-2">
                <Input
                    type="text"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder={t('admin.tables.name')}
                    className="flex-grow"
                />
                <Button onClick={handleAddTable} className="px-4 py-2">{t('admin.tables.add')}</Button>
            </div>

            <UiTable>
                <TableHeader>
                    <TableHeaderCell>{t('general.name')}</TableHeaderCell>
                    <TableHeaderCell>{t('general.status')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
                </TableHeader>
                <TableBody>
                    {tables.map(table => (
                        <TableRow key={table.id}>
                            <TableCell>
                                {editingTable?.id === table.id ? (
                                    <Input 
                                        value={editingTable.name} 
                                        onChange={(e) => setEditingTable({...editingTable, name: e.target.value})}
                                        className="py-1"
                                    />
                                ) : table.name}
                            </TableCell>
                            <TableCell><Badge variant={statusVariantMap[table.status]}>{t(`statuses.${table.status}`)}</Badge></TableCell>
                            <TableCell align="right">
                                {editingTable?.id === table.id ? (
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={handleUpdateTable} className="text-accent hover:text-accent-hover text-sm font-medium">{t('general.save')}</button>
                                        <button onClick={() => setEditingTable(null)} className="text-text-secondary hover:text-text-primary text-sm font-medium">{t('general.cancel')}</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setEditingTable(table)} className="text-accent hover:text-accent-hover text-sm font-medium">{t('general.edit')}</button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </UiTable>
        </div>
    );
};

export default TablesManagement;
