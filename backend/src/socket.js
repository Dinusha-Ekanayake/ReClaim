const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./lib/prisma');
const { createNotification } = require('./services/notificationService');
let io;

function accessTokenFromCookie(header) {
  const cookie = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith('reclaim_access='));
  return cookie ? decodeURIComponent(cookie.slice('reclaim_access='.length)) : null;
}

function initSocket(server) {
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(server, {
    maxHttpBufferSize: 1e6,
    perMessageDeflate: false,
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    allowRequest(req, callback) {
      const origin = req.headers.origin;
      callback(null, !origin || allowedOrigins.includes(origin));
    },
  });

  // ─── Auth Middleware ──────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || accessTokenFromCookie(socket.handshake.headers.cookie);
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, avatarUrl: true, role: true, isBanned: true },
      });

      if (!user || user.isBanned) return next(new Error('User not found or banned'));
      socket.user = user;
      socket.tokenExpiresAt = decoded.exp * 1000;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection ───────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const sendTimestamps = [];
    const authTimer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.tokenExpiresAt - Date.now()));
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ─── Chat ──────────────────────────────────────────────────────────────
    socket.on('chat:join', async (chatId) => {
      if (typeof chatId !== 'string' || chatId.length > 64) return;
      const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
        select: { id: true },
      }).catch(() => null);
      if (!participant) return socket.emit('chat:error', { message: 'Not a chat participant' });
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId) => {
      if (typeof chatId !== 'string') return;
      socket.leave(`chat:${chatId}`);
    });

    socket.on('chat:send', async (data) => {
      try {
        if (!data || typeof data !== 'object') return;
        const { chatId, content } = data;
        if (typeof chatId !== 'string' || chatId.length > 64 || typeof content !== 'string') return;
        const cleanContent = content.trim();
        if (!cleanContent || cleanContent.length > 2000) {
          return socket.emit('chat:error', { message: 'Messages must be between 1 and 2000 characters' });
        }

        const now = Date.now();
        while (sendTimestamps.length && sendTimestamps[0] < now - 10_000) sendTimestamps.shift();
        if (sendTimestamps.length >= 20) {
          return socket.emit('chat:error', { message: 'You are sending messages too quickly' });
        }
        sendTimestamps.push(now);

        // Verify user is participant
        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId, userId } },
        });
        if (!participant) return socket.emit('chat:error', { message: 'Not a chat participant' });

        // Save message
        const message = await prisma.message.create({
          data: { chatId, senderId: userId, content: cleanContent },
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
          await createNotification(
            other.userId,
            'NEW_MESSAGE',
            'New message',
            `${socket.user.name}: ${cleanContent.slice(0, 60)}`,
            `/chat/${chatId}`
          );
        }
      } catch (err) {
        console.error('Socket chat:send error:', err);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', async (data) => {
      const chatId = data?.chatId;
      if (typeof chatId !== 'string' || !socket.rooms.has(`chat:${chatId}`)) return;
      socket.to(`chat:${chatId}`).emit('chat:typing', { chatId, userId, name: socket.user.name });
    });

    socket.on('chat:read', async ({ chatId }) => {
      try {
        if (typeof chatId !== 'string') return;
        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId, userId } }, select: { id: true },
        });
        if (!participant) return;
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
      clearTimeout(authTimer);
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
