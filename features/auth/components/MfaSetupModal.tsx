import React, { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

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

  useEffect(() => {
    if (!isOpen) {
      setRecoveryCodes(null);
      setCopyStatus('idle');
      setError('');
      setCode('');
      setSetup(null);
      setQrDataUrl('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!setup?.otpauthUri) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    setQrDataUrl('');

    QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 220 })
      .then((dataUrl) => {
        if (cancelled) return;
        setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, setup?.otpauthUri]);

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
      if (Array.isArray((res as any).recoveryCodes) && (res as any).recoveryCodes.length > 0) {
        setRecoveryCodes((res as any).recoveryCodes as string[]);
        setCode('');
        return;
      }

      // Fallback: no recovery codes returned.
      setCode('');
      setSetup(null);
      setQrDataUrl('');
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
    <Modal title={title} isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <p className="text-sm text-text-secondary mb-4">{t('auth.mfaSetupIntro')}</p>

        {recoveryCodes && recoveryCodes.length > 0 ? (
          <div className="mb-4 space-y-3">
            <div className="text-sm font-medium text-text-primary">
              {t('auth.mfaRecoveryCodesTitle')}
            </div>
            <div className="text-sm text-text-secondary">{t('auth.mfaRecoveryCodesIntro')}</div>
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
              <div className="flex items-center justify-center rounded-xl border border-border-color bg-card-bg p-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="h-[180px] w-[180px]" draggable={false} />
                ) : (
                  <div className="text-sm text-text-secondary">...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!recoveryCodes && (
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
        )}

        {error && <div className="mb-4 text-sm text-red-600">{t('auth.mfaSetupError')}</div>}

        <div className="flex gap-2 justify-end">
          {recoveryCodes ? (
            <Button
              type="button"
              onClick={() => {
                setRecoveryCodes(null);
                setSetup(null);
                setQrDataUrl('');
                setCode('');
                setError('');
                onClose();
              }}
              disabled={isLoading}
            >
              {t('general.close')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                {t('auth.mfaSetupSkip')}
              </Button>
              <Button onClick={() => void handleVerify()} disabled={isLoading || !setup}>
                {isLoading ? '...' : t('auth.mfaSetupVerify')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default MfaSetupModal;
