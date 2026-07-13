const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

const REFRESH_COOKIE = 'reclaim_refresh';
const ACCESS_COOKIE = 'reclaim_access';

const digestToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/auth',
});

const accessCookieOptions = () => ({ ...refreshCookieOptions(), path: '/' });

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
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m', algorithm: 'HS256' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: digestToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(jwt.decode(refreshToken).exp * 1000),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user, accessToken });
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

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.refreshToken.create({
      data: {
        token: digestToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(jwt.decode(refreshToken).exp * 1000),
      },
    });

    const { password: _, ...safeUser } = user;
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: safeUser, accessToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = requestRefreshToken(req);
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
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
      await tx.refreshToken.delete({ where: { id: stored.id } });
      await tx.refreshToken.create({
        data: {
          token: digestToken(tokens.refreshToken),
          userId: decoded.userId,
          expiresAt: new Date(jwt.decode(tokens.refreshToken).exp * 1000),
        },
      });
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
  const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((value) => value.trim());
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
