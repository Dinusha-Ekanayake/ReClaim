const { PrismaClient } = require('@prisma/client');
const { configuredDatabaseUrl } = require('../config/databaseUrl');

const prisma = global.__prisma ?? new PrismaClient({
  datasources: {
    db: { url: configuredDatabaseUrl(process.env.DATABASE_URL) },
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
