import { UserRole } from '../../shared/types';

export interface User {
  id: string;
  tenantId?: string;
  fullName: string;
  email: string;
  passwordHash: string;
  mfaEnabledAt?: string | null;
  role: UserRole;
  isActive: boolean;
}
