
import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { UserRole } from '../types';
import AdminDashboard from './AdminDashboard';
import WaiterDashboard from './WaiterDashboard';
import KitchenDashboard from './KitchenDashboard';
import AppHeader from '../components/shared/AppHeader';

const MainDashboard: React.FC = () => {
    const { authState, isLoading } = useAppContext();

    if (isLoading || !authState) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
            </div>
        );
    }

    const renderDashboard = () => {
        switch (authState.user.role) {
            case UserRole.ADMIN:
                return <AdminDashboard />;
            case UserRole.WAITER:
                return <WaiterDashboard />;
            case UserRole.KITCHEN:
                return <KitchenDashboard />;
            default:
                return <div className="p-8">Invalid user role.</div>;
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <AppHeader />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-light-bg">
                {renderDashboard()}
            </main>
        </div>
    );
};

export default MainDashboard;
