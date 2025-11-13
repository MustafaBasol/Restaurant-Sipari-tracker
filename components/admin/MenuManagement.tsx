import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { MenuItem } from '../../types';

const MenuManagement: React.FC = () => {
    const { menuCategories, menuItems, addCategory, addMenuItem, updateMenuItem, t } = useAppContext();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newMenuItem, setNewMenuItem] = useState<Partial<MenuItem>>({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        isAvailable: true,
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
            setNewMenuItem({
                name: '',
                description: '',
                price: 0,
                categoryId: '',
                isAvailable: true,
            });
        }
    };
    
    const handleAvailabilityToggle = async (item: MenuItem) => {
        await updateMenuItem({ ...item, isAvailable: !item.isAvailable });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Categories Management */}
            <div>
                <h3 className="text-lg font-semibold mb-4">{t('category', 'Categories')}</h3>
                <div className="space-y-4 bg-light-bg p-4 rounded-xl">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('categoryName')}
                        className="w-full px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button onClick={handleAddCategory} className="w-full px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover">{t('addCategory')}</button>
                </div>
                <ul className="mt-4 space-y-2">
                    {menuCategories.map(cat => (
                        <li key={cat.id} className="bg-gray-100 p-3 rounded-lg text-sm">{cat.name}</li>
                    ))}
                </ul>
            </div>
            
            {/* Menu Items Management */}
            <div>
                <h3 className="text-lg font-semibold mb-4">{t('menuItemName', 'Menu Items')}</h3>
                <div className="space-y-4 bg-light-bg p-4 rounded-xl">
                    <input
                        type="text"
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem(p => ({ ...p, name: e.target.value }))}
                        placeholder={t('menuItemName')}
                        className="w-full px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                     <input
                        type="text"
                        value={newMenuItem.description}
                        onChange={(e) => setNewMenuItem(p => ({ ...p, description: e.target.value }))}
                        placeholder={t('description')}
                        className="w-full px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                        type="number"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                        placeholder={t('price')}
                        className="w-full px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <select
                        value={newMenuItem.categoryId}
                        onChange={(e) => setNewMenuItem(p => ({ ...p, categoryId: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="">{t('category')}</option>
                        {menuCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <button onClick={handleAddMenuItem} className="w-full px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover">{t('addMenuItem')}</button>
                </div>
                <ul className="mt-4 space-y-2">
                    {menuItems.map(item => (
                        <li key={item.id} className="bg-gray-100 p-3 rounded-lg flex justify-between items-center text-sm">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-text-secondary text-xs">{item.description} - ${item.price.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleAvailabilityToggle(item)} className={`px-2 py-1 text-xs rounded-full ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {item.isAvailable ? t('available') : t('unavailable')}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default MenuManagement;
