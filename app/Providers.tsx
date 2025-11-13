import React, { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { LanguageProvider } from '../shared/contexts/LanguageContext';

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <LanguageProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </LanguageProvider>
    );
};

export default Providers;
