const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const prisma = require('./lib/prisma');
const { configuredFrontendOrigins } = require('./config/origins');

// ─── App Factory ────────────────────────────────────────────────────────────
// Builds and returns the configured Express app WITHOUT starting a listener,
// so it can be imported by tests (supertest) and by the HTTP/Socket.io server.
function createApp() {
  const app = express();

  // Behind a proxy (Render/Vercel) so rate-limit & req.ip work correctly.
  app.set('trust proxy', 1);

  // ─── Security & Middleware ──────────────────────────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const allowedOrigins = configuredFrontendOrigins();

  app.use(cors({
    origin(origin, cb) {
      // Allow non-browser clients (no Origin header) and whitelisted origins.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // API responses are private by default. Optional-auth endpoints can contain
  // owner/moderator-only fields and must never be replayed from a shared proxy.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    res.vary('Authorization');
    res.vary('Cookie');
    next();
  });

  // Cookie-authenticated mutations must never be accepted from a cross-site browser.
  app.use((req, res, next) => {
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!safeMethod && req.headers['sec-fetch-site'] === 'cross-site' && !allowedOrigins.includes(req.headers.origin)) {
      return res.status(403).json({ error: 'Cross-site request rejected' });
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb', parameterLimit: 100 }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // ─── Health Checks ──────────────────────────────────────────────────────────
  // Keep liveness/readiness outside the public API limiter. Platform probes must
  // remain reliable during traffic spikes and should not consume user quota.
  app.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'ReClaim API' });
  });
  let readinessResult = null;
  let readinessCheckedAt = 0;
  let readinessPromise = null;
  app.get('/api/health/ready', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const now = Date.now();
    if (!readinessResult || now - readinessCheckedAt >= 5_000) {
      if (!readinessPromise) {
        readinessPromise = prisma.$queryRaw`SELECT 1`
          .then(() => ({ status: 'ready', database: 'connected' }))
          .catch(() => ({ status: 'unavailable', database: 'disconnected' }))
          .then((result) => {
            readinessResult = result;
            readinessCheckedAt = Date.now();
            return result;
          })
          .finally(() => { readinessPromise = null; });
      }
      await readinessPromise;
    }
    const response = { ...readinessResult, timestamp: new Date().toISOString() };
    res.status(readinessResult.status === 'ready' ? 200 : 503).json(response);
  });

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // don't penalize successful logins
    message: { error: 'Too many auth attempts, please try again later.' },
  });
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many accounts created from this address. Please try again later.' },
  });
  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many messages submitted. Please try again later.' },
  });
  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many password reset attempts. Please try again later.' },
  });

  app.use('/api/', limiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth/refresh', loginLimiter);
  app.use('/api/contact', contactLimiter);
  app.use('/api/auth/forgot-password', passwordResetLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);
  app.use('/api/auth/resend-verification', passwordResetLimiter);

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api', routes);

  // ─── 404 + Error Handler ────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
