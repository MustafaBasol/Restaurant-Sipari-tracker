import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Tenant, User } from '../../types';
import { XIcon } from '../icons/Icons';

interface UserListModalProps {
    tenant: Tenant;
    users: User[];
    onClose: () => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ tenant, users, onClose }) => {
    const { t } = useAppContext();
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20">
            <div className="bg-light-bg w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-medium flex flex-col overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-border-color bg-card-bg">
                    <h2 className="text-lg font-bold">{t('tenantUsers')} - {tenant.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon /></button>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('name')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('role')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-border-color">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm font-medium text-text-primary">{user.fullName}</div>
                                        <div className="text-sm text-text-secondary">{user.email}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{t(user.role)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.isActive ? t('active') : t('inactive')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
