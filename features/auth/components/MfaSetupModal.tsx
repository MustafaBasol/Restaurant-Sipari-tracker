import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import * as authApi from '../api';
import { ApiError } from '../../../shared/lib/runtimeApi';

type SetupState = { secret: string; otpauthUri: string; issuer: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEnabled: (mfaEnabledAt: string) => void;
}

const MfaSetupModal: React.FC<Props> = ({ isOpen, onClose, onEnabled }) => {
  const { t } = useLanguage();
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const title = useMemo(() => t('auth.mfaSetupTitle'), [t]);

  useEffect(() => {
    if (!isOpen) return;
    if (setup) return;

    let cancelled = false;
    setIsLoading(true);
    setError('');

    authApi
      .mfaSetup()
      .then((result) => {
        if (cancelled) return;
        setSetup(result);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.code);
        } else {
          setError('FAILED');
        }
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, setup]);

  const handleVerify = async () => {
    setError('');
    const trimmed = code.trim();
    if (!trimmed) {
      setError('MISSING_CODE');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.mfaVerify(trimmed);
      onEnabled(res.mfaEnabledAt);
      setCode('');
      setSetup(null);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code);
      } else {
        setError('FAILED');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal title={title} isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <p className="text-sm text-text-secondary mb-4">{t('auth.mfaSetupIntro')}</p>

        {setup && (
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('auth.mfaSetupSecretLabel')}
              </label>
              <Input value={setup.secret} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('auth.mfaSetupUriLabel')}
              </label>
              <Input value={setup.otpauthUri} readOnly />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('auth.mfaSetupCodeLabel')}
          </label>
          <Input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{t('auth.mfaSetupError')}</div>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('auth.mfaSetupSkip')}
          </Button>
          <Button onClick={() => void handleVerify()} disabled={isLoading || !setup}>
            {isLoading ? '...' : t('auth.mfaSetupVerify')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MfaSetupModal;
