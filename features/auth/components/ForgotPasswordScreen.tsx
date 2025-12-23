import React, { useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import AuthHeader from './AuthHeader';
import * as api from '../api';

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.requestPasswordReset(email);
      setDone(true);
    } catch {
      setError(t('auth.passwordReset.requestFailed'));
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
          <p className="text-text-secondary mt-2">{t('auth.passwordReset.title')}</p>
        </div>

        <Card>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                {t('auth.passwordReset.requestSuccess')}
              </p>
              <Button className="w-full" onClick={() => (window.location.hash = '#/login')}>
                {t('auth.backToLogin')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('auth.email')}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? '...' : t('auth.passwordReset.sendLink')}
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

export default ForgotPasswordScreen;
