function boundedInteger(value, { name, min, max }) {
  if (value === undefined || value === '') return null;
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function configuredDatabaseUrl(value, settings = {}) {
  if (!value) return value;
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return value;

  const connectionLimit = boundedInteger(
    settings.connectionLimit ?? process.env.DATABASE_CONNECTION_LIMIT,
    { name: 'DATABASE_CONNECTION_LIMIT', min: 1, max: 50 },
  );
  const poolTimeout = boundedInteger(
    settings.poolTimeout ?? process.env.DATABASE_POOL_TIMEOUT_SECONDS,
    { name: 'DATABASE_POOL_TIMEOUT_SECONDS', min: 1, max: 120 },
  );

  if (connectionLimit !== null) url.searchParams.set('connection_limit', String(connectionLimit));
  if (poolTimeout !== null) url.searchParams.set('pool_timeout', String(poolTimeout));
  return url.toString();
}

module.exports = { configuredDatabaseUrl };
