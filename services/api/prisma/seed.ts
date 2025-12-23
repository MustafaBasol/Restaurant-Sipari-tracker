import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  SubscriptionStatus,
  KitchenStation,
  TableStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const main = async () => {
  const seedDemo = String(process.env.SEED_DEMO ?? '').toLowerCase() === 'true';
  if (!seedDemo) {
    console.log('SEED_DEMO is not true; skipping seed.');
    return;
  }

  const tenantSlug = 'sunset-bistro';
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (existingTenant) {
    console.log('Demo tenant already exists; skipping.');
    return;
  }

  const now = new Date();
  const trialEndAt = new Date(now);
  trialEndAt.setDate(now.getDate() + 7);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Sunset Bistro',
      slug: tenantSlug,
      defaultLanguage: 'en',
      subscriptionStatus: SubscriptionStatus.TRIAL,
      currency: 'USD',
      timezone: 'America/New_York',
      trialStartAt: now,
      trialEndAt,
      permissions: {
        WAITER: {
          ORDER_PAYMENTS: true,
          ORDER_DISCOUNT: true,
          ORDER_COMPLIMENTARY: true,
          ORDER_ITEM_CANCEL: true,
          ORDER_ITEM_SERVE: true,
          ORDER_TABLES: true,
          ORDER_CLOSE: true,
        },
        KITCHEN: {
          KITCHEN_ITEM_STATUS: true,
          KITCHEN_MARK_ALL_READY: true,
        },
      },
    },
  });

  const superAdminPassword = await bcrypt.hash('superadmin', 12);
  await prisma.user.create({
    data: {
      fullName: 'Super Admin',
      email: 'superadmin@kitchorify.com',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const mkUser = async (email: string, fullName: string, role: UserRole, password: string) => {
    const hash = await bcrypt.hash(password, 12);
    return prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName,
        email,
        passwordHash: hash,
        role,
        isActive: true,
      },
    });
  };

  const admin = await mkUser(
    'admin@sunsetbistro.com',
    'Admin User',
    UserRole.ADMIN,
    'sunset-bistro',
  );
  await mkUser('waiter@sunsetbistro.com', 'Waiter User', UserRole.WAITER, 'sunset-bistro');
  await mkUser('kitchen@sunsetbistro.com', 'Kitchen Staff', UserRole.KITCHEN, 'sunset-bistro');

  await prisma.table.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      tenantId: tenant.id,
      name: `T${i + 1}`,
      status: TableStatus.FREE,
    })),
  });

  const cat1 = await prisma.menuCategory.create({
    data: { tenantId: tenant.id, name: 'Appetizers' },
  });
  const cat2 = await prisma.menuCategory.create({
    data: { tenantId: tenant.id, name: 'Main Courses' },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        tenantId: tenant.id,
        categoryId: cat1.id,
        name: 'Bruschetta',
        station: KitchenStation.HOT,
        description: 'Grilled bread with tomatoes, garlic, and basil.',
        price: 8.5,
        isAvailable: true,
        allergens: ['gluten'],
        bundleItemIds: [],
      },
      {
        tenantId: tenant.id,
        categoryId: cat2.id,
        name: 'Spaghetti Carbonara',
        station: KitchenStation.HOT,
        description: 'Pasta with eggs, cheese, pancetta, and pepper.',
        price: 16.0,
        isAvailable: true,
        allergens: ['gluten', 'egg', 'dairy'],
        bundleItemIds: [],
      },
    ],
  });

  console.log('Seed complete. Admin user:', admin.email);
};

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
