import React, { useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Customer } from '../types';

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: { fullName: string; phone?: string; email?: string }) => Promise<Customer>;
  onCreated?: (customer: Customer) => void;
}

const CustomerCreateModal: React.FC<CustomerCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onCreated,
}) => {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setError('');
    setIsSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError('');
    const name = fullName.trim();
    const p = phone.trim();
    const e = email.trim();
    if (!name) {
      setError(t('customers.validation.fullNameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const created = await onCreate({
        fullName: name,
        phone: p || undefined,
        email: e || undefined,
      });
      onCreated?.(created);
      handleClose();
    } catch (e) {
      console.error('Failed to create customer', e);
      setError(t('customers.validation.createFailed'));
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('customers.createTitle')}>
      <div className="p-4 max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('customers.fullName')}
            </label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('customers.phone')}
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('customers.email')}
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '...' : t('customers.createAction')}
            </Button>
            <Button onClick={handleClose} variant="secondary">
              {t('general.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerCreateModal;
