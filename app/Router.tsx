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
const SubscriptionEndedScreen = React.lazy(() => import('../features/subscription/components/SubscriptionEndedScreen'));

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
    </div>
);

const AppRoutes: React.FC = () => {
    const { authState, isLoading } = useAuth();
    const { lang, setLang } = useLanguage();
    
    // Simple hash-based routing
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

    // If user is authenticated
    if (authState) {
        const subscriptionIsActive = authState.user.role === UserRole.SUPER_ADMIN || (authState.tenant && isSubscriptionActive(authState.tenant));

        // App routes
        if (hash.startsWith('#/app')) {
            if (!subscriptionIsActive) {
                return <SubscriptionEndedScreen />;
            }

            if (authState.user.role === UserRole.SUPER_ADMIN) {
                return <SuperAdminDashboard />;
            }
            return <MainDashboard />;
        }
        
        // Redirect logged-in users trying to access login/register to the app dashboard.
        if (hash === '#/login' || hash === '#/register') {
            window.location.hash = '#/app';
            return <LoadingSpinner />;
        }
        
        if (hash === '#/subscription-ended' && !subscriptionIsActive) {
            return <SubscriptionEndedScreen />;
        }
        
        // If subscription is expired and they are not on a permitted page, redirect them.
        if (!subscriptionIsActive && hash !== '#/subscription-ended') {
            window.location.hash = '#/subscription-ended';
            return <LoadingSpinner />;
        }

        return <HomePage />;
    }
    
    // Public routes for logged-out users
    switch (hash) {
        case '#/login':
            return <LoginScreen />;
        case '#/register':
            return <RegisterScreen />;
        case '#/':
        default:
            // Redirect logged-out users trying to access the app to the login page
            if (hash.startsWith('#/app') || hash.startsWith('#/subscription')) {
                window.location.hash = '#/login';
                return <LoadingSpinner />;
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