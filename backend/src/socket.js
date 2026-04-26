const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // ─── Auth Middleware ──────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, avatarUrl: true, role: true, isBanned: true },
      });

      if (!user || user.isBanned) return next(new Error('User not found or banned'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection ───────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ─── Chat ──────────────────────────────────────────────────────────────
    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('chat:send', async (data) => {
      try {
        const { chatId, content } = data;
        if (!content?.trim()) return;

        // Verify user is participant
        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId, userId } },
        });
        if (!participant) return socket.emit('error', { message: 'Not a chat participant' });

        // Save message
        const message = await prisma.message.create({
          data: { chatId, senderId: userId, content: content.trim() },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        // Update chat timestamp
        await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

        // Broadcast to all in chat room
        io.to(`chat:${chatId}`).emit('chat:message', message);

        // Notify other participants
        const others = await prisma.chatParticipant.findMany({
          where: { chatId, userId: { not: userId } },
          select: { userId: true },
        });

        for (const other of others) {
          // Create notification
          await prisma.notification.create({
            data: {
              userId: other.userId,
              type: 'NEW_MESSAGE',
              title: 'New message',
              body: `${socket.user.name}: ${content.slice(0, 60)}`,
              link: `/chat/${chatId}`,
            },
          });
          io.to(`user:${other.userId}`).emit('notification:new', {
            type: 'NEW_MESSAGE',
            title: 'New message',
            body: `${socket.user.name}: ${content.slice(0, 60)}`,
            link: `/chat/${chatId}`,
          });
        }
      } catch (err) {
        console.error('Socket chat:send error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', (data) => {
      socket.to(`chat:${data.chatId}`).emit('chat:typing', {
        chatId: data.chatId,
        userId,
        name: socket.user.name,
      });
    });

    socket.on('chat:read', async ({ chatId }) => {
      try {
        await prisma.chatParticipant.update({
          where: { chatId_userId: { chatId, userId } },
          data: { lastReadAt: new Date() },
        });
        await prisma.message.updateMany({
          where: { chatId, senderId: { not: userId }, isRead: false },
          data: { isRead: true },
        });
      } catch {}
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.name}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
