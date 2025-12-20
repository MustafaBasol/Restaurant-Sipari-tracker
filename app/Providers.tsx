import React, { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { LanguageProvider } from '../shared/contexts/LanguageContext';
import { TableProvider } from '../features/tables/context/TableContext';
import { MenuProvider } from '../features/menu/context/MenuContext';
import { UserProvider } from '../features/users/context/UserContext';
import { OrderProvider } from '../features/orders/context/OrderContext';
import { NotificationProvider } from '../features/notifications/context/NotificationContext';

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UserProvider>
          <MenuProvider>
            <TableProvider>
              <OrderProvider>
                <NotificationProvider>{children}</NotificationProvider>
              </OrderProvider>
            </TableProvider>
          </MenuProvider>
        </UserProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default Providers;
