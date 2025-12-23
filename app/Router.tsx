import React, { useMemo, useState, useEffect, Suspense, useRef } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useLanguage } from '../shared/hooks/useLanguage';
import { UserRole } from '../shared/types';
import { isSubscriptionActive } from '../shared/lib/utils';

const LANG_STORAGE_KEY = 'kitchorify-lang';

const getStoredLanguagePreference = (): 'en' | 'tr' | 'fr' | null => {
  try {
    const value = window.localStorage.getItem(LANG_STORAGE_KEY);
    return value === 'en' || value === 'tr' || value === 'fr' ? value : null;
  } catch {
    return null;
  }
};

// Lazy load components for better performance
const LoginScreen = React.lazy(() => import('../features/auth/components/LoginScreen'));
const RegisterScreen = React.lazy(() => import('../features/auth/components/RegisterScreen'));
const VerifyEmailScreen = React.lazy(() => import('../features/auth/components/VerifyEmailScreen'));
const ForgotPasswordScreen = React.lazy(
  () => import('../features/auth/components/ForgotPasswordScreen'),
);
const ResetPasswordScreen = React.lazy(
  () => import('../features/auth/components/ResetPasswordScreen'),
);
const MainDashboard = React.lazy(() => import('../features/dashboard/components/MainDashboard'));
const SuperAdminDashboard = React.lazy(
  () => import('../features/super-admin/components/SuperAdminDashboard'),
);
const HomePage = React.lazy(() => import('../features/marketing/pages/HomePage'));
const PrivacyPage = React.lazy(() => import('../features/marketing/pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('../features/marketing/pages/TermsPage'));
const CookiePolicyPage = React.lazy(() => import('../features/marketing/pages/CookiePolicyPage'));
const SecurityPage = React.lazy(() => import('../features/marketing/pages/SecurityPage'));
const DataRightsPage = React.lazy(() => import('../features/marketing/pages/DataRightsPage'));
const SubscriptionTermsPage = React.lazy(
  () => import('../features/marketing/pages/SubscriptionTermsPage'),
);
const SubscriptionEndedScreen = React.lazy(
  () => import('../features/subscription/components/SubscriptionEndedScreen'),
);
const CheckoutPage = React.lazy(() => import('../features/subscription/pages/CheckoutPage'));

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
  </div>
);

const normalizeHash = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : '#/';

const AppRoutes: React.FC = () => {
  const { authState, isLoading } = useAuth();
  const { setLang } = useLanguage();

  const lastTenantIdRef = useRef<string | null>(null);

  const [hash, setHash] = useState(() => normalizeHash(window.location.hash));
  const currentHash = hash || '#/';
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(normalizeHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const tenantId = authState?.tenant?.id ?? null;
    const tenantDefaultLanguage = authState?.tenant?.defaultLanguage;

    const storedLanguagePreference = getStoredLanguagePreference();

    // Apply tenant default language only once per tenant (e.g., on login / tenant switch).
    // Do not override manual language switching.
    if (tenantId && lastTenantIdRef.current !== tenantId && tenantDefaultLanguage) {
      lastTenantIdRef.current = tenantId;
      if (!storedLanguagePreference) {
        setLang(tenantDefaultLanguage);
      }
    }

    if (!tenantId) {
      lastTenantIdRef.current = null;
    }
  }, [authState?.tenant?.id, authState?.tenant?.defaultLanguage, setLang]);

  const canAccessLegalPage = useMemo(() => {
    return (
      currentHash === '#/privacy' ||
      currentHash === '#/terms' ||
      currentHash === '#/cookies' ||
      currentHash === '#/security' ||
      currentHash === '#/data-rights' ||
      currentHash === '#/subscription-terms'
    );
  }, [currentHash]);

  const legalPageType = useMemo<
    'privacy' | 'terms' | 'cookies' | 'security' | 'data-rights' | 'subscription-terms' | null
  >(() => {
    if (currentHash === '#/privacy') return 'privacy';
    if (currentHash === '#/terms') return 'terms';
    if (currentHash === '#/cookies') return 'cookies';
    if (currentHash === '#/security') return 'security';
    if (currentHash === '#/data-rights') return 'data-rights';
    if (currentHash === '#/subscription-terms') return 'subscription-terms';
    return null;
  }, [currentHash]);

  // Decide whether we should redirect. IMPORTANT: do not mutate location during render.
  useEffect(() => {
    if (isLoading) {
      setRedirectTo(null);
      return;
    }

    let next: string | null = null;

    if (authState) {
      const subscriptionIsActive =
        authState.user.role === UserRole.SUPER_ADMIN ||
        (authState.tenant ? isSubscriptionActive(authState.tenant) : false);

      if (subscriptionIsActive) {
        // Logged-in + active: allow legal pages and checkout; otherwise force /app
        if (
          !canAccessLegalPage &&
          !currentHash.startsWith('#/app') &&
          !currentHash.startsWith('#/checkout')
        ) {
          next = '#/app';
        }
      } else {
        // Logged-in + inactive: allow only legal + subscription-ended + checkout
        const allowed =
          canAccessLegalPage ||
          currentHash === '#/subscription-ended' ||
          currentHash.startsWith('#/checkout');

        if (!allowed) {
          next = '#/subscription-ended';
        }
      }
    } else {
      // Logged-out: allow marketing + legal + auth routes. Any app-only route goes home.
      const allowed =
        canAccessLegalPage ||
        currentHash === '#/' ||
        currentHash.startsWith('#/login') ||
        currentHash.startsWith('#/register') ||
        currentHash.startsWith('#/verify-email') ||
        currentHash.startsWith('#/forgot-password') ||
        currentHash.startsWith('#/reset-password');

      if (!allowed) {
        next = '#/';
      }
    }

    setRedirectTo(next);
  }, [authState, canAccessLegalPage, currentHash, isLoading]);

  useEffect(() => {
    if (redirectTo && redirectTo !== currentHash) {
      window.location.hash = redirectTo;
    }
  }, [currentHash, redirectTo]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (redirectTo && redirectTo !== currentHash) {
    return <LoadingSpinner />;
  }

  // --- Rerouted logic for robustness ---

  if (authState) {
    const subscriptionIsActive =
      authState.user.role === UserRole.SUPER_ADMIN ||
      (authState.tenant ? isSubscriptionActive(authState.tenant) : false);

    if (canAccessLegalPage) {
      if (legalPageType === 'privacy') return <PrivacyPage />;
      if (legalPageType === 'terms') return <TermsPage />;
      if (legalPageType === 'cookies') return <CookiePolicyPage />;
      if (legalPageType === 'security') return <SecurityPage />;
      if (legalPageType === 'data-rights') return <DataRightsPage />;
      return <SubscriptionTermsPage />;
    }

    if (subscriptionIsActive) {
      if (currentHash.startsWith('#/checkout')) return <CheckoutPage />;
      return authState.user.role === UserRole.SUPER_ADMIN ? (
        <SuperAdminDashboard />
      ) : (
        <MainDashboard />
      );
    }

    // Inactive subscription
    if (currentHash === '#/subscription-ended') return <SubscriptionEndedScreen />;
    if (currentHash.startsWith('#/checkout')) return <CheckoutPage />;
    return <LoadingSpinner />;
  }

  // Logged-out
  if (canAccessLegalPage) {
    if (legalPageType === 'privacy') return <PrivacyPage />;
    if (legalPageType === 'terms') return <TermsPage />;
    if (legalPageType === 'cookies') return <CookiePolicyPage />;
    if (legalPageType === 'security') return <SecurityPage />;
    if (legalPageType === 'data-rights') return <DataRightsPage />;
    return <SubscriptionTermsPage />;
  }
  if (currentHash === '#/login') return <LoginScreen />;
  if (currentHash === '#/register') return <RegisterScreen />;
  if (currentHash.startsWith('#/verify-email')) return <VerifyEmailScreen />;
  if (currentHash.startsWith('#/forgot-password')) return <ForgotPasswordScreen />;
  if (currentHash.startsWith('#/reset-password')) return <ResetPasswordScreen />;
  return <HomePage />;
};

const Router: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppRoutes />
    </Suspense>
  );
};

export default Router;
