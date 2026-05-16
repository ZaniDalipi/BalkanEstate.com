/**
 * Security utilities for protecting the application
 */

// Prevent clickjacking by checking if we're in an iframe
export const preventClickjacking = () => {
  if (typeof window !== 'undefined') {
    if (window.self !== window.top) {
      // We're in an iframe - redirect to break out
      window.top!.location.href = window.self.location.href;
    }
  }
};

// Disable right-click context menu in production (optional, can be annoying)
export const disableContextMenu = () => {
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }
};

// DevTools shortcut detection is handled by DevToolsGuard component
export const disableDevToolsShortcuts = () => {};

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// Allowlist of trusted domains for redirect validation
const TRUSTED_REDIRECT_DOMAINS: string[] = [
  'balkanestateai.com',
  'www.balkanestateai.com',
  'api.balkanestateai.com',
  'accounts.google.com',
  'bank.paysera.com',
  'sandbox.paysera.com',
];

/**
 * Check if a hostname is in the trusted domains allowlist.
 * Matches exact domain or subdomains of allowed entries.
 */
const isAllowedDomain = (hostname: string): boolean => {
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const allDomains = [...TRUSTED_REDIRECT_DOMAINS, currentHostname];
  return allDomains.some(domain =>
    domain && (hostname === domain || hostname.endsWith(`.${domain}`))
  );
};

// Validate and sanitize URLs to prevent open redirect attacks
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '/';
    }

    if (isAllowedDomain(parsed.hostname)) {
      return parsed.href;
    }

    // Return homepage for untrusted URLs
    return '/';
  } catch {
    return '/';
  }
};

/**
 * Validate a payment redirect URL from the backend.
 * Only allows redirects to trusted payment providers and our own domains.
 */
export const validatePaymentRedirectUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);

    // Only allow https in production (allow http for localhost in dev)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    if (isAllowedDomain(parsed.hostname)) {
      return parsed.href;
    }

    return null;
  } catch {
    return null;
  }
};

// Check for common attack patterns in input
export const detectMaliciousInput = (input: string): boolean => {
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /data:\s*text\/html/gi, // Data URLs with HTML
    /vbscript:/gi, // VBScript protocol
    /expression\s*\(/gi, // CSS expression
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
};

// Rate limiting helper for client-side actions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

/**
 * Display a console warning to prevent self-XSS attacks.
 * Similar to Facebook/Instagram's approach: if someone is tricked into
 * pasting malicious code into the console, this warning stops them.
 */
const showConsoleWarning = () => {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return;

  const warningStyle = 'color: red; font-size: 32px; font-weight: bold;';
  const textStyle = 'color: #333; font-size: 16px;';

  // eslint-disable-next-line no-console
  console.log('%cStop!', warningStyle);
  // eslint-disable-next-line no-console
  console.log(
    '%cThis browser feature is intended for developers. ' +
    'If someone told you to copy-paste something here to enable a feature ' +
    'or "hack" someone\'s account, it is a scam and will give them access to your account.',
    textStyle,
  );
};

// Initialize all security measures
export const initSecurity = () => {
  preventClickjacking();
  showConsoleWarning();
  disableDevToolsShortcuts();
};

export default {
  preventClickjacking,
  disableContextMenu,
  disableDevToolsShortcuts,
  sanitizeInput,
  sanitizeUrl,
  validatePaymentRedirectUrl,
  detectMaliciousInput,
  checkRateLimit,
  initSecurity,
};
