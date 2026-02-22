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

// Disable common dev tools shortcuts in production
export const disableDevToolsShortcuts = () => {
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (Dev Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    });
  }
};

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// Validate and sanitize URLs to prevent open redirect attacks
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow same-origin URLs or specific trusted domains
    const trustedDomains = [
      window.location.hostname,
      'balkanestateai.com',
      'accounts.google.com',
    ];

    if (trustedDomains.some(domain => parsed.hostname.endsWith(domain))) {
      return parsed.href;
    }

    // Return homepage for untrusted URLs
    return '/';
  } catch {
    return '/';
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

// Initialize all security measures
export const initSecurity = () => {
  preventClickjacking();
  // Uncomment if you want to disable dev tools (can be annoying for power users)
  // disableDevToolsShortcuts();
  // disableContextMenu();
};

export default {
  preventClickjacking,
  disableContextMenu,
  disableDevToolsShortcuts,
  sanitizeInput,
  sanitizeUrl,
  detectMaliciousInput,
  checkRateLimit,
  initSecurity,
};
