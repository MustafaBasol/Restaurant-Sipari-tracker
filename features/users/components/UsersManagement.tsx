import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { User } from '../types';
import { UserRole } from '../../../shared/types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Badge } from '../../../shared/components/ui/Badge';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../../shared/components/ui/Table';

const UsersManagement: React.FC = () => {
    const { users, addUser, updateUser } = useUsers();
    const { t } = useLanguage();
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
                <Button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2">
                    {isAdding ? t('general.cancel') : t('admin.users.add')}
                </Button>
            </div>

            {isAdding && (
                <div className="bg-light-bg p-4 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} placeholder={t('admin.users.fullName')} />
                    <Input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder={t('auth.email')} />
                    <Input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder={t('auth.password')} />
                    <Select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}>
                        {Object.values(UserRole)
                            .filter(role => role !== UserRole.SUPER_ADMIN)
                            .map(role => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
                    </Select>
                    <Button onClick={handleAddUser} className="lg:col-span-4 py-2 bg-green-500 hover:bg-green-600">{t('general.save')}</Button>
                </div>
            )}

            <Table>
                <TableHeader>
                    <TableHeaderCell>{t('general.name')}</TableHeaderCell>
                    <TableHeaderCell>{t('general.role')}</TableHeaderCell>
                    <TableHeaderCell>{t('general.status')}</TableHeaderCell>
                    <TableHeaderCell align="right">{t('general.actions')}</TableHeaderCell>
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
                            <TableCell align="right">
                                <button onClick={() => handleToggleActive(user)} className="text-accent hover:text-accent-hover text-sm font-medium">
                                    {user.isActive ? t('admin.users.deactivate') : t('admin.users.activate')}
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default UsersManagement;
