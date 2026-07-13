const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('ADMIN_EMAIL must be set to a valid, deployment-specific address');
  }
  if (!process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD.length < 12 ||
      Buffer.byteLength(process.env.ADMIN_PASSWORD, 'utf8') > 72 ||
      /(replace|change|example|password)/i.test(process.env.ADMIN_PASSWORD)) {
    throw new Error('ADMIN_PASSWORD must be unique, at least 12 characters, and at most 72 bytes');
  }

  console.log('🌱 Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  const adminName = process.env.ADMIN_NAME?.trim() || 'ReClaim Admin';
  const existingAdminIdentity = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { role: true },
  });
  if (existingAdminIdentity && existingAdminIdentity.role !== 'SUPER_ADMIN') {
    console.warn(`Promoting the configured ADMIN_EMAIL from ${existingAdminIdentity.role} to SUPER_ADMIN.`);
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    // An explicit seed run is also the supported way to rotate an existing
    // bootstrap administrator away from an old or compromised password.
    update: {
      password: hashedPassword,
      name: adminName,
      role: 'SUPER_ADMIN',
      isVerified: true,
      isBanned: false,
      banReason: null,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
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
