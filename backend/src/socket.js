const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./lib/prisma');
const { emitNotification } = require('./services/notificationService');
const { verifyAccessToken } = require('./utils/tokenService');
const { configuredFrontendOrigins } = require('./config/origins');
let io;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const realtimeRateBuckets = new Map();

function consumeRealtimeQuota(key, { max, windowMs }) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (realtimeRateBuckets.get(key) || []).filter((timestamp) => timestamp > cutoff);
  if (timestamps.length >= max) {
    realtimeRateBuckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  realtimeRateBuckets.set(key, timestamps);

  // Delete idle buckets without allowing reconnects or extra tabs to reset an
  // active per-account limit.
  const lastTimestamp = now;
  const cleanupTimer = setTimeout(() => {
    const current = realtimeRateBuckets.get(key);
    if (current?.at(-1) === lastTimestamp && Date.now() - lastTimestamp >= windowMs) {
      realtimeRateBuckets.delete(key);
    }
  }, windowMs + 100);
  cleanupTimer.unref?.();
  return true;
}

function authError(message, code) {
  const error = new Error(message);
  error.data = { code };
  return error;
}

function accessTokenFromCookie(header) {
  const cookie = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith('reclaim_access='));
  return cookie ? decodeURIComponent(cookie.slice('reclaim_access='.length)) : null;
}

function initSocket(server) {
  const allowedOrigins = configuredFrontendOrigins();

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
      if (!token) return next(authError('Authentication required', 'AUTH_REQUIRED'));

      const decoded = verifyAccessToken(token);
      if (!decoded || typeof decoded !== 'object' || typeof decoded.userId !== 'string' || typeof decoded.exp !== 'number') {
        return next(authError('Invalid token', 'AUTH_INVALID'));
      }
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, avatarUrl: true, role: true, isBanned: true },
      });

      if (!user || user.isBanned) return next(authError('User not found or banned', 'AUTH_FORBIDDEN'));
      socket.user = user;
      socket.tokenExpiresAt = decoded.exp * 1000;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(authError('Session expired', 'TOKEN_EXPIRED'));
      }
      next(authError('Invalid token', 'AUTH_INVALID'));
    }
  });

  // ─── Connection ───────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const authTimer = setTimeout(() => {
      socket.emit('auth:expired', { code: 'TOKEN_EXPIRED', message: 'Session expired' });
      socket.disconnect(true);
    }, Math.max(0, socket.tokenExpiresAt - Date.now()));
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ─── Chat ──────────────────────────────────────────────────────────────
    socket.on('chat:join', async (chatId) => {
      if (typeof chatId !== 'string' || !UUID_PATTERN.test(chatId)) return;
      if (!consumeRealtimeQuota(`join:${userId}`, { max: 30, windowMs: 10_000 })) {
        return socket.emit('chat:error', { message: 'Too many chat requests' });
      }
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

    socket.on('chat:send', async (data, acknowledge) => {
      const respond = (payload) => {
        if (typeof acknowledge === 'function') acknowledge(payload);
        else if (!payload.ok) socket.emit('chat:error', payload.error);
      };
      const fail = (code, message) => respond({ ok: false, error: { code, message } });

      try {
        if (!data || typeof data !== 'object') return fail('INVALID_MESSAGE', 'Invalid message');
        const { chatId, content, clientId } = data;
        if (typeof chatId !== 'string' || !UUID_PATTERN.test(chatId) || typeof content !== 'string') {
          return fail('INVALID_MESSAGE', 'Invalid message');
        }
        if (clientId !== undefined && (
          typeof clientId !== 'string'
          || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)
        )) {
          return fail('INVALID_MESSAGE_ID', 'Invalid message identifier');
        }
        const cleanContent = content.trim();
        if (!cleanContent || cleanContent.length > 2000) {
          return fail('INVALID_MESSAGE', 'Messages must be between 1 and 2000 characters');
        }

        if (!consumeRealtimeQuota(`send:${userId}`, { max: 20, windowMs: 10_000 })) {
          return fail('RATE_LIMITED', 'You are sending messages too quickly');
        }

        // A socket can remain connected after a moderation action. Revalidate
        // every participant and the listing owner inside the message write so
        // banned accounts cannot continue an existing conversation.
        const persisted = await prisma.$transaction(async (tx) => {
          const chat = await tx.chat.findFirst({
            where: {
              id: chatId,
              AND: [
                { participants: { some: { userId } } },
                { participants: { none: { user: { isBanned: true } } } },
              ],
            },
            select: {
              itemId: true,
              participants: { select: { userId: true } },
            },
          });
          if (!chat) {
            const error = new Error('Chat is unavailable');
            error.chatCode = 'CHAT_UNAVAILABLE';
            throw error;
          }

          if (chat.itemId) {
            const availableItem = await tx.item.findFirst({
              where: {
                id: chat.itemId,
                isApproved: true,
                deletedAt: null,
                status: { not: 'REJECTED' },
                user: { isBanned: false },
              },
              select: { id: true },
            });
            if (!availableItem) {
              const error = new Error('The item conversation is unavailable');
              error.chatCode = 'CHAT_UNAVAILABLE';
              throw error;
            }
          }

          const created = await tx.message.create({
            data: {
              ...(clientId && { id: clientId }),
              chatId,
              senderId: userId,
              content: cleanContent,
            },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          });
          await tx.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
          const notifications = [];
          for (const participant of chat.participants) {
            if (participant.userId === userId) continue;
            notifications.push(await tx.notification.create({
              data: {
                userId: participant.userId,
                type: 'NEW_MESSAGE',
                title: 'New message',
                body: `${socket.user.name}: ${cleanContent.slice(0, 60)}`,
                link: `/chat/${chatId}`,
              },
            }));
          }
          return { message: created, participants: chat.participants, notifications };
        });
        const { message, participants, notifications } = persisted;

        io.to(`chat:${chatId}`).emit('chat:message', message);
        for (const participant of participants) {
          io.to(`user:${participant.userId}`).emit('chat:updated', {
            chatId,
            message,
            unreadIncrement: participant.userId !== userId,
          });
        }
        respond({ ok: true, message });
        notifications.forEach(emitNotification);
      } catch (err) {
        if (err?.chatCode === 'CHAT_UNAVAILABLE') {
          return fail('CHAT_UNAVAILABLE', err.message);
        }
        // A retry with the same client-generated UUID is idempotent. Return the
        // original persisted message instead of creating a duplicate.
        if (data?.clientId && err?.code === 'P2002') {
          const existing = await prisma.message.findUnique({
            where: { id: data.clientId },
            include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
          }).catch(() => null);
          if (existing && existing.chatId === data.chatId && existing.senderId === userId) {
            return respond({ ok: true, message: existing });
          }
        }
        console.error('Socket chat:send error:', err);
        fail('SEND_FAILED', 'Failed to send message');
      }
    });

    socket.on('chat:typing', async (data) => {
      const chatId = data?.chatId;
      if (typeof chatId !== 'string' || !socket.rooms.has(`chat:${chatId}`)) return;
      if (!consumeRealtimeQuota(`typing:${userId}`, { max: 12, windowMs: 5_000 })) return;
      socket.to(`chat:${chatId}`).emit('chat:typing', { chatId, userId, name: socket.user.name });
    });

    socket.on('chat:read', async (data) => {
      try {
        if (!data || typeof data !== 'object') return;
        const { chatId } = data;
        if (typeof chatId !== 'string' || !UUID_PATTERN.test(chatId)) return;
        if (!consumeRealtimeQuota(`read:${userId}`, { max: 30, windowMs: 10_000 })) return;
        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId, userId } }, select: { id: true },
        });
        if (!participant) return;
        const readAt = new Date();
        await prisma.$transaction([
          prisma.chatParticipant.update({
            where: { chatId_userId: { chatId, userId } },
            data: { lastReadAt: readAt },
          }),
          prisma.message.updateMany({
            where: { chatId, senderId: { not: userId }, isRead: false },
            data: { isRead: true },
          }),
        ]);
        io.to(`chat:${chatId}`).to(`user:${userId}`).emit('chat:read', { chatId, userId, readAt });
      } catch (err) {
        console.error('Socket chat:read error:', err);
      }
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
