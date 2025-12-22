import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { updateTenantSettings } from '../api';
import { getTables } from '../../tables/api';
import { getMenuItems } from '../../menu/api';
import { getOrders, createOrder, addOrderPayment, confirmOrderPayment } from '../../orders/api';
import { Button } from '../../../shared/components/ui/Button';
import { Select } from '../../../shared/components/ui/Select';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { OrderStatus, PaymentMethod, PermissionKey, Tenant, UserRole } from '../../../shared/types';
import { getOrderPaymentTotals } from '../../../shared/lib/mockApi';

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
  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  const [integrationMessage, setIntegrationMessage] = useState<string>('');
  const [posTargetTableId, setPosTargetTableId] = useState<string>('');

  useEffect(() => {
    if (authState?.tenant) {
      setSettings(authState.tenant);
    }
  }, [authState?.tenant]);

  useEffect(() => {
    const tenantId = authState?.tenant?.id;
    if (!tenantId) return;
    getTables(tenantId)
      .then((rows) => setTables(rows.map((tt) => ({ id: tt.id, name: tt.name }))))
      .catch((e) => console.error('Failed to load tables', e));
  }, [authState?.tenant?.id]);

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

  const setIntegrationField = (
    updater: (prev: NonNullable<Tenant['integrations']>) => NonNullable<Tenant['integrations']>,
  ) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = prev.integrations ?? {
        pos: { enabled: false, providerName: '' },
        onlineOrders: { enabled: false, providerName: '', targetTableId: '' },
      };
      return { ...prev, integrations: updater(current) };
    });
  };

  const handleSimulateOnlineOrder = async () => {
    setIntegrationMessage('');
    const tenantId = authState?.tenant?.id;
    const actorUserId = authState?.user?.id;
    if (!tenantId || !actorUserId || !settings) return;

    const onlineCfg = settings.integrations?.onlineOrders;
    if (!onlineCfg?.enabled) {
      setIntegrationMessage(t('admin.settings.integrations.onlineOrdersNotEnabled'));
      return;
    }
    const targetTableId = onlineCfg.targetTableId;
    if (!targetTableId) {
      setIntegrationMessage(t('admin.settings.integrations.onlineOrdersTargetTableRequired'));
      return;
    }

    try {
      const menuItems = await getMenuItems(tenantId);
      const orderable = menuItems.filter((mi) => mi.isAvailable !== false);
      if (orderable.length === 0) {
        setIntegrationMessage(t('admin.settings.integrations.noOrderableMenuItems'));
        return;
      }

      const pick = (idx: number) => orderable[idx % orderable.length];
      const extId = `onl_${Date.now()}`;
      await createOrder(
        tenantId,
        targetTableId,
        [
          { menuItemId: pick(0).id, quantity: 1, note: '' },
          { menuItemId: pick(1).id, quantity: 1, note: '' },
        ],
        actorUserId,
        `${t('admin.settings.integrations.onlineOrderNotePrefix')} ${onlineCfg.providerName || 'Online'} (${extId})`,
      );

      setIntegrationMessage(t('admin.settings.integrations.onlineOrderSimulated'));
      setTimeout(() => setIntegrationMessage(''), 4000);
    } catch (e) {
      console.error('Failed to simulate online order', e);
      setIntegrationMessage(t('admin.settings.integrations.simulationFailed'));
    }
  };

  const handleSimulatePosPayment = async () => {
    setIntegrationMessage('');
    const tenantId = authState?.tenant?.id;
    const actor = authState?.user ? { userId: authState.user.id, role: authState.user.role } : null;
    if (!tenantId || !actor || !settings) return;

    const posCfg = settings.integrations?.pos;
    if (!posCfg?.enabled) {
      setIntegrationMessage(t('admin.settings.integrations.posNotEnabled'));
      return;
    }
    if (!posTargetTableId) {
      setIntegrationMessage(t('admin.settings.integrations.posTargetTableRequired'));
      return;
    }

    try {
      const orders = await getOrders(tenantId);
      const active = orders.find(
        (o) => o.tableId === posTargetTableId && o.status !== OrderStatus.CLOSED,
      );
      if (!active) {
        setIntegrationMessage(t('admin.settings.integrations.noActiveOrderOnTable'));
        return;
      }

      const totals = await getOrderPaymentTotals(active.id);
      if (!totals) {
        setIntegrationMessage(t('admin.settings.integrations.simulationFailed'));
        return;
      }
      if (totals.remaining <= 0.00001) {
        setIntegrationMessage(t('admin.settings.integrations.orderAlreadyPaid'));
        return;
      }

      await addOrderPayment(active.id, PaymentMethod.CARD, totals.remaining, actor);
      await confirmOrderPayment(active.id, actor);

      setIntegrationMessage(t('admin.settings.integrations.posPaymentSimulated'));
      setTimeout(() => setIntegrationMessage(''), 4000);
    } catch (e) {
      console.error('Failed to simulate POS payment', e);
      setIntegrationMessage(t('admin.settings.integrations.simulationFailed'));
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

  const integrations = settings.integrations ?? {
    pos: { enabled: false, providerName: '' },
    onlineOrders: { enabled: false, providerName: '', targetTableId: '' },
  };

  const permissionRows: PermissionKey[] = [
    'ORDER_PAYMENTS',
    'ORDER_DISCOUNT',
    'ORDER_COMPLIMENTARY',
    'ORDER_ITEM_CANCEL',
    'ORDER_ITEM_SERVE',
    'ORDER_TABLES',
    'ORDER_CLOSE',
    'KITCHEN_ITEM_STATUS',
    'KITCHEN_MARK_ALL_READY',
  ];

  const getPermissionValue = (role: UserRole, key: PermissionKey): boolean => {
    return Boolean(settings.permissions?.[role]?.[key]);
  };

  const setPermissionValue = (role: UserRole, key: PermissionKey, value: boolean) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        permissions: {
          ...(prev.permissions ?? {}),
          [role]: {
            ...((prev.permissions ?? {})[role] ?? {}),
            [key]: value,
          },
        },
      };
    });
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin.settings.title')}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
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
        </div>

        <div className="space-y-6">
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

          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              {t('admin.settings.integrations.title')}
            </h3>

            {integrationMessage && (
              <p className="text-sm text-text-secondary mb-3">{integrationMessage}</p>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={Boolean(integrations.onlineOrders?.enabled)}
                    onChange={(e) =>
                      setIntegrationField((prev) => ({
                        ...prev,
                        onlineOrders: {
                          ...(prev.onlineOrders ?? {
                            enabled: false,
                            providerName: '',
                            targetTableId: '',
                          }),
                          enabled: e.target.checked,
                        },
                      }))
                    }
                  />
                  {t('admin.settings.integrations.onlineOrdersEnabled')}
                </label>

                <Input
                  value={integrations.onlineOrders?.providerName ?? ''}
                  onChange={(e) =>
                    setIntegrationField((prev) => ({
                      ...prev,
                      onlineOrders: {
                        ...(prev.onlineOrders ?? {
                          enabled: false,
                          providerName: '',
                          targetTableId: '',
                        }),
                        providerName: e.target.value,
                      },
                    }))
                  }
                  placeholder={t('admin.settings.integrations.providerNamePlaceholder')}
                />

                <Select
                  value={integrations.onlineOrders?.targetTableId ?? ''}
                  onChange={(e) =>
                    setIntegrationField((prev) => ({
                      ...prev,
                      onlineOrders: {
                        ...(prev.onlineOrders ?? {
                          enabled: false,
                          providerName: '',
                          targetTableId: '',
                        }),
                        targetTableId: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="">{t('admin.settings.integrations.selectTargetTable')}</option>
                  {tables.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </Select>

                <Button onClick={handleSimulateOnlineOrder} variant="secondary">
                  {t('admin.settings.integrations.simulateOnlineOrder')}
                </Button>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={Boolean(integrations.pos?.enabled)}
                    onChange={(e) =>
                      setIntegrationField((prev) => ({
                        ...prev,
                        pos: {
                          ...(prev.pos ?? { enabled: false, providerName: '' }),
                          enabled: e.target.checked,
                        },
                      }))
                    }
                  />
                  {t('admin.settings.integrations.posEnabled')}
                </label>

                <Input
                  value={integrations.pos?.providerName ?? ''}
                  onChange={(e) =>
                    setIntegrationField((prev) => ({
                      ...prev,
                      pos: {
                        ...(prev.pos ?? { enabled: false, providerName: '' }),
                        providerName: e.target.value,
                      },
                    }))
                  }
                  placeholder={t('admin.settings.integrations.providerNamePlaceholder')}
                />

                <Select
                  value={posTargetTableId}
                  onChange={(e) => setPosTargetTableId(e.target.value)}
                >
                  <option value="">{t('admin.settings.integrations.selectPosTable')}</option>
                  {tables.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </Select>

                <Button onClick={handleSimulatePosPayment} variant="secondary">
                  {t('admin.settings.integrations.simulatePosPayment')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            {t('admin.settings.permissions')}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary">
                  <th className="py-2 pr-4 font-medium">{t('admin.permissions.permission')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.permissions.roles.waiter')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.permissions.roles.kitchen')}</th>
                </tr>
              </thead>
              <tbody>
                {permissionRows.map((key) => (
                  <tr key={key} className="border-t border-border-color">
                    <td className="py-2 pr-4 text-text-primary">
                      {t(`admin.permissions.keys.${key}`)}
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={getPermissionValue(UserRole.WAITER, key)}
                        onChange={(e) =>
                          setPermissionValue(UserRole.WAITER, key, Boolean(e.target.checked))
                        }
                        aria-label={t('admin.permissions.roles.waiter')}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={getPermissionValue(UserRole.KITCHEN, key)}
                        onChange={(e) =>
                          setPermissionValue(UserRole.KITCHEN, key, Boolean(e.target.checked))
                        }
                        aria-label={t('admin.permissions.roles.kitchen')}
                        className="h-4 w-4"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-secondary mt-2">{t('admin.settings.permissionsHelp')}</p>
        </div>

        <div className="lg:col-span-2 flex items-center gap-4">
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
