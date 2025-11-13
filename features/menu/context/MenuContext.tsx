import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import * as api from '../api';
import { MenuCategory, MenuItem } from '../types';

interface MenuContextData {
    menuCategories: MenuCategory[];
    menuItems: MenuItem[];
    isLoading: boolean;
    addCategory: (name: string) => Promise<void>;
    updateCategory: (category: MenuCategory) => Promise<void>;
    addMenuItem: (item: Omit<MenuItem, 'id' | 'tenantId'>) => Promise<void>;
    updateMenuItem: (item: MenuItem) => Promise<void>;
    refetch: () => Promise<void>;
}

export const MenuContext = createContext<MenuContextData | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
        } else {
            setMenuCategories([]);
            setMenuItems([]);
            setIsLoading(false);
        }
    }, [authState]);

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

    return (
        <MenuContext.Provider value={{ menuCategories, menuItems, isLoading, addCategory, updateCategory, addMenuItem, updateMenuItem, refetch: fetchMenuData }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenuContext = () => {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenuContext must be used within a MenuProvider');
    }
    return context;
};
