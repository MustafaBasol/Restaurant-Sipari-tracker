export interface Customer {
  id: string;
  tenantId: string;
  fullName: string;
  phone?: string;
  email?: string;
  createdAt: Date;
}
