/**
 * Build a safe pagination object.
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
function paginate(total, page, limit) {
  return {
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/**
 * Strip sensitive fields from a user object before sending to client.
 * @param {object} user
 */
function safeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/**
 * Parse a boolean query param.
 * @param {string|undefined} val
 */
function parseBool(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

/**
 * Clamp a number between min and max.
 */
function clamp(n, min, max) {
  return Math.min(Math.max(Number(n), min), max);
}

module.exports = { paginate, safeUser, parseBool, clamp };
