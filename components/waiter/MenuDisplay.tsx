import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { MenuItem } from '../../types';
import { PlusIcon } from '../icons/Icons';

interface MenuDisplayProps {
    onAddItem: (item: MenuItem) => void;
}

const MenuDisplay: React.FC<MenuDisplayProps> = ({ onAddItem }) => {
    const { menuCategories, menuItems, t } = useAppContext();
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(menuCategories[0]?.id || null);

    const filteredItems = menuItems.filter(item => item.categoryId === activeCategoryId && item.isAvailable);

    return (
        <div className="p-4">
            <div className="overflow-x-auto pb-2 mb-4">
                <div className="flex space-x-2">
                    {menuCategories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategoryId(category.id)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${
                                activeCategoryId === category.id 
                                ? 'bg-accent text-white' 
                                : 'bg-card-bg text-text-secondary hover:bg-gray-200'
                            }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-card-bg p-4 rounded-xl shadow-subtle flex flex-col">
                        <div className="flex-grow">
                            <h3 className="font-semibold text-text-primary">{item.name}</h3>
                            <p className="text-xs text-text-secondary mt-1">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <span className="font-bold text-text-primary">${item.price.toFixed(2)}</span>
                            <button onClick={() => onAddItem(item)} className="bg-accent/10 text-accent p-2 rounded-full hover:bg-accent/20">
                                <PlusIcon />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MenuDisplay;
