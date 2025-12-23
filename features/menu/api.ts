import { getDataByTenant, addData, updateData, deleteData } from '../../shared/lib/mockApi';
import { MenuCategory, MenuItem } from './types';
import { apiFetch, isRealApiEnabled } from '../../shared/lib/runtimeApi';

export const getMenuCategories = (tenantId: string) => {
  if (!isRealApiEnabled()) return getDataByTenant<MenuCategory>('menuCategories', tenantId);
  return apiFetch<MenuCategory[]>('/menu/categories', { method: 'GET' });
};

export const getMenuItems = (tenantId: string) => {
  if (!isRealApiEnabled()) return getDataByTenant<MenuItem>('menuItems', tenantId);
  return apiFetch<MenuItem[]>('/menu/items', { method: 'GET' });
};

export const addCategory = (tenantId: string, name: string) => {
  if (isRealApiEnabled()) {
    return apiFetch<MenuCategory>('/menu/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
  const newCategory: MenuCategory = { id: `cat${Date.now()}`, tenantId, name };
  return addData('menuCategories', newCategory);
};

export const updateCategory = (category: MenuCategory) => {
  if (!isRealApiEnabled()) return updateData('menuCategories', category);
  return apiFetch<MenuCategory>(`/menu/categories/${encodeURIComponent(category.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: category.name }),
  });
};

export const deleteCategory = (categoryId: string) => {
  if (!isRealApiEnabled()) return deleteData('menuCategories', categoryId);
  return apiFetch<void>(`/menu/categories/${encodeURIComponent(categoryId)}`, {
    method: 'DELETE',
  });
};

export const addMenuItem = (tenantId: string, item: Omit<MenuItem, 'id' | 'tenantId'>) => {
  if (isRealApiEnabled()) {
    return apiFetch<MenuItem>('/menu/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }
  const newMenuItem: MenuItem = { id: `item${Date.now()}`, tenantId, ...item };
  return addData('menuItems', newMenuItem);
};

export const updateMenuItem = (item: MenuItem) => {
  if (!isRealApiEnabled()) return updateData('menuItems', item);
  return apiFetch<MenuItem>(`/menu/items/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
};
