import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import TablesManagement from '../../tables/components/TablesManagement';
import MenuManagement from '../../menu/components/MenuManagement';
import UsersManagement from '../../users/components/UsersManagement';
import CustomersManagement from '../../customers/components/CustomersManagement';
import {
  TableIcon,
  MenuIcon,
  UsersIcon,
  HistoryIcon,
  ChartBarIcon,
  CogIcon,
  CreditCardIcon,
} from '../../../shared/components/icons/Icons';
import { Card } from '../../../shared/components/ui/Card';
import OrderHistory from '../../orders/components/OrderHistory';
import DailySummary from '../../reports/components/DailySummary';

const SettingsManagement = React.lazy(() => import('./SettingsManagement'));
const AuditLogsManagement = React.lazy(() => import('./AuditLogsManagement'));
const SubscriptionManagement = React.lazy(
  () => import('../../subscription/components/SubscriptionManagement'),
);

type AdminTab =
  | 'tables'
  | 'menu'
  | 'users'
  | 'customers'
  | 'history'
  | 'reports'
  | 'auditLogs'
  | 'settings'
  | 'subscription';

const ADMIN_TAB_STORAGE_KEY = 'kitchorify-admin-active-tab';

const isAdminTab = (value: string | null | undefined): value is AdminTab => {
  return (
    value === 'tables' ||
    value === 'menu' ||
    value === 'users' ||
    value === 'customers' ||
    value === 'history' ||
    value === 'reports' ||
    value === 'auditLogs' ||
    value === 'settings' ||
    value === 'subscription'
  );
};

const getTabFromHash = (): AdminTab | null => {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#/app')) return null;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const tab = params.get('tab');
  return isAdminTab(tab) ? tab : null;
};

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const fromHash = getTabFromHash();
    if (fromHash) return fromHash;
    const fromStorage = localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    return isAdminTab(fromStorage) ? fromStorage : 'tables';
  });

  useEffect(() => {
    localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab);

    const currentHash = window.location.hash || '#/app';
    if (!currentHash.startsWith('#/app')) return;

    const qIndex = currentHash.indexOf('?');
    const base = qIndex === -1 ? '#/app' : currentHash.slice(0, qIndex);
    const params = new URLSearchParams(qIndex === -1 ? '' : currentHash.slice(qIndex + 1));
    params.set('tab', activeTab);
    const nextHash = `${base}?${params.toString()}`;
    if (nextHash !== currentHash) {
      window.location.hash = nextHash;
    }
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activeTab]);

  const tabs: { id: AdminTab; labelKey: any; icon: React.ReactNode }[] = [
    { id: 'tables', labelKey: 'admin.tabs.tables', icon: <TableIcon /> },
    { id: 'menu', labelKey: 'admin.tabs.menu', icon: <MenuIcon /> },
    { id: 'users', labelKey: 'admin.tabs.users', icon: <UsersIcon /> },
    { id: 'customers', labelKey: 'admin.tabs.customers', icon: <UsersIcon /> },
    { id: 'history', labelKey: 'admin.tabs.orderHistory', icon: <HistoryIcon /> },
    { id: 'reports', labelKey: 'admin.tabs.reports', icon: <ChartBarIcon /> },
    { id: 'auditLogs', labelKey: 'admin.tabs.auditLogs', icon: <HistoryIcon /> },
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
      case 'customers':
        return <CustomersManagement />;
      case 'history':
        return <OrderHistory />;
      case 'reports':
        return <DailySummary />;
      case 'auditLogs':
        return <AuditLogsManagement />;
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
      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('admin.title')}</h1>
      <Card padding="none">
        <div className="border-b border-border-color p-2">
          <div className="overflow-x-auto touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <nav className="flex gap-2 min-w-max" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ` +
                    (activeTab === tab.id
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:bg-gray-100')
                  }
                >
                  {tab.icon}
                  {t(tab.labelKey)}
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-4 sm:p-6">{renderContent()}</div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
