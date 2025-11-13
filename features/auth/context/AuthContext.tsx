import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../api';
import { AuthState } from '../types';

interface AuthContextData {
    authState: AuthState | null;
    isLoading: boolean;
    login: (email: string, passwordOrSlug: string) => Promise<boolean>;
    logout: () => void;
    register: (payload: api.RegisterPayload) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const storedAuthState = localStorage.getItem('authState');
        if (storedAuthState) {
            try {
                const parsedState = JSON.parse(storedAuthState);
                 // Date hydration could be added here if needed
                setAuthState(parsedState);
            } catch (e) {
                console.error("Failed to parse auth state from localStorage", e);
                localStorage.removeItem('authState');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, passwordOrSlug: string) => {
        setIsLoading(true);
        try {
            const response = await api.login(email, passwordOrSlug);
            if (response) {
                setAuthState(response);
                localStorage.setItem('authState', JSON.stringify(response));
                return true;
            }
            return false;
        } catch (error) {
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (payload: api.RegisterPayload) => {
        setIsLoading(true);
        try {
            const response = await api.registerTenant(payload);
            if (response) {
                setAuthState(response);
                localStorage.setItem('authState', JSON.stringify(response));
                return true;
            }
            return false;
        } catch (error) {
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setAuthState(null);
        localStorage.removeItem('authState');
    };

    return (
        <AuthContext.Provider value={{ authState, isLoading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};
