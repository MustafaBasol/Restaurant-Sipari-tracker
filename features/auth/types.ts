import { User, Tenant } from '../../shared/types';

export interface AuthState {
  user: User;
  tenant: Tenant | null; // Null for Super Admin
  sessionId?: string;
  deviceId?: string;
}
