import { useEffect } from 'react';

const STORAGE_KEY = 'db_last_updated';

/**
 * A hook that listens for changes to a specific localStorage key and triggers a callback.
 * This simulates real-time data updates across different browser tabs/windows.
 * @param refetch The function to call when data changes.
 */
export const useRealtimeRefetch = (refetch: () => void) => {
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            // Only refetch if the key matches and the change happened in another tab.
            if (event.key === STORAGE_KEY) {
                refetch();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [refetch]);
};
