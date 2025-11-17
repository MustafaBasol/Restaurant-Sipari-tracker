
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useLanguage } from '../shared/hooks/useLanguage';
import { UserRole } from '../shared/types';
import { isSubscriptionActive } from '../shared/lib/utils';

// Lazy load components for better performance
const LoginScreen = React.lazy(() => import('../features/auth/components/LoginScreen'));
const RegisterScreen = React.lazy(() => import('../features/auth/components/RegisterScreen'));
const MainDashboard = React.lazy(() => import('../features/dashboard/components/MainDashboard'));
const SuperAdminDashboard = React.lazy(() => import('../features/super-admin/components/SuperAdminDashboard'));
const HomePage = React.lazy(() => import('../features/marketing/pages/HomePage'));
const PrivacyPage = React.lazy(() => import('../features/marketing/pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('../features/marketing/pages/TermsPage'));
const SubscriptionEndedScreen = React.lazy(() => import('../features/subscription/components/SubscriptionEndedScreen'));
const CheckoutPage = React.lazy(() => import('../features/subscription/pages/CheckoutPage'));

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
    </div>
);

const AppRoutes: React.FC = () => {
    const { authState, isLoading } = useAuth();
    const { lang, setLang } = useLanguage();
    
    const [hash, setHash] = useState(window.location.hash || '#/');
    
    useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash || '#/');
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        if (authState?.tenant && authState.tenant.defaultLanguage !== lang) {
            setLang(authState.tenant.defaultLanguage);
        }
    }, [authState, lang, setLang]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    // --- Rerouted logic for robustness ---

    if (authState) {
        // --- LOGGED-IN USER ---
        const subscriptionIsActive = authState.user.role === UserRole.SUPER_ADMIN || (authState.tenant && isSubscriptionActive(authState.tenant));

        if (subscriptionIsActive) {
            // --- ACTIVE subscription ---
            // Legal pages are still accessible
            if (hash === '#/privacy') return <PrivacyPage />;
            if (hash === '#/terms') return <TermsPage />;
            
            // Redirect from marketing/auth/inactive pages to the app dashboard
            if (['#/', '#/login', '#/register', '#/subscription-ended', '#/checkout'].includes(hash) || !hash.startsWith('#/app')) {
                window.location.hash = '#/app';
                return <LoadingSpinner />;
            }
            
            // Render the correct dashboard
            return authState.user.role === UserRole.SUPER_ADMIN ? <SuperAdminDashboard /> : <MainDashboard />;
            
        } else {
            // --- INACTIVE subscription ---
            // User can ONLY see legal pages, subscription ended page, and checkout page.
            if (hash === '#/privacy') return <PrivacyPage />;
            if (hash === '#/terms') return <TermsPage />;
            if (hash === '#/subscription-ended') return <SubscriptionEndedScreen />;
            if (hash === '#/checkout') return <CheckoutPage />;

            // For any other page, redirect to subscription-ended
            window.location.hash = '#/subscription-ended';
            return <LoadingSpinner />;
        }

    } else {
        // --- LOGGED-OUT USER ---
        // Can see marketing and legal pages
        if (hash === '#/privacy') return <PrivacyPage />;
        if (hash === '#/terms') return <TermsPage />;
        if (hash === '#/login') return <LoginScreen />;
        if (hash === '#/register') return <RegisterScreen />;
        
        // For anything else (like a bookmark to /app), show the homepage
        // This also handles the default case for '/'
        if (hash.startsWith('#/app') || hash.startsWith('#/subscription-ended') || hash.startsWith('#/checkout')) {
             window.location.hash = '#/';
             return <LoadingSpinner/>
        }
       
        return <HomePage />;
    }
};


const Router: React.FC = () => {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <AppRoutes />
        </Suspense>
    );
};

export default Router;