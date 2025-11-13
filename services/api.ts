import {
    Tenant, User, Table, MenuCategory, MenuItem, Order, OrderItem,
    UserRole, TableStatus, OrderStatus, SubscriptionStatus
} from '../types';

// --- MOCK DATABASE ---

interface MockDB {
    tenants: Tenant[];
    users: User[];
    tables: Table[];
    menuCategories: MenuCategory[];
    menuItems: MenuItem[];
    orders: Order[];
}

const seedData: MockDB = {
    tenants: [
        { id: 't1', name: 'Sunset Bistro', slug: 'sunset-bistro', defaultLanguage: 'en', subscriptionStatus: SubscriptionStatus.ACTIVE, createdAt: new Date('2023-10-26T10:00:00Z') }
    ],
    users: [
        { id: 'su1', fullName: 'Super Admin', email: 'superadmin@ordo.com', passwordHash: 'superadmin', role: UserRole.SUPER_ADMIN, isActive: true },
        { id: 'u1', tenantId: 't1', fullName: 'Admin User', email: 'admin@sunsetbistro.com', passwordHash: 'sunset-bistro', role: UserRole.ADMIN, isActive: true },
        { id: 'u2', tenantId: 't1', fullName: 'Waiter User', email: 'waiter@sunsetbistro.com', passwordHash: 'sunset-bistro', role: UserRole.WAITER, isActive: true },
        { id: 'u3', tenantId: 't1', fullName: 'Kitchen Staff', email: 'kitchen@sunsetbistro.com', passwordHash: 'sunset-bistro', role: UserRole.KITCHEN, isActive: true },
    ],
    tables: Array.from({ length: 12 }, (_, i) => ({ id: `tbl${i + 1}`, tenantId: 't1', name: `T${i + 1}`, status: TableStatus.FREE })),
    menuCategories: [
        { id: 'cat1', tenantId: 't1', name: 'Appetizers' },
        { id: 'cat2', tenantId: 't1', name: 'Main Courses' },
        { id: 'cat3', tenantId: 't1', name: 'Desserts' },
        { id: 'cat4', tenantId: 't1', name: 'Drinks' },
    ],
    menuItems: [
        // Appetizers
        { id: 'item1', tenantId: 't1', categoryId: 'cat1', name: 'Bruschetta', description: 'Grilled bread with tomatoes, garlic, and basil.', price: 8.50, isAvailable: true },
        { id: 'item2', tenantId: 't1', categoryId: 'cat1', name: 'Calamari', description: 'Fried squid rings with dipping sauce.', price: 12.00, isAvailable: true },
        // Main Courses
        { id: 'item3', tenantId: 't1', categoryId: 'cat2', name: 'Spaghetti Carbonara', description: 'Pasta with eggs, cheese, pancetta, and pepper.', price: 16.00, isAvailable: true },
        { id: 'item4', tenantId: 't1', categoryId: 'cat2', name: 'Grilled Salmon', description: 'Served with asparagus and lemon.', price: 22.50, isAvailable: true },
        { id: 'item5', tenantId: 't1', categoryId: 'cat2', name: 'Margherita Pizza', description: 'Classic pizza with tomatoes, mozzarella, and basil.', price: 14.00, isAvailable: false },
        // Desserts
        { id: 'item6', tenantId: 't1', categoryId: 'cat3', name: 'Tiramisu', description: 'Coffee-flavoured Italian dessert.', price: 9.00, isAvailable: true },
        // Drinks
        { id: 'item7', tenantId: 't1', categoryId: 'cat4', name: 'Water', description: 'Still or sparkling water.', price: 2.00, isAvailable: true },
        { id: 'item8', tenantId: 't1', categoryId: 'cat4', name: 'Cola', description: 'Classic soft drink.', price: 3.50, isAvailable: true },
    ],
    orders: [],
};

let db: MockDB;

const initializeDB = () => {
    const savedDb = localStorage.getItem('ordo-db');
    if (savedDb) {
        try {
            const parsed = JSON.parse(savedDb);
            // Revive dates
            parsed.orders = parsed.orders.map((o: Order) => ({
                ...o,
                createdAt: new Date(o.createdAt),
                updatedAt: new Date(o.updatedAt),
            }));
            parsed.tenants = parsed.tenants.map((t: Tenant) => ({
                ...t,
                createdAt: new Date(t.createdAt),
            }));
            db = parsed;
        } catch (e) {
            console.error("Failed to parse DB from localStorage, seeding new data.", e);
            db = JSON.parse(JSON.stringify(seedData));
        }
    } else {
        db = JSON.parse(JSON.stringify(seedData)); // Deep copy to avoid mutating seedData
    }
};

const saveDb = () => {
    localStorage.setItem('ordo-db', JSON.stringify(db));
};

initializeDB();

const simulateDelay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// --- API FUNCTIONS ---

export interface RegisterPayload {
    tenantName: string;
    tenantSlug: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
}

export const registerTenant = async (payload: RegisterPayload): Promise<{ user: User, tenant: Tenant } | null> => {
    await simulateDelay();

    const slugExists = db.tenants.some(t => t.slug === payload.tenantSlug);
    if (slugExists) {
        console.error("Tenant slug already exists");
        return null;
    }
    const emailExists = db.users.some(u => u.email.toLowerCase() === payload.adminEmail.toLowerCase());
    if(emailExists) {
        console.error("Email already exists");
        return null; 
    }

    const newTenant: Tenant = {
        id: `t${Date.now()}`,
        name: payload.tenantName,
        slug: payload.tenantSlug,
        defaultLanguage: 'en',
        subscriptionStatus: SubscriptionStatus.TRIAL,
        createdAt: new Date(),
    };
    db.tenants.push(newTenant);

    const newAdminUser: User = {
        id: `u${Date.now()}`,
        tenantId: newTenant.id,
        fullName: payload.adminFullName,
        email: payload.adminEmail,
        passwordHash: payload.adminPassword, // Not hashing, it's a mock
        role: UserRole.ADMIN,
        isActive: true,
    };
    db.users.push(newAdminUser);

    saveDb();

    return { user: newAdminUser, tenant: newTenant };
};

export const login = async (email: string, passwordOrSlug: string): Promise<{ user: User, tenant: Tenant | null } | null> => {
    await simulateDelay();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) return null;

    // Super Admin Login
    if (user.role === UserRole.SUPER_ADMIN) {
        if (user.passwordHash === passwordOrSlug) {
            return { user, tenant: null };
        }
        return null;
    }

    // Tenant User Login
    if (user.passwordHash === passwordOrSlug) {
        const tenant = db.tenants.find(t => t.id === user.tenantId);
        if (tenant) {
            return { user, tenant };
        }
    }

    return null;
};


// Generic getters
// Fix: Relax the generic constraint to allow for optional `tenantId` property, matching the User type.
const getDataByTenant = async <T extends { tenantId?: string }>(dataType: keyof MockDB, tenantId: string): Promise<T[]> => {
    await simulateDelay();
    return (db[dataType] as unknown as T[]).filter(item => item.tenantId === tenantId);
};

export const getTables = (tenantId: string) => getDataByTenant<Table>('tables', tenantId);
export const getMenuCategories = (tenantId: string) => getDataByTenant<MenuCategory>('menuCategories', tenantId);
export const getMenuItems = (tenantId: string) => getDataByTenant<MenuItem>('menuItems', tenantId);
export const getOrders = (tenantId: string) => getDataByTenant<Order>('orders', tenantId);
export const getUsers = (tenantId: string) => getDataByTenant<User>('users', tenantId);

// Super Admin Getters
export const getAllTenants = async (): Promise<Tenant[]> => {
    await simulateDelay();
    // Simulate date revival
    return db.tenants.map(t => ({...t, createdAt: new Date(t.createdAt)}));
};

export const getAllUsers = async (): Promise<User[]> => {
    await simulateDelay();
    return db.users;
};


// Mutations
export const addTable = async (tenantId: string, name: string): Promise<Table> => {
    await simulateDelay();
    const newTable: Table = {
        id: `tbl${Date.now()}`,
        tenantId,
        name,
        status: TableStatus.FREE,
    };
    db.tables.push(newTable);
    saveDb();
    return newTable;
};

export const updateTable = async (updatedTable: Table): Promise<Table> => {
    await simulateDelay();
    const index = db.tables.findIndex(t => t.id === updatedTable.id);
    if (index > -1) {
        db.tables[index] = updatedTable;
        saveDb();
        return updatedTable;
    }
    throw new Error('Table not found');
};

export const addCategory = async (tenantId: string, name: string): Promise<MenuCategory> => {
    await simulateDelay();
    const newCategory: MenuCategory = {
        id: `cat${Date.now()}`,
        tenantId,
        name,
    };
    db.menuCategories.push(newCategory);
    saveDb();
    return newCategory;
};

export const updateCategory = async (updatedCategory: MenuCategory): Promise<MenuCategory> => {
    await simulateDelay();
    const index = db.menuCategories.findIndex(c => c.id === updatedCategory.id);
    if (index > -1) {
        db.menuCategories[index] = updatedCategory;
        saveDb();
        return updatedCategory;
    }
    throw new Error('Category not found');
};

export const addMenuItem = async (tenantId: string, item: Omit<MenuItem, 'id' | 'tenantId'>): Promise<MenuItem> => {
    await simulateDelay();
    const newMenuItem: MenuItem = {
        id: `item${Date.now()}`,
        tenantId,
        ...item,
    };
    db.menuItems.push(newMenuItem);
    saveDb();
    return newMenuItem;
};

export const updateMenuItem = async (updatedItem: MenuItem): Promise<MenuItem> => {
    await simulateDelay();
    const index = db.menuItems.findIndex(i => i.id === updatedItem.id);
    if (index > -1) {
        db.menuItems[index] = updatedItem;
        saveDb();
        return updatedItem;
    }
    throw new Error('Menu item not found');
};

export const addUser = async (tenantId: string, user: Omit<User, 'id' | 'tenantId' | 'passwordHash' | 'isActive'> & { password?: string }): Promise<User> => {
    await simulateDelay();
    const newUser: User = {
        id: `user${Date.now()}`,
        tenantId,
        fullName: user.fullName,
        email: user.email,
        passwordHash: user.password || '123456', // Mock hash
        role: user.role,
        isActive: true,
    };
    db.users.push(newUser);
    saveDb();
    return newUser;
};

export const updateUser = async (updatedUser: User): Promise<User> => {
    await simulateDelay();
    const index = db.users.findIndex(u => u.id === updatedUser.id);
    if (index > -1) {
        db.users[index] = updatedUser;
        saveDb();
        return updatedUser;
    }
    throw new Error('User not found');
};

export const createOrder = async (tenantId: string, tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[]): Promise<Order> => {
    await simulateDelay();
    
    // Check if there is an existing active order for the table
    let order = db.orders.find(o => o.tableId === tableId && o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELED);

    if (order) {
        // Add items to existing order
        const newItems: OrderItem[] = items.map((item, index) => ({
            ...item,
            id: `orditem${Date.now()}-${index}`,
            orderId: order!.id,
            status: OrderStatus.NEW,
        }));
        order.items.push(...newItems);
        order.updatedAt = new Date();
    } else {
        // Create a new order
        const newOrder: Order = {
            id: `ord${Date.now()}`,
            tenantId,
            tableId,
            status: OrderStatus.NEW,
            items: items.map((item, index) => ({
                ...item,
                id: `orditem${Date.now()}-${index}`,
                orderId: `ord${Date.now()}`,
                status: OrderStatus.NEW,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        db.orders.push(newOrder);
        order = newOrder;
    }
    
    const table = db.tables.find(t => t.id === tableId);
    if (table && table.status === TableStatus.FREE) {
        table.status = TableStatus.OCCUPIED;
    }

    saveDb();
    return order;
};

export const updateOrderItemStatus = async (orderId: string, itemId: string, status: OrderStatus): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
        const item = order.items.find(i => i.id === itemId);
        if (item) {
            item.status = status;
            order.updatedAt = new Date();
            const allReady = order.items.every(i => i.status === OrderStatus.READY || i.status === OrderStatus.SERVED);
            if (allReady) order.status = OrderStatus.READY;
            saveDb();
        }
    }
};

export const markOrderAsReady = async (orderId: string): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
        order.items.forEach(item => {
            if (item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION) {
                item.status = OrderStatus.READY;
            }
        });
        order.status = OrderStatus.READY;
        order.updatedAt = new Date();
        saveDb();
    }
};

export const updateTableStatus = async (tableId: string, status: TableStatus): Promise<void> => {
    await simulateDelay();
    const table = db.tables.find(t => t.id === tableId);
    if (table) {
        table.status = status;
        saveDb();
    }
};

export const serveOrder = async (orderId: string): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if(order){
        order.items.forEach(i => {
            if (i.status === OrderStatus.READY) {
                i.status = OrderStatus.SERVED;
            }
        });
        
        if (order.items.every(i => i.status === OrderStatus.SERVED)) {
            order.status = OrderStatus.SERVED;
        }
        order.updatedAt = new Date();
        saveDb();
    }
};

export const closeTable = async (tableId: string): Promise<void> => {
    await simulateDelay();
    const table = db.tables.find(t => t.id === tableId);
    if(table){
        table.status = TableStatus.CLOSED; 
        setTimeout(() => {
            const currentTable = db.tables.find(t => t.id === tableId);
            if (currentTable && currentTable.status === TableStatus.CLOSED) {
                currentTable.status = TableStatus.FREE;
                saveDb();
            }
        }, 5000);
        saveDb();
    }
};

// Super Admin Mutations
export const updateTenantSubscription = async (tenantId: string, status: SubscriptionStatus): Promise<Tenant> => {
    await simulateDelay();
    const tenant = db.tenants.find(t => t.id === tenantId);
    if (tenant) {
        tenant.subscriptionStatus = status;
        saveDb();
        return tenant;
    }
    throw new Error('Tenant not found');
};