require('dotenv').config();

const http = require('http');
const { validateEnv } = require('./config/env');

// Fail fast if required configuration is missing.
validateEnv();

const { createApp } = require('./app');
const { initSocket } = require('./socket');
const prisma = require('./lib/prisma');

const app = createApp();
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ─── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 ReClaim API running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 CORS origin: ${process.env.FRONTEND_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully...`);

  // Stop accepting new connections, then drain.
  server.close(() => console.log('✅ HTTP server closed'));

  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (err) {
    console.error('Error disconnecting Prisma:', err);
  }

  // Force-exit if something hangs.
  setTimeout(() => process.exit(1), 10000).unref();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, server };
