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
  onVerify: (
    userId: string,
    code: string,
  ) => Promise<{ mfaEnabledAt: string; recoveryCodes?: string[] }>;
  onEnabled: () => void;
}

const UserMfaSetupModal: React.FC<UserMfaSetupModalProps> = ({
  user,
  onClose,
  onSetup,
  onVerify,
  onEnabled,
}) => {
  const { t } = useLanguage();
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string; issuer: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const title = useMemo(
    () => t('admin.users.mfaSetupTitle').replace('{userName}', user.fullName),
    [t, user.fullName],
  );

  useEffect(() => {
    let cancelled = false;
    setError('');
    setCode('');
    setSetup(null);
    setRecoveryCodes(null);
    setCopyStatus('idle');
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
      const res = await onVerify(user.id, trimmed);
      onEnabled();
      if (Array.isArray((res as any).recoveryCodes) && (res as any).recoveryCodes.length > 0) {
        setRecoveryCodes((res as any).recoveryCodes as string[]);
        setCode('');
        return;
      }
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

  const handleCopyRecoveryCodes = async () => {
    if (!recoveryCodes || recoveryCodes.length === 0) return;
    const text = recoveryCodes.join('\n');
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', 'true');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('failed');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-text-secondary">{t('admin.users.mfaSetupInstructions')}</p>

        {recoveryCodes && recoveryCodes.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-primary">
              {t('admin.users.mfaRecoveryCodesTitle')}
            </div>
            <div className="text-sm text-text-secondary">{t('admin.users.mfaRecoveryCodesIntro')}</div>
            <div className="rounded-xl border border-border-color bg-card-bg p-3">
              <div className="grid grid-cols-2 gap-2 text-sm font-mono text-text-primary">
                {recoveryCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => void handleCopyRecoveryCodes()}>
                {copyStatus === 'copied'
                  ? t('general.copied')
                  : copyStatus === 'failed'
                    ? t('general.copyFailed')
                    : t('general.copy')}
              </Button>
            </div>
          </div>
        ) : null}

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

        {!recoveryCodes && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('admin.users.mfaCode')}
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          {recoveryCodes ? (
            <Button type="button" onClick={onClose} disabled={isLoading}>
              {t('general.close')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                {t('general.cancel')}
              </Button>
              <Button onClick={() => void handleVerify()} disabled={isLoading || !setup}>
                {isLoading ? '...' : t('general.save')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UserMfaSetupModal;
