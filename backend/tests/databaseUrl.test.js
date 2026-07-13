const { configuredDatabaseUrl } = require('../src/config/databaseUrl');

describe('database pool URL configuration', () => {
  test('overrides an undersized runtime pool without exposing or changing credentials', () => {
    const configured = new URL(configuredDatabaseUrl(
      'postgresql://member:secret@pool.example.test:6543/reclaim?pgbouncer=true&connection_limit=1',
      { connectionLimit: 5, poolTimeout: 30 },
    ));

    expect(configured.username).toBe('member');
    expect(configured.password).toBe('secret');
    expect(configured.searchParams.get('pgbouncer')).toBe('true');
    expect(configured.searchParams.get('connection_limit')).toBe('5');
    expect(configured.searchParams.get('pool_timeout')).toBe('30');
  });

  test.each([
    [{ connectionLimit: 0 }, 'DATABASE_CONNECTION_LIMIT'],
    [{ connectionLimit: 51 }, 'DATABASE_CONNECTION_LIMIT'],
    [{ poolTimeout: 'not-a-number' }, 'DATABASE_POOL_TIMEOUT_SECONDS'],
  ])('rejects unsafe settings', (settings, expectedName) => {
    expect(() => configuredDatabaseUrl('postgresql://localhost/reclaim', settings))
      .toThrow(expectedName);
  });
});
