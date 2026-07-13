const prisma = require('../lib/prisma');

function emitNotification(notification) {
  try {
    const { getIO } = require('../socket');
    const io = getIO();
    io.to(`user:${notification.userId}`).emit('notification:new', notification);
  } catch {
    // Realtime delivery is best-effort. The durable database notification is
    // still available on the next API fetch.
  }
}

async function createNotification(userId, type, title, body, link = null) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, link },
    });

    emitNotification(notification);

    return notification;
  } catch (err) {
    console.error('Notification error:', err);
    return null;
  }
}

module.exports = { createNotification, emitNotification };
