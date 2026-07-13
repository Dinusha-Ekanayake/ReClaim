const jwt = require('jsonwebtoken');

const TOKEN_ISSUER = 'reclaim-api';
const ACCESS_AUDIENCE = 'reclaim-web';
const REFRESH_AUDIENCE = 'reclaim-refresh';

function assertTokenPayload(payload, purpose) {
  if (!payload ||
      typeof payload !== 'object' ||
      payload.purpose !== purpose ||
      typeof payload.userId !== 'string' ||
      payload.sub !== payload.userId ||
      typeof payload.exp !== 'number') {
    throw new jwt.JsonWebTokenError(`Invalid ${purpose} token`);
  }
  return payload;
}

function signAccessToken(userId) {
  return jwt.sign(
    { userId, purpose: 'access' },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      algorithm: 'HS256',
      issuer: TOKEN_ISSUER,
      audience: ACCESS_AUDIENCE,
      subject: userId,
    },
  );
}

function signRefreshToken(userId, jwtid) {
  return jwt.sign(
    { userId, purpose: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256',
      issuer: TOKEN_ISSUER,
      audience: REFRESH_AUDIENCE,
      subject: userId,
      jwtid,
    },
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: ACCESS_AUDIENCE,
  });
  return assertTokenPayload(payload, 'access');
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: REFRESH_AUDIENCE,
  });
  return assertTokenPayload(payload, 'refresh');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
