import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { updateTenantSettings } from '../api';
import { Button } from '../../../shared/components/ui/Button';
import { Select } from '../../../shared/components/ui/Select';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Tenant } from '../../../shared/types';

const timezones = ['America/New_York', 'Europe/Paris', 'Europe/Istanbul', 'Asia/Tokyo'];
const currencies = ['USD', 'EUR', 'TRY'];
const languages = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'fr', name: 'Français' },
];

const SettingsManagement: React.FC = () => {
  const { authState, updateTenantInState } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Tenant | null>(authState?.tenant ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (authState?.tenant) {
      setSettings(authState.tenant);
    }
  }, [authState?.tenant]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsed = value === '' ? undefined : Number(value);
    setSettings((prev) =>
      prev ? { ...prev, [name]: Number.isFinite(parsed) ? parsed : undefined } : null,
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSuccessMessage('');
    try {
      const updatedTenant = await updateTenantSettings(settings);
      updateTenantInState(updatedTenant);
      setSuccessMessage(t('admin.settings.saveSuccess'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value as 'browser' | 'server';
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            printConfig: {
              ...(prev.printConfig ?? { mode: 'browser' }),
              mode,
            },
          }
        : null,
    );
  };

  const handlePrintServerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const serverUrl = e.target.value;
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            printConfig: {
              ...(prev.printConfig ?? { mode: 'browser' }),
              serverUrl,
            },
          }
        : null,
    );
  };

  if (!settings) {
    return <div>Loading settings...</div>;
  }

  const printMode = settings.printConfig?.mode ?? 'browser';
  const printServerUrl = settings.printConfig?.serverUrl ?? '';
  const taxRatePercent = settings.taxRatePercent ?? 0;
  const serviceChargePercent = settings.serviceChargePercent ?? 0;
  const roundingIncrement = settings.roundingIncrement ?? 0;

  return (
    <Card>
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin.settings.title')}</h2>
      <div className="space-y-6 max-w-md">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('admin.settings.currency')}
          </label>
          <Select name="currency" value={settings.currency} onChange={handleChange}>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('admin.settings.timezone')}
          </label>
          <Select name="timezone" value={settings.timezone} onChange={handleChange}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('admin.settings.defaultLanguage')}
          </label>
          <Select name="defaultLanguage" value={settings.defaultLanguage} onChange={handleChange}>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            {t('admin.settings.printing')}
          </h3>

          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('admin.settings.printModeLabel')}
          </label>
          <Select name="printMode" value={printMode} onChange={handlePrintModeChange}>
            <option value="browser">{t('admin.settings.printModeOptions.browser')}</option>
            <option value="server">{t('admin.settings.printModeOptions.server')}</option>
          </Select>

          {printMode === 'server' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('admin.settings.printServerUrl')}
              </label>
              <Input
                value={printServerUrl}
                onChange={handlePrintServerUrlChange}
                placeholder="http://localhost:4243"
                inputMode="url"
              />
              <p className="text-xs text-text-secondary mt-2">
                {t('admin.settings.printServerUrlHelp')}
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            {t('admin.settings.pricing')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('admin.settings.taxRatePercent')}
              </label>
              <Input
                name="taxRatePercent"
                value={String(taxRatePercent)}
                onChange={handleNumberChange}
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('admin.settings.serviceChargePercent')}
              </label>
              <Input
                name="serviceChargePercent"
                value={String(serviceChargePercent)}
                onChange={handleNumberChange}
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('admin.settings.roundingIncrement')}
              </label>
              <Input
                name="roundingIncrement"
                value={String(roundingIncrement)}
                onChange={handleNumberChange}
                inputMode="decimal"
              />
              <p className="text-xs text-text-secondary mt-2">
                {t('admin.settings.roundingIncrementHelp')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '...' : t('general.save')}
          </Button>
          {successMessage && <p className="text-green-600 text-sm font-medium">{successMessage}</p>}
        </div>
      </div>
    </Card>
  );
};

export default SettingsManagement;
