process.env.JWT_SECRET = 'pending-upload-test-secret-that-is-long-enough';

jest.mock('../src/lib/prisma', () => ({
  pendingUpload: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}));
jest.mock('../src/services/cloudinaryService', () => ({
  deleteFromCloudinary: jest.fn(),
}));

const prisma = require('../src/lib/prisma');
const { deleteFromCloudinary } = require('../src/services/cloudinaryService');
const {
  cleanupPendingUploads,
  consumePendingUploads,
  createPendingDescriptor,
  signUploadReceipt,
  verifyUploadReceipt,
} = require('../src/services/pendingUploadService');

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('durable pending upload receipts', () => {
  beforeEach(() => jest.clearAllMocks());

  test('binds a signed receipt to its owner and exact asset', () => {
    const descriptor = createPendingDescriptor(USER_ID);
    const upload = {
      ...descriptor,
      url: 'https://res.cloudinary.com/demo/image/upload/example.webp',
    };
    const token = signUploadReceipt(upload);

    expect(verifyUploadReceipt(token, {
      userId: USER_ID,
      url: upload.url,
      publicId: upload.publicId,
    })).toEqual({
      id: upload.id,
      userId: USER_ID,
      url: upload.url,
      publicId: upload.publicId,
    });
    expect(() => verifyUploadReceipt(token, { userId: 'another-user' }))
      .toThrow('Invalid image upload receipt');
  });

  test('atomically consumes the durable row before an image is attached', async () => {
    const receipt = {
      id: 'upload-1',
      userId: USER_ID,
      url: 'https://res.cloudinary.com/demo/image/upload/one.webp',
      publicId: 'reclaim/items/upload-1',
    };
    const tx = {
      pendingUpload: {
        findMany: jest.fn().mockResolvedValue([{
          id: receipt.id,
          url: receipt.url,
          publicId: receipt.publicId,
        }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(consumePendingUploads(tx, USER_ID, [receipt])).resolves.toEqual([receipt]);
    expect(tx.pendingUpload.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: [receipt.id] }, userId: USER_ID }),
    }));
  });

  test('rejects an expired, missing, or replayed durable row', async () => {
    const receipt = {
      id: 'used-upload',
      userId: USER_ID,
      url: 'https://res.cloudinary.com/demo/image/upload/used.webp',
      publicId: 'reclaim/items/used-upload',
    };
    const tx = {
      pendingUpload: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
    };

    await expect(consumePendingUploads(tx, USER_ID, [receipt])).rejects.toMatchObject({
      status: 409,
      code: 'UPLOAD_ALREADY_USED',
    });
    expect(tx.pendingUpload.deleteMany).not.toHaveBeenCalled();
  });

  test('keeps failed external deletions durable for a later retry', async () => {
    prisma.pendingUpload.findMany.mockResolvedValue([{
      id: 'cleanup-1',
      publicId: 'reclaim/items/cleanup-1',
    }]);
    prisma.pendingUpload.updateMany.mockResolvedValue({ count: 1 });
    deleteFromCloudinary.mockResolvedValue(false);

    await expect(cleanupPendingUploads({ ids: ['cleanup-1'] })).resolves.toEqual({
      candidates: 1,
      deleted: 0,
      failed: 1,
    });
    expect(prisma.pendingUpload.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { cleanupClaimedAt: null },
    }));
    expect(prisma.pendingUpload.deleteMany).not.toHaveBeenCalled();
  });

  test('deletes the durable cleanup row only after the asset is gone', async () => {
    prisma.pendingUpload.findMany.mockResolvedValue([{
      id: 'cleanup-2',
      publicId: 'reclaim/items/cleanup-2',
    }]);
    prisma.pendingUpload.updateMany.mockResolvedValue({ count: 1 });
    prisma.pendingUpload.deleteMany.mockResolvedValue({ count: 1 });
    deleteFromCloudinary.mockResolvedValue(true);

    await expect(cleanupPendingUploads({ ids: ['cleanup-2'] })).resolves.toEqual({
      candidates: 1,
      deleted: 1,
      failed: 0,
    });
    expect(prisma.pendingUpload.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'cleanup-2' }),
    }));
  });
});
