const TEST_USER = { email: 'test@example.com', password: 'Test1234', name: 'Test User' };
const describeWithDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Items API', () => {
  let request;
  let bcrypt;
  let app;
  let prisma;
  let token;
  let createdItemId;

  beforeAll(async () => {
    // Never allow integration tests to mutate the regular development/production database.
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    request = require('supertest');
    bcrypt = require('bcryptjs');
    const { createApp } = require('../src/app');
    prisma = require('../src/lib/prisma');
    app = createApp();
    // Ensure the test user exists (idempotent).
    const hashed = await bcrypt.hash(TEST_USER.password, 12);
    await prisma.user.upsert({
      where: { email: TEST_USER.email },
      update: {},
      create: { email: TEST_USER.email, password: hashed, name: TEST_USER.name },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    token = res.body.accessToken;
  });

  afterAll(async () => {
    if (createdItemId) {
      await prisma.item.deleteMany({ where: { id: createdItemId } });
    }
    await prisma.$disconnect();
  });

  it('logs in the test user and returns an access token', () => {
    expect(token).toBeTruthy();
  });

  it('should create a new item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'LOST',
        title: 'Lost Wallet',
        description: 'Black leather wallet lost near the main library entrance.',
        category: 'Bags & Wallets',
        color: 'Black',
        locationLabel: 'Library',
        dateLostFound: new Date().toISOString(),
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Lost Wallet');
    createdItemId = res.body.id;
  });

  it('should reject an item with a too-short description', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'LOST',
        title: 'Lost Keys',
        description: 'short',
        category: 'Keys',
        locationLabel: 'Gym',
        dateLostFound: new Date().toISOString(),
      });

    expect(res.statusCode).toBe(400);
  });

  it('should reject unauthenticated item creation', async () => {
    const res = await request(app).post('/api/items').send({ type: 'LOST' });
    expect(res.statusCode).toBe(401);
  });
});
