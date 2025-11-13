import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Tenant, Table, MenuCategory, MenuItem, Order, OrderItem, OrderStatus, TableStatus, UserRole, SubscriptionStatus } from '../types';
import * as api from '../services/api';
import { translations, Language, TranslationKey } from '../locales/translations';

interface AuthState {
    user: User;
    tenant: Tenant | null; // Null for Super Admin
}

interface AppContextData {
    authState: AuthState | null;
    lang: Language;
    // Tenant-specific data
    tables: Table[];
    menuCategories: MenuCategory[];
    menuItems: MenuItem[];
    orders: Order[];
    users: User[];
    // Super Admin data
    allTenants: Tenant[];
    allUsers: User[];

    isLoading: boolean;
    login: (email: string, passwordOrSlug: string) => Promise<boolean>;
    logout: () => void;
    register: (payload: api.RegisterPayload) => Promise<boolean>;
    setLang: (lang: Language) => void;
    t: (key: TranslationKey, fallback?: string) => string;
    
    // Tenant mutations
    addTable: (name: string) => Promise<void>;
    updateTable: (table: Table) => Promise<void>;
    addCategory: (name: string) => Promise<void>;
    updateCategory: (category: MenuCategory) => Promise<void>;
    addMenuItem: (item: Omit<MenuItem, 'id' | 'tenantId'>) => Promise<void>;
    updateMenuItem: (item: MenuItem) => Promise<void>;
    addUser: (user: Omit<User, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    createOrder: (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[]) => Promise<void>;
    updateOrderItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
    markOrderAsReady: (orderId: string) => Promise<void>;
    updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
    serveOrder: (orderId: string) => Promise<void>;
    closeTable: (tableId: string) => Promise<void>;

    // Super Admin mutations
    updateTenantSubscription: (tenantId: string, status: SubscriptionStatus) => Promise<void>;
}

export const AppContext = createContext<AppContextData | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<AuthState | null>(null);
    const [lang, setLangState] = useState<Language>('en');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Tenant-specific state
    const [tables, setTables] = useState<Table[]>([]);
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Super Admin state
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const fetchTenantData = useCallback(async (tenantId: string) => {
        const [tablesData, categoriesData, itemsData, ordersData, usersData] = await Promise.all([
            api.getTables(tenantId),
            api.getMenuCategories(tenantId),
            api.getMenuItems(tenantId),
            api.getOrders(tenantId),
            api.getUsers(tenantId)
        ]);
        setTables(tablesData);
        setMenuCategories(categoriesData);
        setMenuItems(itemsData);
        setOrders(ordersData);
        setUsers(usersData);
    }, []);
    
    const fetchSuperAdminData = useCallback(async () => {
        const [tenantsData, usersData] = await Promise.all([
            api.getAllTenants(),
            api.getAllUsers(),
        ]);
        setAllTenants(tenantsData);
        setAllUsers(usersData);
    }, []);

    const fetchData = useCallback(async () => {
        if (!authState) return;
        setIsLoading(true);
        try {
            if (authState.user.role === UserRole.SUPER_ADMIN) {
                await fetchSuperAdminData();
            } else if (authState.tenant) {
                await fetchTenantData(authState.tenant.id);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [authState, fetchTenantData, fetchSuperAdminData]);

    useEffect(() => {
        if (authState) {
            fetchData();
            if (authState.tenant) {
                setLangState(authState.tenant.defaultLanguage);
            }
        } else {
            // Reset state on logout
            setTables([]);
            setMenuCategories([]);
            setMenuItems([]);
            setOrders([]);
            setUsers([]);
            setAllTenants([]);
            setAllUsers([]);
            setIsLoading(false);
        }
    }, [authState, fetchData]);


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
    
    const logout = () => {
        setAuthState(null);
        localStorage.removeItem('authState');
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

    useEffect(() => {
        const storedAuthState = localStorage.getItem('authState');
        if (storedAuthState) {
            setAuthState(JSON.parse(storedAuthState));
        } else {
            setIsLoading(false);
        }
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
    };

    const t = (key: TranslationKey, fallback?: string): string => {
        return translations[lang][key] || fallback || key;
    };
    
    const handleMutation = async <T,>(mutationFn: () => Promise<T>) => {
        await mutationFn();
        await fetchData();
    };
    
    const addTable = async (name: string) => handleMutation(() => api.addTable(authState!.tenant!.id, name));
    const updateTable = async (table: Table) => handleMutation(() => api.updateTable(table));
    const addCategory = async (name: string) => handleMutation(() => api.addCategory(authState!.tenant!.id, name));
    const updateCategory = async (category: MenuCategory) => handleMutation(() => api.updateCategory(category));
    const addMenuItem = async (item: Omit<MenuItem, 'id' | 'tenantId'>) => handleMutation(() => api.addMenuItem(authState!.tenant!.id, item));
    const updateMenuItem = async (item: MenuItem) => handleMutation(() => api.updateMenuItem(item));
    const addUser = async (user: Omit<User, 'id' | 'tenantId'| 'passwordHash' | 'isActive'> & { password?: string }) => handleMutation(() => api.addUser(authState!.tenant!.id, user));
    const updateUser = async (user: User) => handleMutation(() => api.updateUser(user));
    const createOrder = async (tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[]) => handleMutation(() => api.createOrder(authState!.tenant!.id, tableId, items));
    const updateOrderItemStatus = async (orderId: string, itemId: string, status: OrderStatus) => handleMutation(() => api.updateOrderItemStatus(orderId, itemId, status));
    const markOrderAsReady = async (orderId: string) => handleMutation(() => api.markOrderAsReady(orderId));
    const updateTableStatus = async (tableId: string, status: TableStatus) => handleMutation(() => api.updateTableStatus(tableId, status));
    const serveOrder = async (orderId: string) => handleMutation(() => api.serveOrder(orderId));
    const closeTable = async (tableId: string) => handleMutation(() => api.closeTable(tableId));
    
    // Super Admin mutation
    const updateTenantSubscription = async (tenantId: string, status: SubscriptionStatus) => handleMutation(() => api.updateTenantSubscription(tenantId, status));

    return (
        <AppContext.Provider value={{ 
            authState, 
            lang, 
            tables,
            menuCategories,
            menuItems,
            orders,
            users,
            allTenants,
            allUsers,
            isLoading, 
            login, 
            logout, 
            register,
            setLang, 
            t, 
            addTable,
            updateTable,
            addCategory,
            updateCategory,
            addMenuItem,
            updateMenuItem,
            addUser,
            updateUser,
            createOrder,
            updateOrderItemStatus,
            markOrderAsReady,
            updateTableStatus,
            serveOrder,
            closeTable,
            updateTenantSubscription,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = React.useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
