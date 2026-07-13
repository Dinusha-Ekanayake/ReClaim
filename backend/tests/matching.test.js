const { computeScore } = require('../src/services/matchingService');

const base = {
  title: 'Black leather wallet',
  description: 'Small wallet with a silver zip',
  category: 'Bags & Wallets',
  color: 'Black',
  brand: null,
  locationLat: 6.9271,
  locationLng: 79.8612,
  locationLabel: 'Colombo Fort',
  dateLostFound: new Date('2026-07-10T10:00:00Z'),
  embedding: null,
};

describe('matching score', () => {
  test('gives a strong score to equivalent reports', () => {
    const result = computeScore(base, { ...base, title: 'Found black leather wallet' });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.category).toBe(25);
  });

  test('does not award category points to a different category', () => {
    const result = computeScore(base, { ...base, category: 'Keys' });
    expect(result.breakdown.category).toBe(0);
  });
});
