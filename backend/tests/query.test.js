const { getPagination, paginationResult, enumQuery } = require('../src/utils/query');

describe('query helpers', () => {
  test('uses safe pagination defaults for malformed input', () => {
    expect(getPagination({ page: '-2', limit: 'nope' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  test('caps client-controlled limits', () => {
    expect(getPagination({ page: '3', limit: '10000' }, { defaultLimit: 12, maxLimit: 50 }))
      .toEqual({ page: 3, limit: 50, skip: 100 });
  });

  test('returns complete pagination metadata', () => {
    expect(paginationResult(41, 2, 20)).toEqual({
      total: 41, page: 2, limit: 20, pages: 3, hasNext: true, hasPrev: true,
    });
  });

  test('accepts only explicitly allowed enum values', () => {
    expect(enumQuery('ACTIVE', ['ACTIVE', 'CLOSED'])).toBe('ACTIVE');
    expect(enumQuery('DROP TABLE', ['ACTIVE', 'CLOSED'])).toBeUndefined();
  });
});
