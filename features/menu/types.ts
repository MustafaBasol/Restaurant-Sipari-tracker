import { KitchenStation } from '../../shared/types';

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuItemModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItemModifier {
  id: string;
  name: string;
  options: MenuItemModifierOption[];
}

export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  /** If set, this menu item represents a bundle / set menu composed of other menu items. */
  bundleItemIds?: string[];
  station?: KitchenStation;
  variants?: MenuItemVariant[];
  modifiers?: MenuItemModifier[];
  allergens?: string[];
}
