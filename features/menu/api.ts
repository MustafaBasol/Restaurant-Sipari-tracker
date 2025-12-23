import { getDataByTenant, addData, updateData, deleteData } from '../../shared/lib/mockApi';
import { MenuCategory, MenuItem } from './types';

export const getMenuCategories = (tenantId: string) =>
  getDataByTenant<MenuCategory>('menuCategories', tenantId);
export const getMenuItems = (tenantId: string) => getDataByTenant<MenuItem>('menuItems', tenantId);

export const addCategory = (tenantId: string, name: string) => {
  const newCategory: MenuCategory = { id: `cat${Date.now()}`, tenantId, name };
  return addData('menuCategories', newCategory);
};

export const updateCategory = (category: MenuCategory) => updateData('menuCategories', category);

export const deleteCategory = (categoryId: string) => deleteData('menuCategories', categoryId);

export const addMenuItem = (tenantId: string, item: Omit<MenuItem, 'id' | 'tenantId'>) => {
  const newMenuItem: MenuItem = { id: `item${Date.now()}`, tenantId, ...item };
  return addData('menuItems', newMenuItem);
};

export const updateMenuItem = (item: MenuItem) => updateData('menuItems', item);
