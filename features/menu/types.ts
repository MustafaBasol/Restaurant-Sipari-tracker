import { KitchenStation } from '../../shared/types';

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
  station?: KitchenStation;
}
