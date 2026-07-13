const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must be set to a unique value with at least 12 characters');
  }

  console.log('🌱 Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@reclaim.app' },
    // An explicit seed run is also the supported way to rotate an existing
    // bootstrap administrator away from an old or compromised password.
    update: { password: hashedPassword },
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
