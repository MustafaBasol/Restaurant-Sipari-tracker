import React, { useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import TablesManagement from '../../tables/components/TablesManagement';
import MenuManagement from '../../menu/components/MenuManagement';
import UsersManagement from '../../users/components/UsersManagement';
import { TableIcon, MenuIcon, UsersIcon, HistoryIcon, ChartBarIcon, CogIcon, CreditCardIcon } from '../../../shared/components/icons/Icons';
import { Card } from '../../../shared/components/ui/Card';
import OrderHistory from '../../orders/components/OrderHistory';
import DailySummary from '../../reports/components/DailySummary';

const SettingsManagement = React.lazy(() => import('./SettingsManagement'));
const SubscriptionManagement = React.lazy(() => import('../../subscription/components/SubscriptionManagement'));


type AdminTab = 'tables' | 'menu' | 'users' | 'history' | 'reports' | 'settings' | 'subscription';

const AdminDashboard: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<AdminTab>('tables');

    const tabs: { id: AdminTab; labelKey: any; icon: React.ReactNode }[] = [
        { id: 'tables', labelKey: 'admin.tabs.tables', icon: <TableIcon /> },
        { id: 'menu', labelKey: 'admin.tabs.menu', icon: <MenuIcon /> },
        { id: 'users', labelKey: 'admin.tabs.users', icon: <UsersIcon /> },
        { id: 'history', labelKey: 'admin.tabs.orderHistory', icon: <HistoryIcon /> },
        { id: 'reports', labelKey: 'admin.tabs.reports', icon: <ChartBarIcon /> },
        { id: 'settings', labelKey: 'admin.tabs.settings', icon: <CogIcon /> },
        { id: 'subscription', labelKey: 'admin.tabs.subscription', icon: <CreditCardIcon /> },
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
            case 'reports':
                return <DailySummary />;
            case 'settings':
                return <SettingsManagement />;
            case 'subscription':
                return <SubscriptionManagement />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary">{t('admin.title')}</h1>
            <Card padding="none">
                <div className="border-b border-border-color p-2">
                    <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0
                                    ${activeTab === tab.id
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-text-secondary hover:bg-gray-100'
                                    }
                                `}
                            >
                                {tab.icon}
                                {t(tab.labelKey)}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-6">
                    {renderContent()}
                </div>
            </Card>
        </div>
    );
};

export default AdminDashboard;