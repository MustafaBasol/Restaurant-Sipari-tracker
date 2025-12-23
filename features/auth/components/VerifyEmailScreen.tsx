import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import AuthHeader from './AuthHeader';
import * as api from '../api';

const getHashQueryParam = (key: string): string | null => {
  const raw = window.location.hash;
  const idx = raw.indexOf('?');
  if (idx === -1) return null;
  const qs = raw.slice(idx + 1);
  const params = new URLSearchParams(qs);
  const val = params.get(key);
  return val && val.trim() ? val : null;
};

const VerifyEmailScreen: React.FC = () => {
  const { t } = useLanguage();
  const token = useMemo(() => getHashQueryParam('token'), []);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    api
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-light-bg p-4">
      <AuthHeader />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            {t('branding.name')}
          </h1>
          <p className="text-text-secondary mt-2">{t('auth.verifyEmail.title')}</p>
        </div>

        <Card>
          {status === 'loading' && (
            <p className="text-sm text-text-secondary text-center">{t('general.loading')}</p>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                {t('auth.verifyEmail.success')}
              </p>
              <Button className="w-full" onClick={() => (window.location.hash = '#/login')}>
                {t('auth.backToLogin')}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                {t('auth.verifyEmail.failed')}
              </p>
              <Button className="w-full" onClick={() => (window.location.hash = '#/login')}>
                {t('auth.backToLogin')}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailScreen;
