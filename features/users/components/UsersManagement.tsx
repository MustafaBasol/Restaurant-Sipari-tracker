import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { User } from '../types';
import { UserRole } from '../../../shared/types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { useAuth } from '../../auth/hooks/useAuth';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Badge } from '../../../shared/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '../../../shared/components/ui/Table';
import ChangePasswordModal from './ChangePasswordModal';
import UserSessionsModal from './UserSessionsModal';

const UsersManagement: React.FC = () => {
  const { users, addUser, updateUser, changeUserPassword, disableUserMfa } = useUsers();
  const { t } = useLanguage();
  const { authState } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.WAITER,
  });
  const [editingPasswordForUser, setEditingPasswordForUser] = useState<User | null>(null);
  const [viewingSessionsForUser, setViewingSessionsForUser] = useState<User | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [successCopyValue, setSuccessCopyValue] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const canManageSessions =
    authState?.user.role === UserRole.ADMIN || authState?.user.role === UserRole.SUPER_ADMIN;
  const canManageMfa =
    authState?.user.role === UserRole.ADMIN || authState?.user.role === UserRole.SUPER_ADMIN;
  const visibleUsers = users.filter((u) => (showArchived ? !u.isActive : u.isActive));

  const handleAddUser = async () => {
    if (newUser.fullName && newUser.email) {
      const result = await addUser({
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        password: newUser.password && newUser.password.trim() ? newUser.password : undefined,
      } as any);

      const generatedPassword = (result as any)?.generatedPassword as string | null | undefined;
      if (generatedPassword) {
        setSuccessMessage(
          t('admin.users.userCreatedWithPassword').replace('{password}', generatedPassword),
        );
        setSuccessCopyValue(generatedPassword);
        setCopyStatus('idle');
        setTimeout(() => setSuccessMessage(''), 15000);
      } else {
        setSuccessMessage(t('admin.users.userCreatedSuccess'));
        setSuccessCopyValue(null);
        setCopyStatus('idle');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setNewUser({ fullName: '', email: '', password: '', role: UserRole.WAITER });
      setIsAdding(false);
    }
  };

  const handleCopySuccessPassword = async () => {
    if (!successCopyValue) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(successCopyValue);
      } else {
        const el = document.createElement('textarea');
        el.value = successCopyValue;
        el.setAttribute('readonly', 'true');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('failed');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleToggleActive = async (user: User) => {
    await updateUser({ ...user, isActive: !user.isActive });
  };

  const handlePasswordSave = async (userId: string, newPassword: string) => {
    await changeUserPassword(userId, newPassword);
    setEditingPasswordForUser(null);
    setSuccessMessage(t('admin.users.passwordUpdateSuccess'));
    setSuccessCopyValue(null);
    setCopyStatus('idle');
    setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3 seconds
  };

  const handleDisableMfa = async (user: User) => {
    await disableUserMfa(user.id);
    setSuccessMessage(t('admin.users.mfaDisabledSuccess'));
    setSuccessCopyValue(null);
    setCopyStatus('idle');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button
          onClick={() => setShowArchived((p) => !p)}
          variant="secondary"
          className="px-4 py-2 w-full sm:w-auto"
        >
          {showArchived ? t('admin.users.showActive') : t('admin.users.showArchive')}
        </Button>
        <Button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 w-full sm:w-auto">
          {isAdding ? t('general.cancel') : t('admin.users.add')}
        </Button>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm flex items-center justify-between gap-3">
          <div className="min-w-0">{successMessage}</div>
          {successCopyValue && (
            <Button
              type="button"
              variant="ghost"
              className="py-1 px-2 whitespace-nowrap"
              onClick={() => void handleCopySuccessPassword()}
            >
              {copyStatus === 'copied'
                ? t('general.copied')
                : copyStatus === 'failed'
                  ? t('general.copyFailed')
                  : t('general.copy')}
            </Button>
          )}
        </div>
      )}

      {isAdding && (
        <div className="bg-light-bg p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('admin.users.fullName')}
            </label>
            <Input
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              placeholder={t('admin.users.fullName')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('auth.email')}
            </label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder={t('auth.email')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('admin.users.passwordOptional')}
            </label>
            <Input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder={t('admin.users.passwordOptional')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.role')}
            </label>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
            >
              {Object.values(UserRole)
                .filter((role) => role !== UserRole.SUPER_ADMIN)
                .map((role) => (
                  <option key={role} value={role}>
                    {t(`roles.${role}`)}
                  </option>
                ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleAddUser} className="w-full py-2 bg-green-500 hover:bg-green-600">
              {t('general.save')}
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableHeaderCell>{t('general.name')}</TableHeaderCell>
          <TableHeaderCell>{t('general.role')}</TableHeaderCell>
          <TableHeaderCell>{t('general.status')}</TableHeaderCell>
          <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
        </TableHeader>
        <TableBody>
          {visibleUsers.map((user) => {
            const canToggleActive = user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN;

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.fullName}</div>
                  <div className="text-sm text-text-secondary">{user.email}</div>
                </TableCell>
                <TableCell>{t(`roles.${user.role}`)}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'green' : 'red'}>
                    {user.isActive ? t('general.active') : t('general.inactive')}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => setEditingPasswordForUser(user)}
                      className="text-accent hover:text-accent-hover text-sm font-medium"
                    >
                      {t('admin.users.changePassword')}
                    </button>
                    {canManageSessions && (
                      <button
                        onClick={() => setViewingSessionsForUser(user)}
                        className="text-accent hover:text-accent-hover text-sm font-medium"
                      >
                        {t('admin.users.sessions')}
                      </button>
                    )}
                    {canManageMfa && user.mfaEnabledAt && (
                      <button
                        onClick={() => {
                          void handleDisableMfa(user);
                        }}
                        className="text-accent hover:text-accent-hover text-sm font-medium"
                      >
                        {t('admin.users.disableMfa')}
                      </button>
                    )}
                    {canToggleActive && (
                      <button
                        onClick={() => {
                          void handleToggleActive(user);
                        }}
                        className="text-accent hover:text-accent-hover text-sm font-medium"
                      >
                        {user.isActive ? t('admin.users.deactivate') : t('admin.users.activate')}
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editingPasswordForUser && (
        <ChangePasswordModal
          user={editingPasswordForUser}
          onClose={() => setEditingPasswordForUser(null)}
          onSave={handlePasswordSave}
        />
      )}

      {viewingSessionsForUser && (
        <UserSessionsModal
          user={viewingSessionsForUser}
          isOpen={Boolean(viewingSessionsForUser)}
          onClose={() => setViewingSessionsForUser(null)}
        />
      )}
    </div>
  );
};

export default UsersManagement;
