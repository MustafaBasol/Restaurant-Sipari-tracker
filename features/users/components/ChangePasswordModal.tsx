import React, { useState } from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { User } from '../types';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
  onSave: (userId: string, newPassword: string) => Promise<void>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onClose, onSave }) => {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError(t('admin.users.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('admin.users.passwordMismatch'));
      return;
    }
    setIsSaving(true);
    try {
      await onSave(user.id, newPassword);
      onClose(); // Close on success
    } catch (e) {
      setError('An unexpected error occurred.');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const modalTitle = t('admin.users.changePasswordTitle').replace('{userName}', user.fullName);

  return (
    <Modal isOpen={true} onClose={onClose} title={modalTitle}>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('admin.users.newPassword')}
          </label>
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              aria-label={showNewPassword ? t('general.hidePassword') : t('general.showPassword')}
              title={showNewPassword ? t('general.hidePassword') : t('general.showPassword')}
            >
              {showNewPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18M10.5 10.677A2.25 2.25 0 0013.323 13.5M9.88 9.88a3.75 3.75 0 015.303 5.303M7.362 7.561C5.68 8.739 4.279 10.438 3.75 12c1.545 4.567 5.463 7.5 8.25 7.5 1.459 0 2.91-.372 4.216-1.054M14.12 14.12l5.13 5.13c1.37-1.07 2.48-2.54 3-4.25-1.545-4.567-5.463-7.5-8.25-7.5-.942 0-1.89.168-2.803.482"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.816.04.14.04.29 0 .428C20.577 17.554 16.64 20.5 12 20.5c-4.638 0-8.573-2.946-9.963-7.756a.366.366 0 010-.422z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {t('admin.users.confirmPassword')}
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              aria-label={showConfirmPassword ? t('general.hidePassword') : t('general.showPassword')}
              title={showConfirmPassword ? t('general.hidePassword') : t('general.showPassword')}
            >
              {showConfirmPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18M10.5 10.677A2.25 2.25 0 0013.323 13.5M9.88 9.88a3.75 3.75 0 015.303 5.303M7.362 7.561C5.68 8.739 4.279 10.438 3.75 12c1.545 4.567 5.463 7.5 8.25 7.5 1.459 0 2.91-.372 4.216-1.054M14.12 14.12l5.13 5.13c1.37-1.07 2.48-2.54 3-4.25-1.545-4.567-5.463-7.5-8.25-7.5-.942 0-1.89.168-2.803.482"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.816.04.14.04.29 0 .428C20.577 17.554 16.64 20.5 12 20.5c-4.638 0-8.573-2.946-9.963-7.756a.366.366 0 010-.422z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
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

export default ChangePasswordModal;
