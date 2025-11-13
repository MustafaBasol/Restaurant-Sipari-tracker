
import React, { useState } from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LoginScreen from './screens/LoginScreen';
import MainDashboard from './screens/MainDashboard';
import RegisterScreen from './screens/RegisterScreen';
import SuperAdminDashboard from './screens/SuperAdminDashboard';
import { UserRole } from './types';

const AuthFlow: React.FC = () => {
    const [isRegistering, setIsRegistering] = useState(false);

    if (isRegistering) {
        return <RegisterScreen onSwitchToLogin={() => setIsRegistering(false)} />;
    }

    return <LoginScreen onSwitchToRegister={() => setIsRegistering(true)} />;
};


const AppContent: React.FC = () => {
    const { authState } = useAppContext();

    if (!authState) {
        return <AuthFlow />;
    }

    if (authState.user.role === UserRole.SUPER_ADMIN) {
        return <SuperAdminDashboard />;
    }

    if (authState.tenant) {
        return <MainDashboard />;
    }

    // Fallback or loading state
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <div className="min-h-screen text-text-primary font-sans">
                <AppContent />
            </div>
        </AppProvider>
    );
};

export default App;
