import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Tenant } from '../types';
import { User } from '../../users/types';
import { Modal } from '../../../shared/components/ui/Modal';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../../shared/components/ui/Table';
import { Badge } from '../../../shared/components/ui/Badge';

interface UserListModalProps {
    tenant: Tenant;
    users: User[];
    onClose: () => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ tenant, users, onClose }) => {
    const { t } = useLanguage();
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`${t('superAdmin.tenantUsers')} - ${tenant.name}`}>
            <div className="p-6">
                <Table>
                    <TableHeader>
                        <TableHeaderCell>{t('general.name')}</TableHeaderCell>
                        <TableHeaderCell>{t('general.role')}</TableHeaderCell>
                        <TableHeaderCell>{t('general.status')}</TableHeaderCell>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Modal>
    );
};

export default UserListModal;
