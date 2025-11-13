import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { MenuCategory, MenuItem } from '../types';

export const useMenu = () => {
    const { authState } = useAuth();
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMenuData = useCallback(async () => {
        if (authState?.tenant?.id) {
            setIsLoading(true);
            try {
                const [categoriesData, itemsData] = await Promise.all([
                    api.getMenuCategories(authState.tenant.id),
                    api.getMenuItems(authState.tenant.id),
                ]);
                setMenuCategories(categoriesData);
                setMenuItems(itemsData);
            } catch (error) {
                console.error("Failed to fetch menu data", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [authState?.tenant?.id]);

    useEffect(() => {
        fetchMenuData();
    }, [fetchMenuData]);

    const handleMutation = async (mutationFn: () => Promise<any>) => {
        await mutationFn();
        await fetchMenuData();
    };

    const addCategory = (name: string) => handleMutation(() => api.addCategory(authState!.tenant!.id, name));
    const updateCategory = (category: MenuCategory) => handleMutation(() => api.updateCategory(category));
    const addMenuItem = (item: Omit<MenuItem, 'id' | 'tenantId'>) => handleMutation(() => api.addMenuItem(authState!.tenant!.id, item));
    const updateMenuItem = (item: MenuItem) => handleMutation(() => api.updateMenuItem(item));

    return { menuCategories, menuItems, isLoading, addCategory, updateCategory, addMenuItem, updateMenuItem, refetch: fetchMenuData };
};
