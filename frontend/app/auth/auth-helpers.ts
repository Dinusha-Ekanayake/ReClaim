const INTERNAL_ORIGIN = 'https://reclaim.internal';

function containsControlCharacter(value: string) {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function validateNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (containsControlCharacter(value)) return null;

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN || parsed.username || parsed.password) return null;
    if (parsed.pathname === '/auth' || parsed.pathname.startsWith('/auth/')) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function nextDestination(value: string | null | undefined, fallback = '/dashboard') {
  return validateNextPath(value) ?? fallback;
}

export function authHref(path: '/auth/login' | '/auth/register', next: string | null | undefined) {
  const validated = validateNextPath(next);
  return validated ? `${path}?next=${encodeURIComponent(validated)}` : path;
}

export function sameOriginResetPath(value: string | null | undefined): string | null {
  if (!value || typeof window === 'undefined') return null;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || parsed.pathname !== '/auth/reset-password') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function sameOriginVerificationPath(value: string | null | undefined): string | null {
  if (!value || typeof window === 'undefined') return null;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || parsed.pathname !== '/auth/verify-email') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
