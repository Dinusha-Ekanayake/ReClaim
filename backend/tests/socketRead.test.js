jest.mock('socket.io', () => ({
  Server: jest.fn(),
}));

jest.mock('../src/lib/prisma', () => ({
  chatParticipant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  chat: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  item: {
    findFirst: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));

jest.mock('../src/services/notificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../src/utils/tokenService', () => ({
  verifyAccessToken: jest.fn(),
}));

const { Server } = require('socket.io');
const prisma = require('../src/lib/prisma');
const { initSocket } = require('../src/socket');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHAT_ID = '22222222-2222-4222-8222-222222222222';

function registerConnection() {
  let connectionListener;
  const broadcast = {
    to: jest.fn(),
    emit: jest.fn(),
  };
  broadcast.to.mockReturnValue(broadcast);

  const io = {
    use: jest.fn(),
    on: jest.fn((event, listener) => {
      if (event === 'connection') connectionListener = listener;
    }),
    to: jest.fn(() => broadcast),
  };
  Server.mockImplementation(() => io);
  initSocket({});

  const listeners = {};
  const socket = {
    user: { id: USER_ID, name: 'Test User' },
    tokenExpiresAt: Date.now() + 60_000,
    rooms: new Set(),
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => broadcast),
    disconnect: jest.fn(),
    on: jest.fn((event, listener) => {
      listeners[event] = listener;
    }),
  };

  connectionListener(socket);
  return { broadcast, listeners, socket };
}

describe('socket chat:read input handling', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not-an-object'],
    ['an array', []],
    ['an empty object', {}],
    ['a null chat id', { chatId: null }],
    ['a numeric chat id', { chatId: 123 }],
    ['a malformed UUID', { chatId: 'not-a-chat-uuid' }],
  ])('ignores %s without rejecting or querying Prisma', async (_label, payload) => {
    const { listeners } = registerConnection();

    await expect(listeners['chat:read'](payload)).resolves.toBeUndefined();

    expect(prisma.chatParticipant.findUnique).not.toHaveBeenCalled();
    expect(prisma.chatParticipant.update).not.toHaveBeenCalled();
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('processes a valid UUID only after confirming chat participation', async () => {
    prisma.chatParticipant.findUnique.mockResolvedValue({ id: 'participant-1' });
    prisma.chatParticipant.update.mockResolvedValue({ id: 'participant-1' });
    prisma.message.updateMany.mockResolvedValue({ count: 2 });
    prisma.$transaction.mockResolvedValue([]);
    const { broadcast, listeners } = registerConnection();

    await expect(listeners['chat:read']({ chatId: CHAT_ID })).resolves.toBeUndefined();

    expect(prisma.chatParticipant.findUnique).toHaveBeenCalledWith({
      where: { chatId_userId: { chatId: CHAT_ID, userId: USER_ID } },
      select: { id: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.chatParticipant.update).toHaveBeenCalledTimes(1);
    expect(prisma.message.updateMany).toHaveBeenCalledTimes(1);
    expect(broadcast.emit).toHaveBeenCalledWith('chat:read', expect.objectContaining({
      chatId: CHAT_ID,
      userId: USER_ID,
      readAt: expect.any(Date),
    }));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('rejects a new message when the participant or listing-owner state is unavailable', async () => {
    prisma.chat.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementationOnce((operation) => operation(prisma));
    const { listeners } = registerConnection();
    const acknowledge = jest.fn();

    await listeners['chat:send']({ chatId: CHAT_ID, content: 'Can we arrange a handover?' }, acknowledge);

    expect(prisma.chat.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: CHAT_ID,
        AND: expect.arrayContaining([
          { participants: { some: { userId: USER_ID } } },
          { participants: { none: { user: { isBanned: true } } } },
        ]),
      }),
    }));
    expect(acknowledge).toHaveBeenCalledWith({
      ok: false,
      error: { code: 'CHAT_UNAVAILABLE', message: 'Chat is unavailable' },
    });
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('rejects a new message when the chat listing is no longer public because of its owner state', async () => {
    prisma.chat.findFirst.mockResolvedValue({
      itemId: '33333333-3333-4333-8333-333333333333',
      participants: [{ userId: USER_ID }, { userId: '44444444-4444-4444-8444-444444444444' }],
    });
    prisma.item.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementationOnce((operation) => operation(prisma));
    const { listeners } = registerConnection();
    const acknowledge = jest.fn();

    await listeners['chat:send']({ chatId: CHAT_ID, content: 'Is this still available?' }, acknowledge);

    expect(prisma.item.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: '33333333-3333-4333-8333-333333333333',
        user: { isBanned: false },
      }),
    }));
    expect(acknowledge).toHaveBeenCalledWith({
      ok: false,
      error: { code: 'CHAT_UNAVAILABLE', message: 'The item conversation is unavailable' },
    });
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
