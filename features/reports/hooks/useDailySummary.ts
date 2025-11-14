import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { SummaryReport } from '../types';
import { useAuth } from '../../auth/hooks/useAuth';

const toDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const useSummaryReport = () => {
    const { authState } = useAuth();
    const [startDate, setStartDate] = useState(toDateString(new Date()));
    const [endDate, setEndDate] = useState(toDateString(new Date()));
    const [data, setData] = useState<SummaryReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        if (!authState?.tenant?.id) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const reportData = await api.getSummaryReport(authState.tenant.id, startDate, endDate);
            setData(reportData);
        } catch (err) {
            console.error("Failed to fetch summary report", err);
            setError("Failed to load report data.");
        } finally {
            setIsLoading(false);
        }
    }, [authState, startDate, endDate]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    return {
        startDate,
        endDate,
        setDateRange: (start: string, end: string) => {
            setStartDate(start);
            setEndDate(end);
        },
        data,
        isLoading,
        error,
        refetch: fetchSummary,
    };
};