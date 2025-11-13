import React, { ReactNode } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { UserRole } from '../shared/types';

// Lazy load components for better performance
const LoginScreen = React.lazy(() => import('../features/auth/components/LoginScreen'));
const RegisterScreen = React.lazy(() => import('../features/auth/components/RegisterScreen'));
const MainDashboard = React.lazy(() => import('../features/dashboard/components/MainDashboard'));
const SuperAdminDashboard = React.lazy(() => import('../features/super-admin/components/SuperAdminDashboard'));

interface ProtectedRouteProps {
    children: ReactNode;
    roles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
    const { authState, isLoading } = useAuth();

    if (isLoading) {
         return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!authState) {
        // In a real app, you'd use a router library to redirect.
        // For this simple case, we just won't render the component.
        return null; 
    }

    if (roles && !roles.includes(authState.user.role)) {
        return <p>You do not have permission to view this page.</p>;
    }

    return <>{children}</>;
};


const Router: React.FC = () => {
    const { authState } = useAuth();
    const [isRegistering, setIsRegistering] = React.useState(false);

    if (!authState) {
        return (
            <React.Suspense fallback={<div>Loading...</div>}>
                {isRegistering ? (
                    <RegisterScreen onSwitchToLogin={() => setIsRegistering(false)} />
                ) : (
                    <LoginScreen onSwitchToRegister={() => setIsRegistering(true)} />
                )}
            </React.Suspense>
        );
    }

    return (
        <React.Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
            </div>
        }>
            {authState.user.role === UserRole.SUPER_ADMIN ? (
                 <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
                    <SuperAdminDashboard />
                </ProtectedRoute>
            ) : (
                 <ProtectedRoute roles={[UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN]}>
                    <MainDashboard />
                </ProtectedRoute>
            )}
        </React.Suspense>
    );
};

export default Router;
