import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useContext,
} from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { Table, TableStatus } from '../types';

interface TableContextData {
  tables: Table[];
  isLoading: boolean;
  addTable: (name: string) => Promise<void>;
  updateTable: (table: Table) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  setTableStatusInState: (tableId: string, status: TableStatus) => void;
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
        console.error('Failed to fetch tables', error);
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

  const setTableStatusInState = (tableId: string, status: TableStatus) => {
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status } : t)));
  };

  const addTable = async (name: string) => {
    const created = await api.addTable(authState!.tenant!.id, name);
    setTables((prev) => [...prev, created]);
  };

  const updateTable = async (table: Table) => {
    const updated = await api.updateTable(table);
    setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    const updated = await api.updateTableStatus(tableId, status);
    if (updated) {
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      return;
    }
    // Fallback (should be rare): sync from source of truth.
    await fetchTables();
  };

  return (
    <TableContext.Provider
      value={{
        tables,
        isLoading,
        addTable,
        updateTable,
        updateTableStatus,
        setTableStatusInState,
        refetch: fetchTables,
      }}
    >
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
