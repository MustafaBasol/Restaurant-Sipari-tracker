import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useLanguage } from '../shared/hooks/useLanguage';
import { UserRole } from '../shared/types';
import { isSubscriptionActive } from '../shared/lib/utils';

// Lazy load components for better performance
const LoginScreen = React.lazy(() => import('../features/auth/components/LoginScreen'));
const RegisterScreen = React.lazy(() => import('../features/auth/components/RegisterScreen'));
const MainDashboard = React.lazy(() => import('../features/dashboard/components/MainDashboard'));
const SuperAdminDashboard = React.lazy(
  () => import('../features/super-admin/components/SuperAdminDashboard'),
);
const HomePage = React.lazy(() => import('../features/marketing/pages/HomePage'));
const PrivacyPage = React.lazy(() => import('../features/marketing/pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('../features/marketing/pages/TermsPage'));
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
  const { lang, setLang } = useLanguage();

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
    if (authState?.tenant && authState.tenant.defaultLanguage !== lang) {
      setLang(authState.tenant.defaultLanguage);
    }
  }, [authState, lang, setLang]);

  const canAccessLegalPage = useMemo(() => {
    return currentHash === '#/privacy' || currentHash === '#/terms';
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
        // Logged-in + active: allow legal pages; otherwise force /app
        if (!canAccessLegalPage && !currentHash.startsWith('#/app')) {
          next = '#/app';
        }
      } else {
        // Logged-in + inactive: allow only legal + subscription-ended + checkout
        const allowed =
          canAccessLegalPage ||
          currentHash === '#/subscription-ended' ||
          currentHash === '#/checkout';

        if (!allowed) {
          next = '#/subscription-ended';
        }
      }
    } else {
      // Logged-out: allow marketing + legal + auth routes. Any app-only route goes home.
      const allowed =
        canAccessLegalPage ||
        currentHash === '#/' ||
        currentHash === '#/login' ||
        currentHash === '#/register';

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
      return currentHash === '#/privacy' ? <PrivacyPage /> : <TermsPage />;
    }

    if (subscriptionIsActive) {
      return authState.user.role === UserRole.SUPER_ADMIN ? (
        <SuperAdminDashboard />
      ) : (
        <MainDashboard />
      );
    }

    // Inactive subscription
    if (currentHash === '#/subscription-ended') return <SubscriptionEndedScreen />;
    if (currentHash === '#/checkout') return <CheckoutPage />;
    return <LoadingSpinner />;
  }

  // Logged-out
  if (canAccessLegalPage) {
    return currentHash === '#/privacy' ? <PrivacyPage /> : <TermsPage />;
  }
  if (currentHash === '#/login') return <LoginScreen />;
  if (currentHash === '#/register') return <RegisterScreen />;
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
