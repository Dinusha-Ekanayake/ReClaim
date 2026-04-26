const request = require('supertest');
const { app } = require('../src/index');

describe('Items API', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234'
      });

    token = res.body.accessToken;
  });

  it('should create a new item', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'LOST',
        title: 'Lost Wallet',
        description: 'Black wallet',
        category: 'Accessories',
        color: 'Black',
        locationLabel: 'Library'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Lost Wallet');
  });
});