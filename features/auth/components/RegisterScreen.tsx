import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Modal } from '../../../shared/components/ui/Modal';
import AuthHeader from './AuthHeader';
import { loadTurnstile } from '../../../shared/lib/turnstile';
import { ApiError } from '../../../shared/lib/runtimeApi';
import { isRealApiEnabled } from '../../../shared/lib/runtimeApi';
import { resendVerificationEmail } from '../api';

const RegisterScreen: React.FC = () => {
  const { register, isLoading } = useAuth();
  const { t } = useLanguage();
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState('');

  const setAuthFlash = (messageKey: string) => {
    try {
      localStorage.setItem('authFlash', messageKey);
    } catch {
      // ignore
    }
  };

  const turnstileSiteKey = useMemo(() => import.meta.env.VITE_TURNSTILE_SITE_KEY, []);
  const isHumanVerificationEnabled = Boolean(turnstileSiteKey);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

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

  const mapRegisterError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.code === 'HUMAN_VERIFICATION_REQUIRED') return t('auth.humanVerificationRequired');
      if (err.code === 'HUMAN_VERIFICATION_FAILED') return t('auth.humanVerificationFailed');
      if (err.code === 'EMAIL_ALREADY_USED') return t('auth.register.emailTaken');
      if (err.code === 'ALREADY_EXISTS') return t('auth.register.failed');
    }
    return t('auth.register.failed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendError('');
    if (!tenantName || !fullName || !email || !password) {
      setError(t('auth.register.allFieldsRequired'));
      return;
    }

    if (isHumanVerificationEnabled && !turnstileToken) {
      setError(t('auth.humanVerificationRequired'));
      return;
    }

    try {
      const success = await register({
        tenantName,
        adminFullName: fullName,
        adminEmail: email,
        adminPassword: password,
        turnstileToken: turnstileToken ?? undefined,
      });

      if (success) {
        if (isRealApiEnabled()) {
          setSuccessModalOpen(true);
          setResendSecondsLeft(60);
        } else {
          window.location.hash = '#/app';
        }
      } else {
        setError(t('auth.register.failed'));
        resetTurnstile();
      }
    } catch (err) {
      setError(mapRegisterError(err));
      resetTurnstile();
    }
  };

  useEffect(() => {
    if (!successModalOpen) return;
    if (resendSecondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setResendSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [successModalOpen, resendSecondsLeft]);

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
    // Keep existing flow: after successful registration, go to login.
    setAuthFlash('auth.checkEmailForVerification');
    window.location.hash = '#/login';
  };

  const handleResend = async () => {
    if (!email) return;
    if (resendSecondsLeft > 0) return;
    setIsResending(true);
    setResendError('');
    try {
      await resendVerificationEmail(email);
      setResendSecondsLeft(60);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'INVALID_INPUT') {
          setResendError(t('auth.register.resendFailed'));
          return;
        }
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

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-light-bg p-4">
      <AuthHeader />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            {t('branding.name')}
          </h1>
          <p className="text-text-secondary mt-2">{t('auth.register.title')}</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.register.restaurantName')}
              </label>
              <Input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="e.g., Sunset Bistro"
                required
              />
            </div>
            <hr className="my-2 border-border-color/50" />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.register.yourName')}
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('auth.password')}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {isHumanVerificationEnabled && (
              <div className="flex justify-center">
                <div ref={turnstileContainerRef} />
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '...' : t('auth.register.createAccountBtn')}
            </Button>
          </form>
        </Card>
        <div className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            {t('auth.register.haveAccount')}{' '}
            <button
              onClick={() => (window.location.hash = '#/login')}
              className="font-medium text-accent hover:underline"
            >
              {t('marketing.nav.login')}
            </button>
          </p>
        </div>
      </div>

      <Modal
        isOpen={successModalOpen}
        onClose={closeSuccessModal}
        title={t('auth.register.successTitle')}
      >
        <div className="p-6 space-y-4">
          <p className="text-text-secondary">{t('auth.register.successMessage')}</p>
          <p className="text-sm text-text-secondary">
            {resendSecondsLeft > 0
              ? t('auth.register.resendCountdown', { seconds: resendSecondsLeft })
              : t('auth.register.resendReady')}
          </p>

          {resendError && <p className="text-red-500 text-sm">{resendError}</p>}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleResend}
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

export default RegisterScreen;
