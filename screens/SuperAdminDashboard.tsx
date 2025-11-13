import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import AppHeader from '../components/shared/AppHeader';
import TenantList from '../components/superadmin/TenantList';

const SuperAdminDashboard: React.FC = () => {
    const { t, isLoading } = useAppContext();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <AppHeader />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-light-bg">
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold text-text-primary">{t('superAdminDashboard')}</h1>
                    <div className="bg-card-bg p-6 rounded-2xl shadow-subtle">
                         <h2 className="text-xl font-semibold mb-4">{t('tenants')}</h2>
                         <TenantList />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
