/**
 * Paddle Checkout Domain Configuration
 *
 * This file contains the list of approved domains for Paddle checkout.
 * Paddle requires each domain/subdomain to be submitted and approved before
 * checkout can be launched from that origin.
 *
 * IMPORTANT: Before going live, ensure each domain is approved in the Paddle dashboard:
 * https://vendors.paddle.com/checkout-settings
 *
 * Requirements for domain approval:
 * 1. Website must link to Terms of Service (/terms or /terms-of-service)
 * 2. Website must link to Privacy Policy (/privacy or /privacy-policy)
 * 3. Website must link to Refund Policy (/refund or /refund-policy)
 *
 * These legal pages must be accessible from the domain being approved.
 */

export interface PaddleDomainConfig {
  domain: string;
  environment: 'sandbox' | 'production';
  approved: boolean;
  description: string;
}

/**
 * List of domains configured for Paddle checkout
 *
 * IMPORTANT: Paddle only accepts bare domain names!
 * Format: "domain.com" (NO https://, NO www.)
 *
 * For www subdomains, submit them separately as "www.domain.com"
 * Each subdomain needs individual approval.
 *
 * Add your domains here and submit them for approval in the Paddle dashboard.
 * Mark approved: true once Paddle has approved the domain.
 */
export const PADDLE_APPROVED_DOMAINS: PaddleDomainConfig[] = [
  // Production domains - Submit to Paddle as: balkanestate.com
  {
    domain: 'balkanestate.com',
    environment: 'production',
    approved: false, // Update to true once approved by Paddle
    description: 'Main production domain - submit as: balkanestate.com',
  },
  // Production domains - Submit to Paddle as: balkanestateai.com
  {
    domain: 'balkanestateai.com',
    environment: 'production',
    approved: false, // Update to true once approved by Paddle
    description: 'AI branded production domain - submit as: balkanestateai.com',
  },

  // Development domains (sandbox only)
  {
    domain: 'localhost',
    environment: 'sandbox',
    approved: true, // Localhost is typically auto-approved for sandbox
    description: 'Local development',
  },
  {
    domain: 'localhost:3000',
    environment: 'sandbox',
    approved: true,
    description: 'Local development with port',
  },
  {
    domain: 'localhost:5173',
    environment: 'sandbox',
    approved: true,
    description: 'Vite dev server',
  },
];

/**
 * Legal page URLs required by Paddle for domain approval
 */
export const PADDLE_REQUIRED_LEGAL_PAGES = {
  termsOfService: {
    path: '/terms',
    alternativePaths: ['/terms-of-service', '/tos'],
    description: 'Terms of Service',
  },
  privacyPolicy: {
    path: '/privacy',
    alternativePaths: ['/privacy-policy'],
    description: 'Privacy Policy',
  },
  refundPolicy: {
    path: '/refund',
    alternativePaths: ['/refund-policy', '/refunds'],
    description: 'Refund Policy',
  },
};

/**
 * Check if the current domain is in the approved list
 */
export function isCurrentDomainApproved(): boolean {
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  return PADDLE_APPROVED_DOMAINS.some(
    (config) => config.approved && (config.domain === currentHost || currentHost.includes(config.domain.replace('*', '')))
  );
}

/**
 * Get the Paddle environment for the current domain
 */
export function getPaddleEnvironmentForDomain(): 'sandbox' | 'production' {
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  const domainConfig = PADDLE_APPROVED_DOMAINS.find(
    (config) => config.domain === currentHost || currentHost.includes(config.domain.replace('*', ''))
  );

  return domainConfig?.environment || 'sandbox';
}

/**
 * Get all legal page URLs for display
 */
export function getLegalPageUrls(baseUrl: string = ''): Record<string, string> {
  return {
    termsOfService: `${baseUrl}${PADDLE_REQUIRED_LEGAL_PAGES.termsOfService.path}`,
    privacyPolicy: `${baseUrl}${PADDLE_REQUIRED_LEGAL_PAGES.privacyPolicy.path}`,
    refundPolicy: `${baseUrl}${PADDLE_REQUIRED_LEGAL_PAGES.refundPolicy.path}`,
  };
}

/**
 * Domains to submit to Paddle for approval
 *
 * IMPORTANT FORMAT: Just the domain name, no https:// or www.
 *
 * Instructions:
 * 1. Go to https://vendors.paddle.com/checkout-settings
 * 2. Click "Add domain"
 * 3. Enter domain exactly as shown below (e.g., "balkanestate.com")
 * 4. Ensure your legal pages are accessible before submitting:
 *    - Terms of Service: /terms
 *    - Privacy Policy: /privacy
 *    - Refund Policy: /refund
 * 5. Wait for Paddle approval (usually 1-2 business days)
 *
 * NOTE: If you use www, you need to submit it separately as a subdomain
 */
export const DOMAINS_TO_SUBMIT = [
  'balkanestate.com',      // Submit exactly like this
  'balkanestateai.com',    // Submit exactly like this
];

export default {
  PADDLE_APPROVED_DOMAINS,
  PADDLE_REQUIRED_LEGAL_PAGES,
  isCurrentDomainApproved,
  getPaddleEnvironmentForDomain,
  getLegalPageUrls,
  DOMAINS_TO_SUBMIT,
};
