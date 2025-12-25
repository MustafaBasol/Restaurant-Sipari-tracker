import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import AppHeader from '../../../shared/components/layout/AppHeader';
import TenantList from './TenantList';
import { useTenants } from '../hooks/useTenants';
import { Card } from '../../../shared/components/ui/Card';
import { useAuth } from '../../auth/hooks/useAuth';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import MfaSetupModal from '../../auth/components/MfaSetupModal';
import * as authApi from '../../auth/api';
import { ApiError } from '../../../shared/lib/runtimeApi';

const SuperAdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { isLoading } = useTenants();
  const { authState, updateUserInState } = useAuth();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newPassword2, setNewPassword2] = React.useState('');
  const [pwStatus, setPwStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = React.useState<string>('');

  const [mfaOpen, setMfaOpen] = React.useState(false);
  const [mfaStatus, setMfaStatus] = React.useState<'idle' | 'saving' | 'error'>('idle');
  const [mfaError, setMfaError] = React.useState<string>('');

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
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {t('superAdmin.title')}
          </h1>

          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('superAdmin.account.title')}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">
                  {t('superAdmin.account.changePassword')}
                </h3>
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder={t('superAdmin.account.currentPassword')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('superAdmin.account.newPassword')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('superAdmin.account.newPasswordRepeat')}
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                  />

                  {pwError ? <div className="text-sm text-red-600">{pwError}</div> : null}
                  {pwStatus === 'success' ? (
                    <div className="text-sm text-green-700">{t('superAdmin.account.passwordChanged')}</div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        setPwError('');
                        setPwStatus('idle');

                        if (!currentPassword.trim() || !newPassword.trim()) {
                          setPwError(t('superAdmin.account.passwordMissing'));
                          return;
                        }
                        if (newPassword.trim().length < 8) {
                          setPwError(t('superAdmin.account.passwordTooShort'));
                          return;
                        }
                        if (newPassword !== newPassword2) {
                          setPwError(t('superAdmin.account.passwordMismatch'));
                          return;
                        }

                        setPwStatus('saving');
                        try {
                          await authApi.changeMyPassword(currentPassword, newPassword);
                          setPwStatus('success');
                          setCurrentPassword('');
                          setNewPassword('');
                          setNewPassword2('');
                          setTimeout(() => setPwStatus('idle'), 2000);
                        } catch (e) {
                          setPwStatus('error');
                          if (e instanceof ApiError && e.code === 'INVALID_CREDENTIALS') {
                            setPwError(t('superAdmin.account.currentPasswordInvalid'));
                          } else {
                            setPwError(t('superAdmin.account.passwordChangeFailed'));
                          }
                        }
                      }}
                      disabled={pwStatus === 'saving'}
                    >
                      {pwStatus === 'saving' ? '...' : t('superAdmin.account.savePassword')}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">
                  {t('superAdmin.account.mfaTitle')}
                </h3>
                <div className="space-y-3">
                  <div className="text-sm text-text-secondary">
                    {authState?.user?.mfaEnabledAt
                      ? t('superAdmin.account.mfaEnabled')
                      : t('superAdmin.account.mfaDisabled')}
                  </div>
                  {mfaError ? <div className="text-sm text-red-600">{mfaError}</div> : null}
                  <div className="flex justify-end gap-2">
                    {authState?.user?.mfaEnabledAt ? (
                      <Button
                        variant="secondary"
                        disabled={mfaStatus === 'saving'}
                        onClick={async () => {
                          setMfaError('');
                          setMfaStatus('saving');
                          try {
                            await authApi.mfaDisable();
                            updateUserInState({ mfaEnabledAt: null });
                            setMfaStatus('idle');
                          } catch (e) {
                            setMfaStatus('error');
                            setMfaError(t('superAdmin.account.mfaDisableFailed'));
                          }
                        }}
                      >
                        {t('superAdmin.account.mfaDisable')}
                      </Button>
                    ) : (
                      <Button
                        disabled={mfaStatus === 'saving'}
                        onClick={() => {
                          setMfaError('');
                          setMfaOpen(true);
                        }}
                      >
                        {t('superAdmin.account.mfaEnable')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('superAdmin.tenants')}</h2>
            <TenantList />
          </Card>
        </div>
      </main>

      <MfaSetupModal
        isOpen={mfaOpen}
        onClose={() => setMfaOpen(false)}
        onEnabled={(mfaEnabledAt) => {
          updateUserInState({ mfaEnabledAt });
          setMfaOpen(false);
        }}
      />
    </div>
  );
};

export default SuperAdminDashboard;
