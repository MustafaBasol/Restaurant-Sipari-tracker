import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import TablesManagement from '../components/admin/TablesManagement';
import MenuManagement from '../components/admin/MenuManagement';
import UsersManagement from '../components/admin/UsersManagement';
import { TableIcon, MenuIcon, UsersIcon, HistoryIcon } from '../components/icons/Icons';
import OrderHistory from '../components/admin/OrderHistory';

type AdminTab = 'tables' | 'menu' | 'users' | 'history';

const AdminDashboard: React.FC = () => {
    const { t } = useAppContext();
    const [activeTab, setActiveTab] = useState<AdminTab>('tables');

    const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
        { id: 'tables', label: t('tablesManagement'), icon: <TableIcon /> },
        { id: 'menu', label: t('menuManagement'), icon: <MenuIcon /> },
        { id: 'users', label: t('usersManagement'), icon: <UsersIcon /> },
        { id: 'history', label: t('orderHistory'), icon: <HistoryIcon /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'tables':
                return <TablesManagement />;
            case 'menu':
                return <MenuManagement />;
            case 'users':
                return <UsersManagement />;
            case 'history':
                return <OrderHistory />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary">{t('adminDashboard')}</h1>
            <div className="bg-card-bg rounded-2xl shadow-subtle">
                <div className="border-b border-border-color p-2">
                    <nav className="flex space-x-2" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                                    ${activeTab === tab.id
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-text-secondary hover:bg-gray-100'
                                    }
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;