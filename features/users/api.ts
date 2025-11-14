import { getDataByTenant, addData, updateData, internalChangeUserPassword } from '../../shared/lib/mockApi';
import { User } from './types';
import { User as SharedUser } from '../../shared/types';

export const getUsers = (tenantId: string) => getDataByTenant<User>('users', tenantId);

export const addUser = (tenantId: string, user: Omit<SharedUser, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string }) => {
    const newUser: User = {
        id: `user${Date.now()}`,
        tenantId,
        fullName: user.fullName,
        email: user.email,
        passwordHash: user.password || '123456', // Mock hash
        role: user.role,
        isActive: true,
    };
    return addData('users', newUser);
};

export const updateUser = (user: User) => updateData('users', user);

export const changeUserPassword = (userId: string, newPassword: string) => {
    return internalChangeUserPassword(userId, newPassword);
};