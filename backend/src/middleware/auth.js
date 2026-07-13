const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function cookieToken(req) {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('reclaim_access='));
  return cookie ? decodeURIComponent(cookie.slice('reclaim_access='.length)) : null;
}

function requestToken(req) {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken(req);
}

// ─── Authenticate User ────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = requestToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, name: true, role: true,
        avatarUrl: true, isVerified: true, isBanned: true,
      },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isBanned) return res.status(403).json({ error: 'Account banned' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Optional Auth (for public routes that benefit from knowing the user) ─────
const optionalAuth = async (req, res, next) => {
  try {
    const token = requestToken(req);
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, isBanned: true },
    });

    req.user = user && !user.isBanned ? user : null;
    next();
  } catch {
    next();
  }
};

// ─── Require Admin ────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ─── Require Super Admin ──────────────────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, requireAdmin, requireSuperAdmin };
