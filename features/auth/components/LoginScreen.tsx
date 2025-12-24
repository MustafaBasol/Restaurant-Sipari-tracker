import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import LanguageSwitcher from '../../../shared/components/LanguageSwitcher';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Modal } from '../../../shared/components/ui/Modal';
import AuthHeader from './AuthHeader';
import { loadTurnstile } from '../../../shared/lib/turnstile';
import { ApiError, isRealApiEnabled } from '../../../shared/lib/runtimeApi';
import { resendVerificationEmail } from '../api';

const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { t } = useLanguage();
  const isDemoMode = useMemo(() => !isRealApiEnabled(), []);
  const [email, setEmail] = useState(() => (isDemoMode ? 'waiter@sunsetbistro.com' : ''));
  const [password, setPassword] = useState(() => (isDemoMode ? 'sunset-bistro' : ''));
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfaCode, setNeedsMfaCode] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState('');

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

      // If register sent the user here, show the verification modal.
      if (key === 'auth.checkEmailForVerification') {
        const storedEmail = localStorage.getItem('pendingVerificationEmail') ?? '';
        const storedAtRaw = localStorage.getItem('pendingVerificationResendAt') ?? '';
        const storedAt = Number(storedAtRaw);
        const now = Date.now();
        const secondsLeft =
          Number.isFinite(storedAt) && storedAt > 0
            ? Math.max(0, 60 - Math.floor((now - storedAt) / 1000))
            : 60;
        setPendingVerificationEmail(storedEmail);
        setResendSecondsLeft(secondsLeft);
        setResendError('');
        setVerificationModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, [t]);

  useEffect(() => {
    if (!verificationModalOpen) return;
    if (resendSecondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setResendSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [verificationModalOpen, resendSecondsLeft]);

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
      if (err.code === 'MFA_REQUIRED') return t('auth.mfaRequired');
      if (err.code === 'MFA_INVALID') return t('auth.mfaInvalid');
      if (err.code === 'INVALID_CREDENTIALS') return t('auth.loginFailed');
      if (err.code === 'INVALID_INPUT') return t('auth.invalidInput');
      if (err.status === 400) return t('auth.invalidInput');
    }
    return t('auth.loginFailed');
  };

  const closeVerificationModal = () => {
    setVerificationModalOpen(false);
  };

  const openVerificationModalForEmail = (targetEmail: string) => {
    const normalized = targetEmail.trim();
    setPendingVerificationEmail(normalized);
    setResendError('');

    try {
      const storedAtRaw = localStorage.getItem('pendingVerificationResendAt') ?? '';
      const storedAt = Number(storedAtRaw);
      const now = Date.now();
      const secondsLeft =
        Number.isFinite(storedAt) && storedAt > 0
          ? Math.max(0, 60 - Math.floor((now - storedAt) / 1000))
          : 0;
      setResendSecondsLeft(secondsLeft);
    } catch {
      setResendSecondsLeft(0);
    }

    setVerificationModalOpen(true);
  };

  const handleResendVerification = async () => {
    const targetEmail = (pendingVerificationEmail || email).trim();
    if (!targetEmail) return;
    if (resendSecondsLeft > 0) return;
    setIsResending(true);
    setResendError('');
    try {
      await resendVerificationEmail(targetEmail);
      try {
        localStorage.setItem('pendingVerificationEmail', targetEmail);
        localStorage.setItem('pendingVerificationResendAt', String(Date.now()));
      } catch {
        // ignore
      }
      setResendSecondsLeft(60);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'TOO_MANY_REQUESTS') {
          setResendSecondsLeft(60);
          return;
        }
      }
      setResendError(t('auth.register.resendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isHumanVerificationEnabled && !turnstileToken) {
      setError(t('auth.humanVerificationRequired'));
      return;
    }

    if (needsMfaCode && !mfaCode.trim()) {
      setError(t('auth.mfaRequired'));
      return;
    }

    try {
      const success = await login(
        email,
        password,
        turnstileToken ?? undefined,
        needsMfaCode ? mfaCode.trim() : undefined,
      );
      if (success) {
        window.location.hash = '#/app';
      } else {
        setError(t('auth.loginFailed'));
        resetTurnstile();
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MFA_REQUIRED') {
        setNeedsMfaCode(true);
      }

      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setError(t('auth.emailNotVerified'));
        openVerificationModalForEmail(email);
        resetTurnstile();
        return;
      }

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
                placeholder={isDemoMode ? 'waiter@sunsetbistro.com' : undefined}
                required
              />
            </div>

            {needsMfaCode && (
              <div className="mb-6">
                <label htmlFor="mfa" className="block text-sm font-medium text-text-secondary mb-2">
                  {t('auth.mfaCode')}
                </label>
                <Input
                  id="mfa"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
            )}
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
                placeholder={isDemoMode ? 'sunset-bistro' : undefined}
                required
              />
              {isDemoMode && (
                <p className="text-xs text-text-secondary mt-1">
                  Hint: Use tenant slug as password for demo.
                </p>
              )}
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

      <Modal
        isOpen={verificationModalOpen}
        onClose={closeVerificationModal}
        title={t('auth.verifyEmail.title')}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-text-secondary">{t('auth.verificationRequiredMessage')}</p>
          {(pendingVerificationEmail || email).trim() && (
            <p className="text-sm text-text-secondary">
              {t('auth.verificationEmailSentTo').replace(
                '{email}',
                (pendingVerificationEmail || email).trim(),
              )}
            </p>
          )}
          <p className="text-sm text-text-secondary">
            {resendSecondsLeft > 0
              ? t('auth.register.resendCountdown', { seconds: resendSecondsLeft })
              : t('auth.register.resendReady')}
          </p>

          {resendError && <p className="text-red-500 text-sm">{resendError}</p>}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending || resendSecondsLeft > 0}
            >
              {t('auth.register.resendButton')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoginScreen;
