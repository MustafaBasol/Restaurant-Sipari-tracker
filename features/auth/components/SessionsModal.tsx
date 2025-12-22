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
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { UserSession } from '../../../shared/types';
import * as authApi from '../api';
import { getDeviceId } from '../../../shared/lib/device';
import { formatDateTime } from '../../../shared/lib/utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const getSessionStatusKey = (session: UserSession): 'active' | 'revoked' | 'expired' => {
  if (session.revokedAt) return 'revoked';
  if (new Date(session.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
};

const SessionsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { authState } = useAuth();
  const { t } = useLanguage();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const timezone = authState?.tenant?.timezone ?? 'UTC';
  const currentSessionId = authState?.sessionId;
  const currentDeviceId = authState?.deviceId ?? getDeviceId();

  const canLoad = Boolean(isOpen && currentSessionId);

  const format = useCallback((value: string) => formatDateTime(value, timezone), [timezone]);

  const load = useCallback(async () => {
    if (!currentSessionId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await authApi.getMySessions(currentSessionId);
      setSessions(data);
    } catch {
      setError(t('sessions.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, t]);

  useEffect(() => {
    if (!canLoad) return;
    load();
  }, [canLoad, load]);

  const activeCount = useMemo(
    () => sessions.filter((s) => getSessionStatusKey(s) === 'active').length,
    [sessions],
  );

  const onLogoutOthers = async () => {
    if (!currentSessionId) return;
    setIsLoading(true);
    setError('');
    try {
      await authApi.logoutOtherSessions(currentSessionId);
      await load();
    } catch {
      setError(t('sessions.actionFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal title={t('sessions.title')} onClose={onClose} isOpen={isOpen}>
      <div className="p-6 space-y-4">
        <p className="text-sm text-text-secondary">{t('sessions.help')}</p>

        {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-text-secondary">
            {t('sessions.activeCount').replace('{count}', activeCount.toString())}
          </div>
          <Button onClick={onLogoutOthers} disabled={isLoading || !currentSessionId}>
            {t('sessions.logoutOthers')}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sessions.device')}</TableHeaderCell>
            <TableHeaderCell>{t('sessions.createdAt')}</TableHeaderCell>
            <TableHeaderCell>{t('sessions.lastSeenAt')}</TableHeaderCell>
            <TableHeaderCell>{t('sessions.status')}</TableHeaderCell>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => {
              const statusKey = getSessionStatusKey(s);
              const isThisDevice = s.deviceId === currentDeviceId;
              const isThisSession = s.id === currentSessionId;

              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">
                      {isThisDevice ? t('sessions.thisDevice') : s.deviceId}
                    </div>
                    <div className="text-xs text-text-secondary">{s.id}</div>
                  </TableCell>
                  <TableCell>{format(s.createdAt)}</TableCell>
                  <TableCell>{format(s.lastSeenAt)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {t(`sessions.statuses.${statusKey}`)}
                      {isThisSession ? ` • ${t('sessions.current')}` : ''}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
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

export default SessionsModal;
