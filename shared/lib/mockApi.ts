import { Tenant, User, SubscriptionStatus, UserRole, TableStatus, OrderStatus } from '../types';
import { Table } from '../../features/tables/types';
import { MenuCategory, MenuItem } from '../../features/menu/types';
import { Order, OrderItem } from '../../features/orders/types';
import { SummaryReport, TopItem } from '../../features/reports/types';


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
        { id: 't1', name: 'Sunset Bistro', slug: 'sunset-bistro', defaultLanguage: 'en', subscriptionStatus: SubscriptionStatus.ACTIVE, createdAt: new Date('2023-10-26T10:00:00Z'), currency: 'USD', timezone: 'America/New_York' }
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
        { id: 'item1', tenantId: 't1', categoryId: 'cat1', name: 'Bruschetta', description: 'Grilled bread with tomatoes, garlic, and basil.', price: 8.50, isAvailable: true },
        { id: 'item2', tenantId: 't1', categoryId: 'cat1', name: 'Calamari', description: 'Fried squid rings with dipping sauce.', price: 12.00, isAvailable: true },
        { id: 'item3', tenantId: 't1', categoryId: 'cat2', name: 'Spaghetti Carbonara', description: 'Pasta with eggs, cheese, pancetta, and pepper.', price: 16.00, isAvailable: true },
        { id: 'item4', tenantId: 't1', categoryId: 'cat2', name: 'Grilled Salmon', description: 'Served with asparagus and lemon.', price: 22.50, isAvailable: true },
        { id: 'item5', tenantId: 't1', categoryId: 'cat2', name: 'Margherita Pizza', description: 'Classic pizza with tomatoes, mozzarella, and basil.', price: 14.00, isAvailable: false },
        { id: 'item6', tenantId: 't1', categoryId: 'cat3', name: 'Tiramisu', description: 'Coffee-flavoured Italian dessert.', price: 9.00, isAvailable: true },
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
            parsed.orders = parsed.orders.map((o: any) => ({ 
                ...o, 
                createdAt: new Date(o.createdAt), 
                updatedAt: new Date(o.updatedAt),
                orderClosedAt: o.orderClosedAt ? new Date(o.orderClosedAt) : undefined,
            }));
            parsed.tenants = parsed.tenants.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) }));
            db = parsed;
        } catch (e) {
            console.error("Failed to parse DB, seeding new data.", e);
            db = JSON.parse(JSON.stringify(seedData));
        }
    } else {
        db = JSON.parse(JSON.stringify(seedData));
    }
};

const saveDb = () => {
    localStorage.setItem('ordo-db', JSON.stringify(db));
};

initializeDB();

const simulateDelay = (ms = 200) => new Promise(res => setTimeout(res, ms));

// --- INTERNAL API FUNCTIONS ---

export interface RegisterPayload {
    tenantName: string;
    tenantSlug: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
}

export const registerTenant = async (payload: RegisterPayload): Promise<{ user: User, tenant: Tenant } | null> => {
    await simulateDelay();
    if (db.tenants.some(t => t.slug === payload.tenantSlug) || db.users.some(u => u.email.toLowerCase() === payload.adminEmail.toLowerCase())) {
        return null;
    }
    const newTenant: Tenant = { id: `t${Date.now()}`, name: payload.tenantName, slug: payload.tenantSlug, defaultLanguage: 'en', subscriptionStatus: SubscriptionStatus.TRIAL, createdAt: new Date(), currency: 'USD', timezone: 'America/New_York' };
    db.tenants.push(newTenant);
    const newAdminUser: User = { id: `u${Date.now()}`, tenantId: newTenant.id, fullName: payload.adminFullName, email: payload.adminEmail, passwordHash: payload.adminPassword, role: UserRole.ADMIN, isActive: true };
    db.users.push(newAdminUser);
    saveDb();
    return { user: newAdminUser, tenant: newTenant };
};

export const login = async (email: string, passwordOrSlug: string): Promise<{ user: User, tenant: Tenant | null } | null> => {
    await simulateDelay();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    if (user.role === UserRole.SUPER_ADMIN && user.passwordHash === passwordOrSlug) {
        return { user, tenant: null };
    }
    if (user.passwordHash === passwordOrSlug) {
        const tenant = db.tenants.find(t => t.id === user.tenantId);
        return tenant ? { user, tenant } : null;
    }
    return null;
};

export const getDataByTenant = async <T extends { tenantId?: string }>(dataType: keyof MockDB, tenantId: string): Promise<T[]> => {
    await simulateDelay();
    return (db[dataType] as unknown as T[]).filter(item => item.tenantId === tenantId);
};

export const getAllData = async <T>(dataType: keyof MockDB): Promise<T[]> => {
    await simulateDelay();
    return db[dataType] as T[];
}

export const addData = async <T>(dataType: keyof MockDB, item: T): Promise<T> => {
    await simulateDelay();
    (db[dataType] as T[]).push(item);
    saveDb();
    return item;
}

export const updateData = async <T extends {id: string}>(dataType: keyof MockDB, updatedItem: T): Promise<T> => {
    await simulateDelay();
    const table = db[dataType] as unknown as T[];
    const index = table.findIndex(i => i.id === updatedItem.id);
    if (index > -1) {
        table[index] = updatedItem;
        saveDb();
        return updatedItem;
    }
    throw new Error('Item not found');
}

// Complex mutations
export const internalCreateOrder = async (tenantId: string, tableId: string, items: Pick<OrderItem, 'menuItemId' | 'quantity' | 'note'>[], waiterId: string, note?: string): Promise<Order> => {
    await simulateDelay();
    const waiter = db.users.find(u => u.id === waiterId);
    let order = db.orders.find(o => o.tableId === tableId && o.status !== OrderStatus.CLOSED);
    
    if (order) {
         if (order.status === OrderStatus.CLOSED) throw new Error("Cannot add items to a closed order.");
        const newItems: OrderItem[] = items.map((item, index) => ({ ...item, id: `orditem${Date.now()}-${index}`, orderId: order!.id, status: OrderStatus.NEW }));
        order.items.push(...newItems);
        order.updatedAt = new Date();
        if (note) {
            order.note = note;
        }
    } else {
        const orderId = `ord${Date.now()}`;
        const newOrder: Order = {
            id: orderId, tenantId, tableId, status: OrderStatus.NEW,
            items: items.map((item, index) => ({ ...item, id: `orditem${Date.now()}-${index}`, orderId, status: OrderStatus.NEW })),
            createdAt: new Date(), updatedAt: new Date(),
            waiterId: waiter?.id,
            waiterName: waiter?.fullName,
            note: note,
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

export const internalUpdateOrderItemStatus = async (orderId: string, itemId: string, status: OrderStatus): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
        const item = order.items.find(i => i.id === itemId);
        if (item && item.status !== OrderStatus.SERVED && item.status !== OrderStatus.CLOSED) {
            item.status = status;
            order.updatedAt = new Date();
            if (order.items.every(i => i.status === OrderStatus.READY || i.status === OrderStatus.SERVED)) {
                order.status = OrderStatus.READY;
            }
             if (order.items.every(i => i.status === OrderStatus.SERVED)) {
                order.status = OrderStatus.SERVED;
            }
            saveDb();
        }
    }
};

export const internalMarkOrderAsReady = async (orderId: string): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
        order.items.forEach(item => { if (item.status === OrderStatus.NEW || item.status === OrderStatus.IN_PREPARATION) item.status = OrderStatus.READY; });
        order.status = OrderStatus.READY;
        order.updatedAt = new Date();
        saveDb();
    }
};

export const internalServeOrderItem = async (orderId: string, itemId: string): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if(order) {
        const item = order.items.find(i => i.id === itemId);
        if (item && item.status === OrderStatus.READY) {
            item.status = OrderStatus.SERVED;
            order.updatedAt = new Date();
            // Check if the whole order is now served
            if(order.items.every(i => i.status === OrderStatus.SERVED || i.status === OrderStatus.CANCELED)) {
                order.status = OrderStatus.SERVED;
            }
            saveDb();
        }
    }
};

export const internalCloseOrder = async (orderId: string): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if(order && order.status === OrderStatus.SERVED) {
        order.status = OrderStatus.CLOSED;
        order.orderClosedAt = new Date();
        order.updatedAt = new Date();
        
        const table = db.tables.find(t => t.id === order.tableId);
        if(table) {
            table.status = TableStatus.FREE;
        }
        saveDb();
    }
};


export const internalUpdateTableStatus = async (tableId: string, status: TableStatus): Promise<void> => {
    await simulateDelay();
    const table = db.tables.find(t => t.id === tableId);
    if (table) {
        table.status = status;
        saveDb();
    }
};

export const internalUpdateOrderNote = async (orderId: string, note: string): Promise<void> => {
    await simulateDelay();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
        order.note = note;
        order.updatedAt = new Date();
        saveDb();
    }
};

export const internalGetSummaryReport = async (tenantId: string, startDate: string, endDate: string): Promise<SummaryReport> => {
    await simulateDelay(500);
    
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const closedOrders = db.orders.filter(order => {
        if (order.tenantId !== tenantId || order.status !== OrderStatus.CLOSED || !order.orderClosedAt) {
            return false;
        }
        const closedDate = new Date(order.orderClosedAt);
        return closedDate >= start && closedDate <= end;
    });

    let totalRevenue = 0;
    const itemAggregation: { [key: string]: { quantity: number; revenue: number } } = {};

    closedOrders.forEach(order => {
        order.items.forEach(item => {
            if (item.status === OrderStatus.CANCELED) return;
            const menuItem = db.menuItems.find(mi => mi.id === item.menuItemId);
            if (menuItem) {
                const itemRevenue = item.quantity * menuItem.price;
                totalRevenue += itemRevenue;

                if (!itemAggregation[menuItem.id]) {
                    itemAggregation[menuItem.id] = { quantity: 0, revenue: 0 };
                }
                itemAggregation[menuItem.id].quantity += item.quantity;
                itemAggregation[menuItem.id].revenue += itemRevenue;
            }
        });
    });

    const topItems: TopItem[] = Object.keys(itemAggregation)
        .map(menuItemId => {
            const menuItem = db.menuItems.find(mi => mi.id === menuItemId);
            return {
                name: menuItem?.name || 'Unknown Item',
                quantity: itemAggregation[menuItem.id].quantity,
                revenue: itemAggregation[menuItem.id].revenue,
            };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    const totalOrders = closedOrders.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return {
        startDate,
        endDate,
        totalOrders,
        totalRevenue,
        averageTicket,
        topItems,
    };
};

export const internalChangeUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    await simulateDelay();
    const user = db.users.find(u => u.id === userId);
    if (user) {
        // In a real app, you would hash this password
        user.passwordHash = newPassword;
        saveDb();
    } else {
        throw new Error('User not found');
    }
};