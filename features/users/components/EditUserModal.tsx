import React, { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Select } from '../../../shared/components/ui/Select';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { ApiError } from '../../../shared/lib/runtimeApi';
import { UserRole } from '../../../shared/types';
import { User } from '../types';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSave: (updated: User) => Promise<void>;
  canEditActive: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave, canEditActive }) => {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role as UserRole);
  const [isActive, setIsActive] = useState<boolean>(user.isActive);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(() => `${t('admin.users.edit')}: ${user.fullName}`, [t, user.fullName]);

  const handleSave = async () => {
    setError('');
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setError(t('admin.users.invalidUserInput'));
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...user,
        fullName: trimmedName,
        email: trimmedEmail,
        role,
        isActive: canEditActive ? isActive : user.isActive,
      } as any);
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'EMAIL_ALREADY_USED') {
          setError(t('admin.users.emailAlreadyUsed'));
          return;
        }
        if (e.code === 'INVALID_INPUT') {
          setError(t('admin.users.invalidUserInput'));
          return;
        }
        if (e.code === 'FORBIDDEN' || e.code === 'UNAUTHORIZED' || e.code === 'UNAUTHENTICATED') {
          setError(t('admin.users.notAllowed'));
          return;
        }
      }
      setError(t('general.somethingWentWrong'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('admin.users.fullName')}
          </label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('auth.email')}</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">{t('general.role')}</label>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {Object.values(UserRole)
              .filter((r) => r !== UserRole.SUPER_ADMIN)
              .map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
          </Select>
        </div>

        {canEditActive && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('general.status')}
            </label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
            >
              <option value="active">{t('general.active')}</option>
              <option value="inactive">{t('general.inactive')}</option>
            </Select>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>
            {t('general.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '...' : t('general.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditUserModal;
