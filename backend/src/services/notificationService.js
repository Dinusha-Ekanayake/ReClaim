const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createNotification(userId, type, title, body, link = null) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, link },
    });

    // Push via socket if available
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', { type, title, body, link });
    } catch {}

    return notification;
  } catch (err) {
    console.error('Notification error:', err);
  }
}

module.exports = { createNotification };
