const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'access-token-secret-that-is-long-and-test-only';
process.env.JWT_REFRESH_SECRET = 'refresh-token-secret-that-is-distinct-and-test-only';
process.env.UPLOAD_RECEIPT_SECRET = 'upload-receipt-secret-that-is-distinct-and-test-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

jest.mock('../src/lib/prisma', () => ({}));
jest.mock('../src/services/cloudinaryService', () => ({
  deleteFromCloudinary: jest.fn(),
}));

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../src/utils/tokenService');
const {
  signUploadReceipt,
  verifyUploadReceipt,
} = require('../src/services/pendingUploadService');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const UPLOAD = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: USER_ID,
  url: 'https://res.cloudinary.com/demo/image/upload/separated.webp',
  publicId: 'reclaim/items/22222222-2222-4222-8222-222222222222',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

function signSessionLikeToken(secret, {
  purpose,
  issuer = 'reclaim-api',
  audience,
  jwtid,
}) {
  return jwt.sign(
    { userId: USER_ID, purpose },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: '5m',
      issuer,
      audience,
      subject: USER_ID,
      ...(jwtid ? { jwtid } : {}),
    },
  );
}

function signUploadLikeToken({
  purpose = 'item-upload',
  issuer = 'reclaim-api',
  audience = 'reclaim-upload',
} = {}) {
  return jwt.sign(
    {
      purpose,
      uploadId: UPLOAD.id,
      userId: USER_ID,
      url: UPLOAD.url,
      publicId: UPLOAD.publicId,
    },
    process.env.UPLOAD_RECEIPT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '5m',
      issuer,
      audience,
      subject: USER_ID,
      jwtid: UPLOAD.id,
    },
  );
}

describe('JWT purpose and key separation', () => {
  test('valid access, refresh, and upload tokens verify only in their intended domains', () => {
    const accessToken = signAccessToken(USER_ID);
    const refreshToken = signRefreshToken(USER_ID, 'refresh-session-1');
    const uploadToken = signUploadReceipt(UPLOAD);

    expect(verifyAccessToken(accessToken)).toMatchObject({
      purpose: 'access',
      userId: USER_ID,
      sub: USER_ID,
      iss: 'reclaim-api',
      aud: 'reclaim-web',
    });
    expect(verifyRefreshToken(refreshToken)).toMatchObject({
      purpose: 'refresh',
      userId: USER_ID,
      sub: USER_ID,
      iss: 'reclaim-api',
      aud: 'reclaim-refresh',
      jti: 'refresh-session-1',
    });
    expect(verifyUploadReceipt(uploadToken, {
      userId: USER_ID,
      url: UPLOAD.url,
      publicId: UPLOAD.publicId,
    })).toEqual({
      id: UPLOAD.id,
      userId: USER_ID,
      url: UPLOAD.url,
      publicId: UPLOAD.publicId,
    });
  });

  test('refresh tokens and upload receipts cannot verify as access tokens', () => {
    expect(() => verifyAccessToken(signRefreshToken(USER_ID, 'refresh-session-2'))).toThrow();
    expect(() => verifyAccessToken(signUploadReceipt(UPLOAD))).toThrow();
  });

  test('access tokens cannot verify as upload receipts', () => {
    expect(() => verifyUploadReceipt(signAccessToken(USER_ID)))
      .toThrow('An upload receipt is invalid or has expired');
  });

  test('access verification rejects a wrong purpose, issuer, or audience even with the access key', () => {
    const cases = [
      signSessionLikeToken(process.env.JWT_SECRET, {
        purpose: 'refresh',
        audience: 'reclaim-web',
      }),
      signSessionLikeToken(process.env.JWT_SECRET, {
        purpose: 'access',
        issuer: 'another-issuer',
        audience: 'reclaim-web',
      }),
      signSessionLikeToken(process.env.JWT_SECRET, {
        purpose: 'access',
        audience: 'another-audience',
      }),
    ];

    cases.forEach((token) => expect(() => verifyAccessToken(token)).toThrow());
  });

  test('refresh verification accepts only refresh-purpose tokens in its issuer and audience', () => {
    expect(verifyRefreshToken(signRefreshToken(USER_ID, 'refresh-session-3')))
      .toMatchObject({ purpose: 'refresh', jti: 'refresh-session-3' });

    const rejected = [
      signAccessToken(USER_ID),
      signUploadReceipt(UPLOAD),
      signSessionLikeToken(process.env.JWT_REFRESH_SECRET, {
        purpose: 'access',
        audience: 'reclaim-refresh',
        jwtid: 'forged-purpose',
      }),
      signSessionLikeToken(process.env.JWT_REFRESH_SECRET, {
        purpose: 'refresh',
        issuer: 'another-issuer',
        audience: 'reclaim-refresh',
        jwtid: 'forged-issuer',
      }),
      signSessionLikeToken(process.env.JWT_REFRESH_SECRET, {
        purpose: 'refresh',
        audience: 'another-audience',
        jwtid: 'forged-audience',
      }),
    ];

    rejected.forEach((token) => expect(() => verifyRefreshToken(token)).toThrow());
  });

  test('upload verification rejects a wrong purpose, issuer, or audience even with the upload key', () => {
    const cases = [
      signUploadLikeToken({ purpose: 'access' }),
      signUploadLikeToken({ issuer: 'another-issuer' }),
      signUploadLikeToken({ audience: 'another-audience' }),
    ];

    cases.forEach((token) => {
      expect(() => verifyUploadReceipt(token))
        .toThrow(/Invalid image upload receipt|upload receipt is invalid or has expired/);
    });
  });
});
