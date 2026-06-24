// ─── Environment Validation ─────────────────────────────────────────────────
// Fail fast at boot if required configuration is missing, rather than crashing
// later at the first request that needs it.

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

// Optional but feature-gating: warn (don't crash) when absent.
const OPTIONAL_FEATURES = {
  OPENAI_API_KEY: 'AI embedding matching (graceful fallback to keyword matching)',
  CLOUDINARY_CLOUD_NAME: 'image uploads',
  CLOUDINARY_API_KEY: 'image uploads',
  CLOUDINARY_API_SECRET: 'image uploads',
};

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());

  if (missing.length) {
    console.error(
      `\n❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `   Set them in backend/.env (see .env.example) before starting the server.\n`
    );
    process.exit(1);
  }

  // Guard against deploying with weak/placeholder secrets in production.
  if (process.env.NODE_ENV === 'production') {
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
      if (process.env[key].length < 32) {
        console.error(`\n❌ ${key} is too short for production (need ≥ 32 chars).\n`);
        process.exit(1);
      }
    }
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      console.error('\n❌ JWT_SECRET and JWT_REFRESH_SECRET must be different.\n');
      process.exit(1);
    }
  }

  for (const [key, feature] of Object.entries(OPTIONAL_FEATURES)) {
    if (!process.env[key]) {
      console.warn(`⚠️  ${key} not set — ${feature} disabled.`);
    }
  }
}

module.exports = { validateEnv };
