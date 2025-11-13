import React, { useState } from 'react';
import { useMenu } from '../hooks/useMenu';
import { MenuItem } from '../types';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Select } from '../../../shared/components/ui/Select';
import { Badge } from '../../../shared/components/ui/Badge';

const MenuManagement: React.FC = () => {
    const { menuCategories, menuItems, addCategory, addMenuItem, updateMenuItem } = useMenu();
    const { t } = useLanguage();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newMenuItem, setNewMenuItem] = useState<Partial<MenuItem>>({
        name: '', description: '', price: 0, categoryId: '', isAvailable: true,
    });
    
    const handleAddCategory = async () => {
        if (newCategoryName.trim()) {
            await addCategory(newCategoryName);
            setNewCategoryName('');
        }
    };

    const handleAddMenuItem = async () => {
        if (newMenuItem.name && newMenuItem.name.trim() && newMenuItem.categoryId && newMenuItem.price) {
            await addMenuItem(newMenuItem as Omit<MenuItem, 'id' | 'tenantId'>);
            setNewMenuItem({ name: '', description: '', price: 0, categoryId: '', isAvailable: true });
        }
    };
    
    const handleAvailabilityToggle = async (item: MenuItem) => {
        await updateMenuItem({ ...item, isAvailable: !item.isAvailable });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 className="text-lg font-semibold mb-4">{t('general.category', 'Categories')}</h3>
                <div className="space-y-4 bg-light-bg p-4 rounded-xl">
                    <Input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('admin.menu.categoryName')}
                    />
                    <Button onClick={handleAddCategory} className="w-full py-2">{t('admin.menu.addCategory')}</Button>
                </div>
                <ul className="mt-4 space-y-2">
                    {menuCategories.map(cat => (
                        <li key={cat.id} className="bg-gray-100 p-3 rounded-lg text-sm">{cat.name}</li>
                    ))}
                </ul>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-4">{t('admin.menu.itemName', 'Menu Items')}</h3>
                <div className="space-y-4 bg-light-bg p-4 rounded-xl">
                    <Input value={newMenuItem.name || ''} onChange={(e) => setNewMenuItem(p => ({ ...p, name: e.target.value }))} placeholder={t('admin.menu.itemName')} />
                    <Input value={newMenuItem.description || ''} onChange={(e) => setNewMenuItem(p => ({ ...p, description: e.target.value }))} placeholder={t('general.description')} />
                    <Input type="number" value={newMenuItem.price || ''} onChange={(e) => setNewMenuItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} placeholder={t('general.price')} />
                    <Select value={newMenuItem.categoryId || ''} onChange={(e) => setNewMenuItem(p => ({ ...p, categoryId: e.target.value }))}>
                        <option value="">{t('general.category')}</option>
                        {menuCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </Select>
                    <Button onClick={handleAddMenuItem} className="w-full py-2">{t('admin.menu.addItem')}</Button>
                </div>
                <ul className="mt-4 space-y-2">
                    {menuItems.map(item => (
                        <li key={item.id} className="bg-gray-100 p-3 rounded-lg flex justify-between items-center text-sm">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-text-secondary text-xs">{item.description} - ${item.price.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleAvailabilityToggle(item)}>
                                <Badge variant={item.isAvailable ? 'green' : 'red'}>
                                    {item.isAvailable ? t('general.available') : t('general.unavailable')}
                                </Badge>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default MenuManagement;
