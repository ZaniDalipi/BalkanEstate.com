/**
 * Which admin requests need a fresh authenticator code. Pure, so the list is
 * tested on its own. Paths are relative to /api/admin.
 *
 *  - every delete
 *  - giving or removing roles (the role endpoint and the first super admin claim)
 *  - settings: system, site, alert emails, email templates, resetting the authenticator
 *  - subscriptions and payments: plans, listing limits, coupons and discount
 *    codes, residence passes and codes
 *
 * Changing a role through the general "edit user" form is checked in the
 * controller, since only the body says whether the role changes.
 */

const RULES: Array<{ methods: readonly string[]; pattern: RegExp }> = [
  // Roles
  { methods: ['PUT'], pattern: /^\/users\/[^/]+\/role$/ },
  { methods: ['POST'], pattern: /^\/super-admin\/claim$/ },
  // Settings
  { methods: ['PATCH', 'POST', 'PUT'], pattern: /^\/system-settings(\/reset)?$/ },
  { methods: ['PATCH', 'POST'], pattern: /^\/site-settings(\/.*)?$/ },
  { methods: ['PUT'], pattern: /^\/alert-settings$/ },
  { methods: ['PATCH', 'POST', 'PUT'], pattern: /^\/email-configs(\/[^/]+(\/(toggle|reset|duplicate))?|\/reset-all|\/sync-missing)?$/ },
  // Subscriptions and payments
  { methods: ['POST', 'PATCH', 'PUT'], pattern: /^\/subscriptions\// },
  { methods: ['POST', 'PATCH'], pattern: /^\/agencies\/[^/]+\/(subscription\/(activate|deactivate)|listing-limit|residence-allowance)$/ },
  { methods: ['PATCH'], pattern: /^\/users\/[^/]+\/listing-counter$/ },
  { methods: ['POST', 'PATCH'], pattern: /^\/discount-codes(\/.*)?$/ },
  { methods: ['POST', 'PATCH'], pattern: /^\/residences\/(codes(\/[^/]+)?|[^/]+\/(grant|building-limit))$/ },
  { methods: ['POST'], pattern: /^\/test-emails\/run-monthly-refresh$/ },
  { methods: ['POST'], pattern: /^\/featured-subscriptions\// },
];

export function adminStepUpRequired(method: string, path: string): boolean {
  const m = method.toUpperCase();
  if (m === 'DELETE') return true;
  const p = path.split('?')[0].replace(/\/+$/, '') || '/';
  return RULES.some((r) => r.methods.includes(m) && r.pattern.test(p));
}
