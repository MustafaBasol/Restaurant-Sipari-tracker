export interface Customer {
  id: string;
  tenantId: string;
  fullName: string;
  phone?: string;
  createdAt: Date;
}
