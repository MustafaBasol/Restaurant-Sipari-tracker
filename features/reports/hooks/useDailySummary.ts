import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api';
import { SummaryReport } from '../types';
import { useAuth } from '../../auth/hooks/useAuth';

type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

type StoredDateRange = {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Use local time to avoid UTC date shifts in <input type="date" /> values.
const toLocalDateString = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const startOfWeekMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDateRangeForPreset = (preset: DateRangePreset): { startDate: string; endDate: string } => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
      break;
    case 'thisWeek':
      return { startDate: toLocalDateString(startOfWeekMonday(today)), endDate: toLocalDateString(end) };
    case 'lastWeek': {
      const thisWeekStart = startOfWeekMonday(today);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
      return { startDate: toLocalDateString(lastWeekStart), endDate: toLocalDateString(lastWeekEnd) };
    }
    case 'last7days':
      start.setDate(today.getDate() - 6);
      break;
    case 'last30days':
      start.setDate(today.getDate() - 29);
      break;
    case 'thisMonth':
      return {
        startDate: toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate: toLocalDateString(end),
      };
    case 'thisYear':
      return {
        startDate: toLocalDateString(new Date(today.getFullYear(), 0, 1)),
        endDate: toLocalDateString(end),
      };
    case 'lastYear': {
      const y = today.getFullYear() - 1;
      return {
        startDate: toLocalDateString(new Date(y, 0, 1)),
        endDate: toLocalDateString(new Date(y, 11, 31)),
      };
    }
    default:
      break;
  }

  return { startDate: toLocalDateString(start), endDate: toLocalDateString(end) };
};

const normalizeRange = (a: string, b: string): { startDate: string; endDate: string } => {
  if (!a || !b) return { startDate: a, endDate: b };
  return a <= b ? { startDate: a, endDate: b } : { startDate: b, endDate: a };
};

const getStorageKey = (tenantId: string) => `kitchorify-reports-date-range:v1:${tenantId}`;

export const useSummaryReport = () => {
  const { authState } = useAuth();
  const tenantId = authState?.tenant?.id;
  const [preset, setPreset] = useState<DateRangePreset>('last30days');
  const [startDate, setStartDate] = useState(() => getDateRangeForPreset('last30days').startDate);
  const [endDate, setEndDate] = useState(() => getDateRangeForPreset('last30days').endDate);
  const [data, setData] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const didInitFromStorageRef = useRef(false);
  const lastRangeKeyRef = useRef<string | null>(null);

  const fetchSummary = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!tenantId) return;

      const background = opts?.background === true;
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);
      try {
        const reportData = await api.getSummaryReport(tenantId, startDate, endDate);
        setData(reportData);
      } catch (err) {
        console.error('Failed to fetch summary report', err);
        setError('Failed to load report data.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [tenantId, startDate, endDate],
  );

  // Init date range from storage (per-tenant) once, to survive page refreshes.
  useEffect(() => {
    if (!tenantId) return;
    if (didInitFromStorageRef.current) return;

    didInitFromStorageRef.current = true;
    lastRangeKeyRef.current = getStorageKey(tenantId);

    try {
      const raw = window.localStorage.getItem(getStorageKey(tenantId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredDateRange;
      const nextPreset = (parsed?.preset ?? 'last30days') as DateRangePreset;

      if (nextPreset && nextPreset !== 'custom') {
        const r = getDateRangeForPreset(nextPreset);
        setPreset(nextPreset);
        setStartDate(r.startDate);
        setEndDate(r.endDate);
        return;
      }

      const s = typeof parsed?.startDate === 'string' ? parsed.startDate : '';
      const e = typeof parsed?.endDate === 'string' ? parsed.endDate : '';
      const n = normalizeRange(s, e);
      if (n.startDate && n.endDate) {
        setPreset('custom');
        setStartDate(n.startDate);
        setEndDate(n.endDate);
      }
    } catch {
      // ignore
    }
  }, [tenantId]);

  // Persist whenever preset or range changes.
  useEffect(() => {
    if (!tenantId) return;
    try {
      const payload: StoredDateRange = { preset, startDate, endDate };
      window.localStorage.setItem(getStorageKey(tenantId), JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [tenantId, preset, startDate, endDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Background refresh without UI "jump".
  useEffect(() => {
    if (!tenantId) return;
    const id = window.setInterval(() => {
      fetchSummary({ background: true }).catch(() => {
        // ignore
      });
    }, 15000);
    return () => window.clearInterval(id);
  }, [tenantId, fetchSummary]);

  // If tenant changes while mounted, re-init once for the new tenant.
  useEffect(() => {
    if (!tenantId) return;
    const key = getStorageKey(tenantId);
    if (lastRangeKeyRef.current === key) return;
    lastRangeKeyRef.current = key;
    didInitFromStorageRef.current = false;
  }, [tenantId]);

  return {
    startDate,
    endDate,
    preset,
    setDateRange: (start: string, end: string, nextPreset?: DateRangePreset) => {
      const p = nextPreset ?? 'custom';
      setPreset(p);
      const n = normalizeRange(start, end);
      setStartDate(n.startDate);
      setEndDate(n.endDate);
    },
    setPreset: (nextPreset: DateRangePreset) => {
      setPreset(nextPreset);
      if (nextPreset !== 'custom') {
        const r = getDateRangeForPreset(nextPreset);
        setStartDate(r.startDate);
        setEndDate(r.endDate);
      }
    },
    data,
    isLoading,
    isRefreshing,
    error,
    refetch: fetchSummary,
  };
};
