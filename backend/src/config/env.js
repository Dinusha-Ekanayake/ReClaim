// Fail fast at boot if required configuration is missing instead of failing
// later on the first request that needs it.

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const PRODUCTION_REQUIRED = [
  'DIRECT_URL',
  'FRONTEND_URL',
  'UPLOAD_RECEIPT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
];

const OPTIONAL_FEATURES = {
  OPENAI_API_KEY: 'AI embedding matching (keyword matching remains available)',
  CLOUDINARY_CLOUD_NAME: 'image uploads',
  CLOUDINARY_API_KEY: 'image uploads',
  CLOUDINARY_API_SECRET: 'image uploads',
  RESEND_API_KEY: 'email verification and password-reset delivery',
};
const { parseFrontendOrigins } = require('./origins');

function fail(message) {
  console.error(`\nConfiguration error: ${message}\n`);
  process.exit(1);
}

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const required = isProduction ? [...REQUIRED, ...PRODUCTION_REQUIRED] : REQUIRED;
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) {
    fail(`Missing required environment variables: ${missing.join(', ')}. See backend/.env.example.`);
  }

  if (isProduction) {
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'UPLOAD_RECEIPT_SECRET']) {
      const value = process.env[key];
      if (value.length < 32 || /(replace|change|example|password)/i.test(value)) {
        fail(`${key} must be a non-placeholder random value of at least 32 characters.`);
      }
    }
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      fail('JWT_SECRET and JWT_REFRESH_SECRET must be different.');
    }
    if (new Set([
      process.env.JWT_SECRET,
      process.env.JWT_REFRESH_SECRET,
      process.env.UPLOAD_RECEIPT_SECRET,
    ]).size !== 3) {
      fail('JWT_SECRET, JWT_REFRESH_SECRET, and UPLOAD_RECEIPT_SECRET must all be different.');
    }

    try {
      process.env.FRONTEND_URL = parseFrontendOrigins(process.env.FRONTEND_URL, { requireHttps: true }).join(',');
    } catch (error) {
      fail(`${error.message}. Use comma-separated HTTPS origins without paths or credentials.`);
    }

    for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
      if (!/^postgres(?:ql)?:\/\//i.test(process.env[key])) {
        fail(`${key} must be a PostgreSQL connection URL.`);
      }
    }
  }

  for (const [key, feature] of Object.entries(OPTIONAL_FEATURES)) {
    if (!process.env[key]) console.warn(`${key} is not set; ${feature} is disabled.`);
  }
}

module.exports = { validateEnv };
