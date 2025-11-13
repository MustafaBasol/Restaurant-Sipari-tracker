import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Table, TableStatus } from '../types';

export const useTables = () => {
    const { authState } = useAuth();
    const [tables, setTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTables = useCallback(async () => {
        if (authState?.tenant?.id) {
            setIsLoading(true);
            try {
                const data = await api.getTables(authState.tenant.id);
                setTables(data);
            } catch (error) {
                console.error("Failed to fetch tables", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [authState?.tenant?.id]);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);
    
    const handleMutation = async (mutationFn: () => Promise<any>) => {
        await mutationFn();
        await fetchTables();
    };

    const addTable = (name: string) => handleMutation(() => api.addTable(authState!.tenant!.id, name));
    const updateTable = (table: Table) => handleMutation(() => api.updateTable(table));
    const updateTableStatus = (tableId: string, status: TableStatus) => handleMutation(() => api.updateTableStatus(tableId, status));
    const closeTable = (tableId: string) => handleMutation(() => api.closeTable(tableId));

    return { tables, isLoading, addTable, updateTable, updateTableStatus, closeTable, refetch: fetchTables };
};
