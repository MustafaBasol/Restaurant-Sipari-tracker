import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Tenant, User, SubscriptionStatus } from '../../../shared/types';
import { Modal } from '../../../shared/components/ui/Modal';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '../../../shared/components/ui/Table';
import { Badge } from '../../../shared/components/ui/Badge';
import { formatDateTime, getTrialDaysLeft } from '../../../shared/lib/utils';
import { Select } from '../../../shared/components/ui/Select';
import { ApiError } from '../../../shared/lib/runtimeApi';

interface TenantDetailModalProps {
  tenant: Tenant;
  users: User[];
  onClose: () => void;
  onSubscriptionChange: (tenantId: string, status: SubscriptionStatus) => void;
  onDeleteUser: (userId: string) => Promise<any>;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-border-color/50">
    <span className="font-medium text-text-secondary">{label}</span>
    <span className="font-semibold text-text-primary text-right">{value}</span>
  </div>
);

const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant,
  users,
  onClose,
  onSubscriptionChange,
  onDeleteUser,
}) => {
  const { t } = useLanguage();

  const trialDaysLeft = getTrialDaysLeft(tenant);

  const statusVariantMap: Record<SubscriptionStatus, 'green' | 'yellow' | 'red'> = {
    [SubscriptionStatus.ACTIVE]: 'green',
    [SubscriptionStatus.TRIAL]: 'yellow',
    [SubscriptionStatus.CANCELED]: 'red',
    [SubscriptionStatus.EXPIRED]: 'red',
  };

  const currentStatus = (
    <Badge variant={statusVariantMap[tenant.subscriptionStatus]}>
      {t(`statuses.${tenant.subscriptionStatus}`)}
    </Badge>
  );

  let trialInfo;
  if (tenant.subscriptionStatus === SubscriptionStatus.TRIAL) {
    trialInfo = trialDaysLeft > 0 ? `${trialDaysLeft} days left` : 'Expired';
  } else {
    trialInfo = 'N/A';
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t('superAdmin.tenantDetails.title')}>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Tenant Info Section */}
        <div>
          <h3 className="text-lg font-bold mb-4">{tenant.name}</h3>
          <div className="space-y-2 text-sm">
            <InfoRow
              label={t('superAdmin.registeredOn')}
              value={formatDateTime(tenant.createdAt, 'UTC', { dateStyle: 'long' })}
            />
            <InfoRow label={t('subscription.status')} value={currentStatus} />
            <InfoRow label={t('superAdmin.headers.trialInfo')} value={trialInfo} />
            <InfoRow label={t('superAdmin.headers.users')} value={users.length} />
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-2">
              {t('superAdmin.tenantDetails.subscriptionManagement')}
            </h4>
            <Select
              value={tenant.subscriptionStatus}
              onChange={(e) =>
                onSubscriptionChange(tenant.id, e.target.value as SubscriptionStatus)
              }
              className="p-2 text-sm w-full"
            >
              <option value={SubscriptionStatus.TRIAL}>{t('statuses.TRIAL')}</option>
              <option value={SubscriptionStatus.ACTIVE}>{t('statuses.ACTIVE')}</option>
              <option value={SubscriptionStatus.EXPIRED}>{t('statuses.EXPIRED')}</option>
              <option value={SubscriptionStatus.CANCELED}>{t('statuses.CANCELED_SUB')}</option>
            </Select>
          </div>
        </div>

        {/* Users List Section */}
        <div>
          <h3 className="text-lg font-bold mb-4">{t('superAdmin.tenantUsers')}</h3>
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('general.name')}</TableHeaderCell>
                <TableHeaderCell>{t('general.role')}</TableHeaderCell>
                <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-sm text-text-secondary">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'green' : 'red'}>
                        {t(`roles.${user.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700"
                        onClick={async () => {
                          const ok = window.confirm(
                            t('superAdmin.confirmDeleteUser').replace('{email}', user.email),
                          );
                          if (!ok) return;
                          try {
                            await onDeleteUser(user.id);
                          } catch (e) {
                            if (e instanceof ApiError && e.code === 'USER_HAS_ORDERS') {
                              window.alert(t('superAdmin.deleteUserHasOrders'));
                              return;
                            }
                            if (e instanceof ApiError && e.code === 'CANNOT_DELETE_SELF') {
                              window.alert(t('superAdmin.deleteUserCannotDeleteSelf'));
                              return;
                            }
                            window.alert(t('superAdmin.deleteUserFailed'));
                          }
                        }}
                      >
                        {t('general.delete')}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TenantDetailModal;
