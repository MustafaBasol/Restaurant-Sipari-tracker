import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { ApiError } from '../../../shared/lib/runtimeApi';
import { User } from '../types';

interface UserMfaSetupModalProps {
  user: User;
  onClose: () => void;
  onSetup: (userId: string) => Promise<{ secret: string; otpauthUri: string; issuer: string }>;
  onVerify: (userId: string, code: string) => Promise<void>;
}

const UserMfaSetupModal: React.FC<UserMfaSetupModalProps> = ({ user, onClose, onSetup, onVerify }) => {
  const { t } = useLanguage();
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string; issuer: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const title = useMemo(
    () => t('admin.users.mfaSetupTitle').replace('{userName}', user.fullName),
    [t, user.fullName],
  );

  useEffect(() => {
    let cancelled = false;
    setError('');
    setCode('');
    setSetup(null);
    setIsLoading(true);
    onSetup(user.id)
      .then((data) => {
        if (cancelled) return;
        setSetup(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.code === 'MFA_ALREADY_ENABLED') {
            setError(t('admin.users.mfaAlreadyEnabled'));
            return;
          }
          if (e.code === 'FORBIDDEN' || e.code === 'UNAUTHORIZED' || e.code === 'UNAUTHENTICATED') {
            setError(t('admin.users.notAllowed'));
            return;
          }
        }
        setError(t('general.somethingWentWrong'));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onSetup, t, user.id]);

  const handleVerify = async () => {
    setError('');
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t('admin.users.mfaCodeRequired'));
      return;
    }
    setIsLoading(true);
    try {
      await onVerify(user.id, trimmed);
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'MFA_INVALID') {
          setError(t('admin.users.mfaInvalidCode'));
          return;
        }
        if (e.code === 'INVALID_INPUT') {
          setError(t('admin.users.mfaInvalidCode'));
          return;
        }
        if (e.code === 'MFA_MISCONFIGURED') {
          setError(t('admin.users.mfaMisconfigured'));
          return;
        }
      }
      setError(t('general.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-text-secondary">{t('admin.users.mfaSetupInstructions')}</p>

        {isLoading && !setup && !error && <div className="text-sm text-text-secondary">...</div>}

        {setup && (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-text-secondary mb-1">{t('admin.users.mfaIssuer')}</div>
              <div className="text-sm text-text-primary break-all">{setup.issuer}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-text-secondary mb-1">{t('admin.users.mfaSecret')}</div>
              <div className="text-sm text-text-primary break-all">{setup.secret}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-text-secondary mb-1">{t('admin.users.mfaOtpAuthUri')}</div>
              <div className="text-sm text-text-primary break-all">{setup.otpauthUri}</div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('admin.users.mfaCode')}</label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>
            {t('general.cancel')}
          </Button>
          <Button onClick={() => void handleVerify()} disabled={isLoading || !setup}>
            {isLoading ? '...' : t('general.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserMfaSetupModal;
