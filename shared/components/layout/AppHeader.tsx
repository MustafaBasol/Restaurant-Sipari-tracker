import React from 'react';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import LanguageSwitcher from '../LanguageSwitcher';
import { UserRole } from '../../types';
import { NotificationBell } from '../../../features/notifications/components/NotificationBell';
import { getTrialDaysLeft } from '../../lib/utils';
import { Badge } from '../ui/Badge';

const AppHeader: React.FC = () => {
  const { authState, logout } = useAuth();
  const { t } = useLanguage();

  if (!authState) return null;

  const { user, tenant } = authState;
  const isKitchenUser = user.role === UserRole.KITCHEN;
  const isAdmin = user.role === UserRole.ADMIN;

  const getRoleDisplayName = (role: UserRole) => {
    return t(`roles.${role}`);
  };

  const trialDaysLeft = tenant ? getTrialDaysLeft(tenant) : 0;

  return (
    <header className="bg-card-bg/80 backdrop-blur-sm border-b border-border-color sticky top-0 z-10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <img src="/Logo.png" alt={t('branding.name')} className="h-8 w-8" />
              <span className="text-xl font-bold text-text-primary">{t('branding.name')}</span>
            </div>
            <span className="hidden sm:block text-text-secondary">|</span>
            <span className="hidden sm:block text-lg font-medium text-text-secondary truncate min-w-0">
              {tenant ? tenant.name : t('superAdmin.title')}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {isKitchenUser && <NotificationBell />}

            {isAdmin && trialDaysLeft > 0 && (
              <Badge
                variant={trialDaysLeft <= 3 ? 'yellow' : 'blue'}
                className="hidden sm:inline-flex"
              >
                {t('subscription.trialEndsIn').replace('{days}', trialDaysLeft.toString())}
              </Badge>
            )}

            <div className="text-right min-w-0 max-w-[10rem] sm:max-w-[14rem]">
              <p className="font-semibold text-sm text-text-primary truncate">{user.fullName}</p>
              <p className="hidden sm:block text-xs text-text-secondary truncate">
                {getRoleDisplayName(user.role)}
              </p>
            </div>
            <LanguageSwitcher />
            <button
              onClick={logout}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              {t('header.logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
