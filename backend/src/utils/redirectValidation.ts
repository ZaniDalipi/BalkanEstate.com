/**
 * Redirect URL Validation Utility
 *
 * Validates redirect URLs against an allowlist of trusted domains
 * to prevent open redirect attacks.
 */

const ALLOWED_REDIRECT_DOMAINS: string[] = [
  'balkanestateai.com',
  'www.balkanestateai.com',
  'api.balkanestateai.com',
  'balkanestate.com',
  'www.balkanestate.com',
];

/**
 * Build the full allowlist including configured FRONTEND_URL hostname.
 * Called at validation time so env vars are always up-to-date.
 */
function getAllowedDomains(): string[] {
  const domains = [...ALLOWED_REDIRECT_DOMAINS];

  // Include the configured FRONTEND_URL hostname
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    try {
      const parsed = new URL(frontendUrl);
      if (!domains.includes(parsed.hostname)) {
        domains.push(parsed.hostname);
      }
    } catch {
      // Invalid FRONTEND_URL, skip
    }
  }

  // Include localhost variants for development
  if (process.env.NODE_ENV !== 'production') {
    domains.push('localhost', '127.0.0.1');
  }

  return domains;
}

/**
 * Validate that a redirect URL points to a trusted domain.
 * Returns the URL if valid, or the fallback URL otherwise.
 */
export function validateRedirectUrl(url: string, fallbackUrl?: string): string {
  const safeFallback = fallbackUrl || getFrontendUrl();

  try {
    const parsed = new URL(url);
    const allowedDomains = getAllowedDomains();

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return safeFallback;
    }

    // Check if the hostname matches any allowed domain
    const isAllowed = allowedDomains.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
    });

    if (!isAllowed) {
      return safeFallback;
    }

    return url;
  } catch {
    // If URL parsing fails, return fallback
    return safeFallback;
  }
}

/**
 * Build a safe redirect URL from the configured FRONTEND_URL and a path.
 * Ensures the resulting URL always points to the trusted frontend domain.
 */
export function buildFrontendRedirectUrl(path: string, queryParams?: Record<string, string>): string {
  const baseUrl = getFrontendUrl();

  // Ensure path starts with /
  const safePath = path.startsWith('/') ? path : `/${path}`;

  const url = new URL(safePath, baseUrl);

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Get the configured frontend URL with a safe default.
 */
export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

/**
 * Validate that a hostname-based redirect (e.g. HTTPS enforcement)
 * only redirects to the same host. Prevents host header injection.
 */
export function buildSafeHttpsRedirect(req: { hostname: string; originalUrl: string }): string | null {
  const allowedDomains = getAllowedDomains();

  const isAllowed = allowedDomains.some(domain => {
    return req.hostname === domain || req.hostname.endsWith(`.${domain}`);
  });

  if (!isAllowed) {
    return null;
  }

  return `https://${req.hostname}${req.originalUrl}`;
}
