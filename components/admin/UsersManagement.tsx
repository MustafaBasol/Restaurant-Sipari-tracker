
import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { User, UserRole } from '../../types';

const UsersManagement: React.FC = () => {
    const { users, addUser, updateUser, t } = useAppContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: UserRole.WAITER });
    
    const handleAddUser = async () => {
        if (newUser.fullName && newUser.email && newUser.password) {
            await addUser(newUser);
            setNewUser({ fullName: '', email: '', password: '', role: UserRole.WAITER });
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        await updateUser({ ...user, isActive: !user.isActive });
    };

    return (
        <div>
            <div className="mb-6 flex justify-end">
                <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover">
                    {isAdding ? t('cancel') : t('addUser')}
                </button>
            </div>

            {isAdding && (
                <div className="bg-light-bg p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <input value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} placeholder={t('fullName')} className="px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder={t('email')} className="px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder={t('password')} className="px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
                    <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})} className="px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
                        {Object.values(UserRole).map(role => <option key={role} value={role}>{t(role)}</option>)}
                    </select>
                    <button onClick={handleAddUser} className="lg:col-span-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600">{t('save')}</button>
                </div>
            )}

            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('name')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('role')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border-color">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-text-primary">{user.fullName}</div>
                                    <div className="text-sm text-text-secondary">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{t(user.role)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.isActive ? t('active') : t('inactive')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleToggleActive(user)} className="text-accent hover:text-accent-hover">
                                        {user.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersManagement;
