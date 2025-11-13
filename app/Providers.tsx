import React, { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { LanguageProvider } from '../shared/contexts/LanguageContext';
import { OrderProvider } from '../features/orders/context/OrderContext';
import { NotificationProvider } from '../features/notifications/context/NotificationContext';

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <LanguageProvider>
            <AuthProvider>
                <OrderProvider>
                    <NotificationProvider>
                        {children}
                    </NotificationProvider>
                </OrderProvider>
            </AuthProvider>
        </LanguageProvider>
    );
};

export default Providers;
