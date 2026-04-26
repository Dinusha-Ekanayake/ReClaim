const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'Admin@123',
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@reclaim.app' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@reclaim.app',
      password: hashedPassword,
      name: process.env.ADMIN_NAME || 'ReClaim Admin',
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // Create sample categories (for reference)
  console.log('✅ Categories are handled in-app');
  
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
