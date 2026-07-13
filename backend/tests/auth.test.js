const jwt = require('jsonwebtoken');

jest.mock('../src/lib/prisma', () => ({}));

process.env.JWT_SECRET = 'access-secret-that-is-long-enough-for-tests';
process.env.JWT_REFRESH_SECRET = 'refresh-secret-that-is-different-for-tests';

const { generateTokens } = require('../src/controllers/authController');

describe('session token generation', () => {
  test('creates distinct refresh sessions for the same user in the same second', () => {
    const first = generateTokens('same-user').refreshToken;
    const second = generateTokens('same-user').refreshToken;
    const firstPayload = jwt.verify(first, process.env.JWT_REFRESH_SECRET);
    const secondPayload = jwt.verify(second, process.env.JWT_REFRESH_SECRET);

    expect(first).not.toBe(second);
    expect(firstPayload.jti).toBeTruthy();
    expect(secondPayload.jti).toBeTruthy();
    expect(firstPayload.jti).not.toBe(secondPayload.jti);
  });
});
