import React from 'react';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import LanguageSwitcher from '../LanguageSwitcher';
import { UserRole } from '../../types';

const AppHeader: React.FC = () => {
    const { authState, logout } = useAuth();
    const { t } = useLanguage();

    if (!authState) return null;

    const { user, tenant } = authState;

    const getRoleDisplayName = (role: UserRole) => {
        return t(`roles.${role}`);
    };

    return (
        <header className="bg-card-bg/80 backdrop-blur-sm border-b border-border-color sticky top-0 z-10">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <span className="text-xl font-bold text-text-primary">Ordo</span>
                        <span className="hidden sm:block text-text-secondary">|</span>
                        <span className="hidden sm:block text-lg font-medium text-text-secondary">
                            {tenant ? tenant.name : t('superAdmin.title')}
                        </span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="font-semibold text-sm text-text-primary">{user.fullName}</p>
                            <p className="text-xs text-text-secondary">{getRoleDisplayName(user.role)}</p>
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
