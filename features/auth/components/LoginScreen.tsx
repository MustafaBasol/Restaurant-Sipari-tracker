import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import LanguageSwitcher from '../../../shared/components/LanguageSwitcher';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import AuthHeader from './AuthHeader';
import { loadTurnstile } from '../../../shared/lib/turnstile';
import { ApiError } from '../../../shared/lib/runtimeApi';

const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('waiter@sunsetbistro.com');
  const [password, setPassword] = useState('sunset-bistro');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const turnstileSiteKey = useMemo(() => import.meta.env.VITE_TURNSTILE_SITE_KEY, []);
  const isHumanVerificationEnabled = Boolean(turnstileSiteKey);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const key = localStorage.getItem('authFlash');
      if (!key) return;
      localStorage.removeItem('authFlash');
      setInfo(t(key));
    } catch {
      // ignore
    }
  }, [t]);

  useEffect(() => {
    if (!isHumanVerificationEnabled) return;
    let cancelled = false;
    let renderedWidgetId: string | null = null;

    loadTurnstile()
      .then(() => {
        if (cancelled) return;
        const container = turnstileContainerRef.current;
        if (!container || !window.turnstile || !turnstileSiteKey) return;

        container.innerHTML = '';
        renderedWidgetId = window.turnstile.render(container, {
          sitekey: turnstileSiteKey,
          theme: 'light',
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
        });

        turnstileWidgetIdRef.current = renderedWidgetId;
      })
      .catch(() => {
        setTurnstileToken(null);
      });

    return () => {
      cancelled = true;
      try {
        if (renderedWidgetId && window.turnstile?.remove) {
          window.turnstile.remove(renderedWidgetId);
        }
      } catch {
        // ignore
      }
    };
  }, [isHumanVerificationEnabled, turnstileSiteKey]);

  const resetTurnstile = () => {
    if (!isHumanVerificationEnabled) return;
    try {
      const widgetId = turnstileWidgetIdRef.current ?? undefined;
      window.turnstile?.reset?.(widgetId);
    } catch {
      // ignore
    } finally {
      setTurnstileToken(null);
    }
  };

  const mapAuthError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.code === 'HUMAN_VERIFICATION_REQUIRED') return t('auth.humanVerificationRequired');
      if (err.code === 'HUMAN_VERIFICATION_FAILED') return t('auth.humanVerificationFailed');
      if (err.code === 'EMAIL_NOT_VERIFIED') return t('auth.emailNotVerified');
      if (err.code === 'INVALID_CREDENTIALS') return t('auth.loginFailed');
    }
    return t('auth.loginFailed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isHumanVerificationEnabled && !turnstileToken) {
      setError(t('auth.humanVerificationRequired'));
      return;
    }

    try {
      const success = await login(email, password, turnstileToken ?? undefined);
      if (success) {
        window.location.hash = '#/app';
      } else {
        setError(t('auth.loginFailed'));
        resetTurnstile();
      }
    } catch (err) {
      setError(mapAuthError(err));
      resetTurnstile();
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
          <p className="text-text-secondary mt-2">{t('auth.welcome')}</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="waiter@sunsetbistro.com"
                required
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t('auth.password')}
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="sunset-bistro"
                required
              />
              <p className="text-xs text-text-secondary mt-1">
                Hint: Use tenant slug as password for demo.
              </p>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-sm text-accent hover:underline"
                  onClick={() => (window.location.hash = '#/forgot-password')}
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            </div>
            {info && <p className="text-sm text-text-secondary mb-4 text-center">{info}</p>}
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            {isHumanVerificationEnabled && (
              <div className="mb-4 flex justify-center">
                <div ref={turnstileContainerRef} />
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '...' : t('auth.signIn')}
            </Button>
          </form>
        </Card>
        <div className="mt-8 text-center">
          <div className="inline-block">
            <LanguageSwitcher />
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            {t('auth.newHere')}{' '}
            <button
              onClick={() => (window.location.hash = '#/register')}
              className="font-semibold text-accent hover:underline focus:outline-none"
            >
              {t('auth.createAccountLink')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
