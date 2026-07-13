const request = require('supertest');
const { createApp } = require('../src/app');

describe('health endpoints', () => {
  test('liveness probes do not consume or hit the public API rate limit', async () => {
    const app = createApp();
    let lastResponse;

    for (let index = 0; index < 205; index += 1) {
      lastResponse = await request(app).get('/api/health');
      expect(lastResponse.status).toBe(200);
    }

    expect(lastResponse.headers['ratelimit-limit']).toBeUndefined();
    expect(lastResponse.headers['cache-control']).toBe('no-store');
  });
});
