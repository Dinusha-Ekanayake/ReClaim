function parseFrontendOrigins(value = 'http://localhost:3000', { requireHttps = false } = {}) {
  const entries = value.split(',').map(entry => entry.trim()).filter(Boolean);
  if (!entries.length || entries.length > 10) {
    throw new Error('FRONTEND_URL must contain between 1 and 10 origins');
  }

  const origins = entries.map((entry) => {
    let url;
    try {
      url = new URL(entry);
    } catch {
      throw new Error('FRONTEND_URL contains an invalid URL');
    }
    if (
      !['http:', 'https:'].includes(url.protocol)
      || (requireHttps && url.protocol !== 'https:')
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) {
      throw new Error(`FRONTEND_URL contains an invalid origin: ${entry}`);
    }
    return url.origin;
  });

  if (new Set(origins).size !== origins.length) {
    throw new Error('FRONTEND_URL contains duplicate origins');
  }
  return origins;
}

function configuredFrontendOrigins() {
  return parseFrontendOrigins(process.env.FRONTEND_URL || 'http://localhost:3000', {
    requireHttps: process.env.NODE_ENV === 'production',
  });
}

module.exports = { configuredFrontendOrigins, parseFrontendOrigins };
