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

  const billingWarning = (() => {
    if (!isAdmin || !tenant) return null;
    const pastDueRaw = (tenant as any).billingPastDueAt as Date | string | undefined;
    const graceRaw = (tenant as any).billingGraceEndsAt as Date | string | undefined;
    const restrictedRaw = (tenant as any).billingRestrictedAt as Date | string | undefined;
    if (!pastDueRaw || !graceRaw) return null;
    if (restrictedRaw) return null;
    const graceEndsAt = new Date(graceRaw as any);
    if (Number.isNaN(graceEndsAt.getTime())) return null;
    const msLeft = graceEndsAt.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    return { daysLeft, graceEndsAt };
  })();

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

        {billingWarning ? (
          <div className="pb-3">
            <div className="flex items-start gap-3 rounded-xl border border-border-color bg-card-bg px-4 py-3">
              <Badge variant="yellow" className="shrink-0">
                {t('billing.warning.title')}
              </Badge>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  {t('billing.warning.message')
                    .replace('{days}', String(billingWarning.daysLeft))
                    .replace(
                      '{date}',
                      billingWarning.graceEndsAt.toLocaleDateString(),
                    )}
                </div>
                <div className="text-xs text-text-secondary mt-1">{t('billing.warning.hint')}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default AppHeader;
