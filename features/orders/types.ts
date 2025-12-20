import { DiscountType, OrderStatus, PaymentMethod, PaymentStatus } from '../../shared/types';

export interface PaymentLine {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  createdAt: Date;
  createdByUserId?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  variantId?: string;
  modifierOptionIds?: string[];
  quantity: number;
  note: string;
  status: OrderStatus;
  isComplimentary?: boolean;
}

export interface OrderDiscount {
  type: DiscountType;
  value: number;
  updatedAt: Date;
  updatedByUserId?: string;
}

export interface Order {
  id: string;
  tenantId: string;
  tableId: string;
  status: OrderStatus;
  items: OrderItem[];
  discount?: OrderDiscount;
  payments?: PaymentLine[];
  paymentStatus?: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  note?: string;
  waiterId?: string;
  waiterName?: string;
  orderClosedAt?: Date;
}
