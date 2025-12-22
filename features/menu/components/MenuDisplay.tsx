import React, { useState } from 'react';
import { useMenu } from '../hooks/useMenu';
import { MenuItem } from '../types';
import { PlusIcon } from '../../../shared/components/icons/Icons';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../auth/hooks/useAuth';
import { formatCurrency } from '../../../shared/lib/utils';
import { useLanguage } from '../../../shared/hooks/useLanguage';

interface MenuDisplayProps {
  onAddItem: (item: MenuItem) => void;
}

const MenuDisplay: React.FC<MenuDisplayProps> = ({ onAddItem }) => {
  const { menuCategories, menuItems } = useMenu();
  const { authState } = useAuth();
  const { t } = useLanguage();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const currency = authState?.tenant?.currency || 'USD';

  // Set initial active category
  React.useEffect(() => {
    if (!activeCategoryId && menuCategories.length > 0) {
      setActiveCategoryId(menuCategories[0].id);
    }
  }, [menuCategories, activeCategoryId]);

  const filteredItems = menuItems.filter((item) => item.categoryId === activeCategoryId);

  return (
    <div className="p-4">
      <div className="overflow-x-auto pb-2 mb-4">
        <div className="flex space-x-2">
          {menuCategories.map((category) => (
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
        {filteredItems.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <div className="flex-grow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-text-primary">{item.name}</h3>
                {!item.isAvailable && <Badge variant="red">{t('general.outOfStock')}</Badge>}
              </div>
              <p className="text-xs text-text-secondary mt-1">{item.description}</p>
              {Array.isArray(item.allergens) && item.allergens.length > 0 && (
                <p className="text-xs text-text-secondary mt-1">
                  {t('general.allergens')}: {item.allergens.join(', ')}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="font-bold text-text-primary">
                {formatCurrency(item.price, currency)}
              </span>
              <button
                onClick={() => onAddItem(item)}
                disabled={!item.isAvailable}
                className="bg-accent/10 text-accent p-2 rounded-full hover:bg-accent/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                <PlusIcon />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuDisplay;
