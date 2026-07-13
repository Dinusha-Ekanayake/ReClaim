const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendEmailVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/tokenService');
const { configuredFrontendOrigins } = require('../config/origins');

const REFRESH_COOKIE = 'reclaim_refresh';
const ACCESS_COOKIE = 'reclaim_access';
const MAX_ACTIVE_SESSIONS = 10;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const digestToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function frontendOrigin() {
  return configuredFrontendOrigins()[0];
}

function newEmailVerification(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    record: {
      tokenHash: digestToken(token),
      userId,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
    // Fragments are never sent in HTTP requests, keeping bearer tokens out of
    // CDN, proxy, and access logs.
    url: `${frontendOrigin()}/auth/verify-email#token=${encodeURIComponent(token)}`,
  };
}

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // The web app calls the API through its same-origin Next.js proxy. Lax keeps
  // refresh cookies first-party and prevents cross-site POSTs from sending them.
  sameSite: 'lax',
  path: '/api/auth',
});

const accessCookieOptions = () => ({ ...refreshCookieOptions(), path: '/api' });

function setRefreshCookie(res, token) {
  const decoded = jwt.decode(token);
  const maxAge = Math.max(0, decoded.exp * 1000 - Date.now());
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions(), maxAge });
}

function setAccessCookie(res, token) {
  const decoded = jwt.decode(token);
  const maxAge = Math.max(0, decoded.exp * 1000 - Date.now());
  res.cookie(ACCESS_COOKIE, token, { ...accessCookieOptions(), maxAge });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

function setAuthCookies(res, accessToken, refreshToken) {
  setAccessCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
  clearRefreshCookie(res);
}

exports.clearAuthCookies = clearAuthCookies;

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

function requestRefreshToken(req) {
  return getCookie(req, REFRESH_COOKIE) || req.body?.refreshToken;
}

const generateTokens = (userId) => {
  const accessToken = signAccessToken(userId);
  // A random JWT ID keeps simultaneous sessions unique even though JWT
  // timestamps have one-second precision.
  const refreshToken = signRefreshToken(userId, crypto.randomUUID());
  return { accessToken, refreshToken };
};

// Kept exported so session-token invariants can be covered without a database.
exports.generateTokens = generateTokens;

async function storeRefreshToken(tx, userId, refreshToken) {
  const now = new Date();
  await tx.refreshToken.deleteMany({ where: { userId, expiresAt: { lte: now } } });
  await tx.refreshToken.create({
    data: {
      token: digestToken(refreshToken),
      userId,
      expiresAt: new Date(jwt.decode(refreshToken).exp * 1000),
    },
  });

  const staleSessions = await tx.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_ACTIVE_SESSIONS,
    select: { id: true },
  });
  if (staleSessions.length) {
    await tx.refreshToken.deleteMany({
      where: { id: { in: staleSessions.map(session => session.id) } },
    });
  }
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
      });
      const verification = newEmailVerification(user.id);
      await tx.emailVerificationToken.create({ data: verification.record });
      return { user, verification };
    });

    let emailSent = false;
    try {
      emailSent = await sendEmailVerificationEmail({
        to: result.user.email,
        name: result.user.name,
        verificationUrl: result.verification.url,
      });
    } catch (emailError) {
      console.error('Verification email delivery failed:', emailError.message);
    }

    res.status(201).json({
      message: emailSent
        ? 'Account created. Check your email to verify it before signing in.'
        : 'Account created. Verification email is unavailable; request a new link to continue.',
      requiresVerification: true,
      emailSent,
      ...(process.env.NODE_ENV !== 'production' && !emailSent
        ? { devVerificationUrl: result.verification.url }
        : {}),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBanned) return res.status(403).json({ error: 'Account banned', reason: user.banReason });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.$transaction(async (tx) => {
      await storeRefreshToken(tx, user.id, refreshToken);
    });

    const { password: _, ...safeUser } = user;
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: safeUser, accessToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res, next) => {
  try {
    const tokenHash = digestToken(req.body.token);
    const verification = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, isBanned: true } } },
    });
    if (!verification || verification.expiresAt <= new Date() || verification.user.isBanned) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired' });
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationToken.deleteMany({
        where: { id: verification.id, expiresAt: { gt: new Date() } },
      });
      if (claimed.count !== 1) {
        const error = new Error('This verification link is invalid or has expired');
        error.status = 400;
        throw error;
      }
      await tx.user.update({
        where: { id: verification.userId },
        data: { isVerified: true },
      });
      await tx.emailVerificationToken.deleteMany({ where: { userId: verification.userId } });
    });

    // Verification links are bearer credentials that can be forwarded. Never
    // turn one into a browser session: doing so could silently switch a victim
    // into another person's account (login CSRF/account confusion).
    res.json({ message: 'Email verified. Sign in to continue.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res, next) => {
  const response = { message: 'If the account needs verification, a new link will be sent.' };
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: 'Verification email is temporarily unavailable' });
    }
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
      select: { id: true, name: true, email: true, isVerified: true, isBanned: true },
    });
    if (!user || user.isVerified || user.isBanned) return res.status(202).json(response);

    const verification = newEmailVerification(user.id);
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
      prisma.emailVerificationToken.create({ data: verification.record }),
    ]);
    try {
      const sent = await sendEmailVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: verification.url,
      });
      if (!sent && process.env.NODE_ENV !== 'production') response.devVerificationUrl = verification.url;
    } catch (emailError) {
      console.error('Verification email delivery failed:', emailError.message);
    }
    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  const response = { message: 'If an account exists for that email, a reset link will be sent.' };
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: 'Password reset email is temporarily unavailable' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
      select: { id: true, name: true, email: true, isBanned: true },
    });
    if (!user || user.isBanned) return res.status(202).json(response);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = digestToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } }),
    ]);

    const resetUrl = `${frontendOrigin()}/auth/reset-password#token=${encodeURIComponent(rawToken)}`;
    try {
      const sent = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
      if (!sent && process.env.NODE_ENV !== 'production') response.devResetUrl = resetUrl;
    } catch (emailError) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      console.error('Password reset email delivery failed:', emailError.message);
    }

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const tokenHash = digestToken(req.body.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const password = await bcrypt.hash(req.body.password, 12);
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        const error = new Error('This reset link is invalid or has expired');
        error.status = 400;
        throw error;
      }
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password, isVerified: true },
      });
      await tx.refreshToken.deleteMany({ where: { userId: resetToken.userId } });
      await tx.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId, id: { not: resetToken.id } },
      });
    });

    clearAuthCookies(res);
    res.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = requestRefreshToken(req);
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const digest = digestToken(refreshToken);
    // Raw-token fallback supports sessions issued before refresh tokens were hashed.
    const stored = await prisma.refreshToken.findFirst({
      where: { OR: [{ token: digest }, { token: refreshToken }] },
      include: { user: { select: { id: true, isBanned: true } } },
    });
    if (!stored || stored.expiresAt < new Date()) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    if (stored.userId !== decoded.userId || stored.user.isBanned) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const tokens = generateTokens(decoded.userId);

    // Rotate refresh token
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.deleteMany({
        where: { id: stored.id, token: stored.token },
      });
      if (claimed.count !== 1) {
        const error = new Error('Invalid or expired refresh token');
        error.status = 401;
        throw error;
      }
      await storeRefreshToken(tx, decoded.userId, tokens.refreshToken);
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = requestRefreshToken(req);
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { OR: [{ token: digestToken(refreshToken) }, { token: refreshToken }] },
      });
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.requireTrustedOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  const allowed = configuredFrontendOrigins();
  if (!allowed.includes(origin)) return res.status(403).json({ error: 'Origin not allowed' });
  next();
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        role: true, phone: true, showPhone: true,
        bio: true, location: true, isVerified: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
