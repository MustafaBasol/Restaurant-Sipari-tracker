import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Table, TableStatus } from '../types';

interface TableContextData {
    tables: Table[];
    isLoading: boolean;
    addTable: (name: string) => Promise<void>;
    updateTable: (table: Table) => Promise<void>;
    updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
    refetch: () => Promise<void>;
}

export const TableContext = createContext<TableContextData | undefined>(undefined);

export const TableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
        } else {
            setTables([]);
            setIsLoading(false);
        }
    }, [authState]);

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

    return (
        <TableContext.Provider value={{ tables, isLoading, addTable, updateTable, updateTableStatus, refetch: fetchTables }}>
            {children}
        </TableContext.Provider>
    );
};

export const useTableContext = () => {
    const context = useContext(TableContext);
    if (context === undefined) {
        throw new Error('useTableContext must be used within a TableProvider');
    }
    return context;
};
