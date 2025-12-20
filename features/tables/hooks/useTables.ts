import { useTableContext } from '../context/TableContext';

// This hook now acts as a simple proxy to the central context.
export const useTables = () => {
  return useTableContext();
};
