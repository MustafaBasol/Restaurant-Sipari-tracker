import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
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

const ResetPasswordScreen: React.FC = () => {
  const { t } = useLanguage();
  const token = useMemo(() => getHashQueryParam('token'), []);

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('auth.passwordReset.invalidOrExpired'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.passwordReset.passwordTooShort'));
      return;
    }

    if (newPassword !== confirm) {
      setError(t('auth.passwordReset.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch {
      setError(t('auth.passwordReset.invalidOrExpired'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-light-bg p-4">
      <AuthHeader />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            {t('branding.name')}
          </h1>
          <p className="text-text-secondary mt-2">{t('auth.passwordReset.resetTitle')}</p>
        </div>

        <Card>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                {t('auth.passwordReset.resetSuccess')}
              </p>
              <Button className="w-full" onClick={() => (window.location.hash = '#/login')}>
                {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('auth.passwordReset.newPassword')}
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('auth.passwordReset.confirmPassword')}
                </label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? '...' : t('auth.passwordReset.resetBtn')}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-accent hover:underline"
                onClick={() => (window.location.hash = '#/login')}
              >
                {t('auth.backToLogin')}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
