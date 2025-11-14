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
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('admin.users.newPassword')}</label>
                    <Input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('admin.users.confirmPassword')}</label>
                    <Input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>{t('general.cancel')}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? '...' : t('general.save')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ChangePasswordModal;
