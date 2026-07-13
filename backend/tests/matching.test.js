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

  test.each([
    ['Sinhala', 'කළු පසුම්බිය', 'රිදී සිපරයක් සහිත කුඩා පසුම්බිය', 'කොළඹ කොටුව'],
    ['Tamil', 'கருப்பு பணப்பை', 'வெள்ளி சிப்புடன் சிறிய பணப்பை', 'கொழும்பு கோட்டை'],
  ])('preserves %s words when matching localized reports', (language, title, description, locationLabel) => {
    const localized = {
      ...base,
      title,
      description,
      locationLabel,
      locationLat: null,
      locationLng: null,
    };
    const result = computeScore(localized, { ...localized });

    expect(result.breakdown.keywords).toBe(25);
    expect(result.breakdown.location).toBe(10);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  test('treats zero latitude and longitude as valid coordinates', () => {
    const atOrigin = { ...base, locationLat: 0, locationLng: 0, locationLabel: 'First label' };
    const sameCoordinates = { ...atOrigin, locationLabel: 'Completely different label' };

    expect(computeScore(atOrigin, sameCoordinates).breakdown.location).toBe(20);
  });
});
