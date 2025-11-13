import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { DailySummaryReport } from '../types';
import { useAuth } from '../../auth/hooks/useAuth';

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const useDailySummary = () => {
    const { authState } = useAuth();
    const [date, setDate] = useState(getTodayDateString());
    const [data, setData] = useState<DailySummaryReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        if (!authState?.tenant?.id) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const reportData = await api.getDailySummary(authState.tenant.id, date);
            setData(reportData);
        } catch (err) {
            console.error("Failed to fetch daily summary", err);
            setError("Failed to load report data.");
        } finally {
            setIsLoading(false);
        }
    }, [authState, date]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    return {
        date,
        setDate,
        data,
        isLoading,
        error,
        refetch: fetchSummary,
    };
};