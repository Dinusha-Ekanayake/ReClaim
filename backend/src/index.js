require('dotenv').config();

const http = require('http');
const { validateEnv } = require('./config/env');

validateEnv();

const { createApp } = require('./app');
const { initSocket } = require('./socket');
const { startMatchingWorker, stopMatchingWorker } = require('./services/matchingWorker');
const prisma = require('./lib/prisma');

const app = createApp();
const server = http.createServer(app);
const io = initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`ReClaim API running on port ${PORT}`);
  console.log('Socket.io ready');
  console.log(`CORS origin: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  startMatchingWorker();
});

let shuttingDown = false;
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    // Active WebSocket connections otherwise keep the HTTP server open until
    // the forced-exit timer fires. Disconnect them before draining HTTP work.
    io.disconnectSockets(true);
    console.log('Socket connections closed');
  } catch (err) {
    console.error('Error closing socket connections:', err);
  }

  await new Promise((resolve) => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
    server.closeIdleConnections?.();
  });

  try {
    await stopMatchingWorker();
    console.log('Matching worker stopped');
  } catch (err) {
    console.error('Error stopping matching worker:', err);
  }

  try {
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (err) {
    console.error('Error disconnecting Prisma:', err);
  }

  clearTimeout(forceExit);
  process.exit(exitCode);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException', 1);
});

module.exports = { app, server };
