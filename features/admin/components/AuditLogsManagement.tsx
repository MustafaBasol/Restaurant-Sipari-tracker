import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useUsers } from '../../users/hooks/useUsers';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '../../../shared/components/ui/Table';
import { formatDateTime } from '../../../shared/lib/utils';
import { AuditAction, AuditLog } from '../../../shared/types';
import { getAuditLogs } from '../api';

const safeText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const AuditLogsManagement: React.FC = () => {
  const { authState } = useAuth();
  const { t } = useLanguage();
  const { users } = useUsers();

  const tenantId = authState?.tenant?.id;
  const timezone = authState?.tenant?.timezone || 'UTC';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!tenantId) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getAuditLogs(tenantId);
        if (!mounted) return;
        setLogs(data);
      } catch (e) {
        console.error('Failed to load audit logs', e);
        if (!mounted) return;
        setLogs([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const actionOptions = useMemo(() => Object.values(AuditAction), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...logs]
      .sort((a, b) => {
        const at = new Date(a.createdAt).getTime();
        const bt = new Date(b.createdAt).getTime();
        return bt - at;
      })
      .filter((l) => {
        if (actionFilter && l.action !== actionFilter) return false;
        if (!q) return true;

        const actor = users.find((u) => u.id === l.actorUserId);
        const haystack = [
          l.id,
          l.action,
          l.entityType,
          l.entityId,
          l.actorUserId,
          l.actorRole,
          actor?.fullName,
          safeText(l.metadata),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
  }, [logs, users, actionFilter, query]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold text-text-primary">{t('admin.auditLogs.title')}</h2>
        <div className="text-sm text-text-secondary">
          {isLoading ? t('general.loading') : `${t('admin.auditLogs.count')}: ${filtered.length}`}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('admin.auditLogs.action')}
          </label>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">{t('general.all')}</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {t(`audit.actions.${a}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('admin.auditLogs.search')}
          </label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.auditLogs.searchPlaceholder')}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>{t('admin.auditLogs.time')}</TableHeaderCell>
            <TableHeaderCell>{t('admin.auditLogs.actor')}</TableHeaderCell>
            <TableHeaderCell>{t('admin.auditLogs.action')}</TableHeaderCell>
            <TableHeaderCell>{t('admin.auditLogs.entity')}</TableHeaderCell>
            <TableHeaderCell>{t('admin.auditLogs.details')}</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell>{t('general.loading')}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell>{t('admin.auditLogs.empty')}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
            </TableRow>
          ) : (
            filtered.map((l) => {
              const actor = users.find((u) => u.id === l.actorUserId);
              const actorText = actor?.fullName
                ? `${actor.fullName} (${l.actorRole})`
                : `${l.actorUserId} (${l.actorRole})`;

              const details = l.metadata ? safeText(l.metadata) : '-';

              return (
                <TableRow key={l.id}>
                  <TableCell>{formatDateTime(l.createdAt, timezone)}</TableCell>
                  <TableCell>{actorText}</TableCell>
                  <TableCell>{t(`audit.actions.${l.action}`)}</TableCell>
                  <TableCell>
                    {l.entityType}: {l.entityId}
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[28rem] truncate" title={details}>
                      {details}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export default AuditLogsManagement;
