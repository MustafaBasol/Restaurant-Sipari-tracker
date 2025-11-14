import { useState, useCallback } from 'react';
import * as api from '../api';
import { useAuth } from '../../auth/hooks/useAuth';

export const useSubscription = () => {
    const { authState, updateTenantInState } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activateSubscription = useCallback(async () => {
        if (!authState?.tenant?.id) {
            setError("No tenant found to activate.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const updatedTenant = await api.activateSubscription(authState.tenant.id);
            updateTenantInState(updatedTenant);
        } catch (err) {
            console.error("Failed to activate subscription", err);
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [authState, updateTenantInState]);

    return {
        isLoading,
        error,
        activateSubscription,
    };
};
