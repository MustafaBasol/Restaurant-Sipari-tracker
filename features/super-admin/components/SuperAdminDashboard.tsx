import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import AppHeader from '../../../shared/components/layout/AppHeader';
import TenantList from './TenantList';
import { useTenants } from '../hooks/useTenants';
import { Card } from '../../../shared/components/ui/Card';

const SuperAdminDashboard: React.FC = () => {
    const { t } = useLanguage();
    const { isLoading } = useTenants();

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
                    <h1 className="text-3xl font-bold text-text-primary">{t('superAdmin.title')}</h1>
                    <Card>
                         <h2 className="text-xl font-semibold mb-4">{t('superAdmin.tenants')}</h2>
                         <TenantList />
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
