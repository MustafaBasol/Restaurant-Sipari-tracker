import { useOrderContext } from '../context/OrderContext';

// This hook now acts as a simple proxy to the central context.
// This simplifies components and ensures they all share the same state.
export const useOrders = () => {
    return useOrderContext();
};
