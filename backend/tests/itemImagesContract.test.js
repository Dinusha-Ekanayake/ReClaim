const express = require('express');
const request = require('supertest');

jest.mock('../src/controllers/itemsController', () => ({
  list: jest.fn((req, res) => res.json({ items: [] })),
  getOne: jest.fn((req, res) => res.json({ id: req.params.id })),
  create: jest.fn((req, res) => res.status(201).json(req.body)),
  update: jest.fn((req, res) => res.json(req.body)),
  remove: jest.fn((req, res) => res.status(204).send()),
  updateStatus: jest.fn((req, res) => res.json(req.body)),
}));
jest.mock('../src/middleware/auth', () => ({
  authenticate(req, res, next) {
    req.user = { id: 'current-user', role: 'USER' };
    next();
  },
  optionalAuth(req, res, next) { next(); },
}));
jest.mock('../src/services/pendingUploadService', () => ({
  verifyUploadReceipt(token, expected) {
    if (!token || !expected.url || !expected.publicId) throw new Error('Invalid image upload receipt');
    return { id: token, userId: expected.userId, url: expected.url, publicId: expected.publicId };
  },
}));

const itemRoutes = require('../src/routes/items');

const ITEM_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_ID = '22222222-2222-4222-8222-222222222222';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemRoutes);
  return app;
}

describe('ordered item image update contract', () => {
  test('accepts a complete ordered list mixing retained and newly uploaded images', async () => {
    const images = [
      { id: IMAGE_ID },
      {
        url: 'https://res.cloudinary.com/demo/image/upload/new.webp',
        publicId: 'reclaim/items/new-upload',
        uploadToken: 'signed-upload-receipt-token',
      },
    ];
    const response = await request(createTestApp())
      .put(`/api/items/${ITEM_ID}`)
      .send({ images });

    expect(response.status).toBe(200);
    expect(response.body.images).toEqual(images);
  });

  test('accepts an empty list as removal of every image', async () => {
    const response = await request(createTestApp())
      .put(`/api/items/${ITEM_ID}`)
      .send({ images: [] });

    expect(response.status).toBe(200);
    expect(response.body.images).toEqual([]);
  });

  test('rejects mixing an existing id with upload fields in one entry', async () => {
    const response = await request(createTestApp())
      .put(`/api/items/${ITEM_ID}`)
      .send({
        images: [{
          id: IMAGE_ID,
          url: 'https://res.cloudinary.com/demo/image/upload/new.webp',
          publicId: 'reclaim/items/new-upload',
          uploadToken: 'signed-upload-receipt-token',
        }],
      });

    expect(response.status).toBe(400);
  });

  test('rejects duplicate retained images', async () => {
    const response = await request(createTestApp())
      .put(`/api/items/${ITEM_ID}`)
      .send({ images: [{ id: IMAGE_ID }, { id: IMAGE_ID }] });

    expect(response.status).toBe(400);
  });
});
