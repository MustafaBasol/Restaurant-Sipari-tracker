import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '../../../shared/components/ui/Table';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { formatDateTime } from '../../../shared/lib/utils';
import { UserSession } from '../../../shared/types';
import { User } from '../types';
import { useAuth } from '../../auth/hooks/useAuth';
import * as usersApi from '../api';

type Props = {
  user: User;
  isOpen: boolean;
  onClose: () => void;
};

const getSessionStatusKey = (session: UserSession): 'active' | 'revoked' | 'expired' => {
  if (session.revokedAt) return 'revoked';
  if (new Date(session.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
};

const UserSessionsModal: React.FC<Props> = ({ user, isOpen, onClose }) => {
  const { t } = useLanguage();
  const { authState } = useAuth();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const tenantId = authState?.tenant?.id;
  const actor = useMemo(
    () => (authState ? { userId: authState.user.id, role: authState.user.role } : null),
    [authState],
  );
  const timezone = authState?.tenant?.timezone ?? 'UTC';

  const load = useCallback(async () => {
    if (!tenantId || !actor) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await usersApi.getSessionsForUser(tenantId, user.id, actor);
      setSessions(data);
    } catch {
      setError(t('admin.users.sessionsLoadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [actor, t, tenantId, user.id]);

  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen, load]);

  const onRevoke = async (sessionId: string) => {
    if (!tenantId || !actor) return;
    setIsLoading(true);
    setError('');
    try {
      await usersApi.revokeSessionForUser(tenantId, user.id, sessionId, actor);
      await load();
    } catch {
      setError(t('admin.users.sessionsActionFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const onRevokeAll = async () => {
    if (!tenantId || !actor) return;
    setIsLoading(true);
    setError('');
    try {
      await usersApi.revokeAllSessionsForUser(tenantId, user.id, actor);
      await load();
    } catch {
      setError(t('admin.users.sessionsActionFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={t('admin.users.sessionsTitle').replace('{userName}', user.fullName)}
      onClose={onClose}
      isOpen={isOpen}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-text-secondary">{user.email}</div>
          <Button onClick={onRevokeAll} disabled={isLoading || !tenantId || !actor}>
            {t('admin.users.sessionsRevokeAll')}
          </Button>
        </div>

        {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}

        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sessions.device')}</TableHeaderCell>
            <TableHeaderCell>{t('sessions.createdAt')}</TableHeaderCell>
            <TableHeaderCell>{t('sessions.lastSeenAt')}</TableHeaderCell>
            <TableHeaderCell>{t('sessions.status')}</TableHeaderCell>
            <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => {
              const statusKey = getSessionStatusKey(s);
              const isActive = statusKey === 'active';
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.deviceId}</div>
                    <div className="text-xs text-text-secondary">{s.id}</div>
                  </TableCell>
                  <TableCell>{formatDateTime(s.createdAt, timezone)}</TableCell>
                  <TableCell>{formatDateTime(s.lastSeenAt, timezone)}</TableCell>
                  <TableCell>{t(`sessions.statuses.${statusKey}`)}</TableCell>
                  <TableCell align="right">
                    <button
                      onClick={() => onRevoke(s.id)}
                      disabled={!isActive || isLoading}
                      className="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50"
                    >
                      {t('admin.users.sessionsRevoke')}
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}

            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="py-6 text-center text-sm text-text-secondary">
                    {isLoading ? t('general.loading') : t('sessions.empty')}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Modal>
  );
};

export default UserSessionsModal;
