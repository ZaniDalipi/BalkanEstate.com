/**
 * Shared email template renderer.
 * Used by emailConfigController (admin preview/test) and emailService (actual sending)
 * so both render identically from the same EmailConfig document.
 *
 * Integrates with SiteSettings for global branding (company name, logo, support email, etc.)
 * so changes in admin are reflected across all emails.
 */
import EmailConfig, { IEmailConfig } from '../models/EmailConfig';
import SiteSettings, { ISiteSettings } from '../models/SiteSettings';

// Cache site settings for 5 minutes to avoid DB calls on every email
let _cachedSettings: ISiteSettings | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get site settings with caching. Falls back to hardcoded defaults if DB is unavailable.
 */
export async function getSiteSettingsForEmail(): Promise<ISiteSettings | null> {
  const now = Date.now();
  if (_cachedSettings && now < _cacheExpiry) {
    return _cachedSettings;
  }
  try {
    _cachedSettings = await SiteSettings.getSettings();
    _cacheExpiry = now + CACHE_TTL_MS;
    return _cachedSettings;
  } catch {
    return _cachedSettings; // return stale cache if DB fails
  }
}

/** Force-clear the cached settings (e.g. after admin updates). */
export function clearSiteSettingsCache(): void {
  _cachedSettings = null;
  _cacheExpiry = 0;
}

/**
 * Build a variables record from SiteSettings so templates can use
 * {{companyName}}, {{supportEmail}}, {{logoUrl}}, etc.
 */
export async function getSiteSettingsVariables(): Promise<Record<string, string>> {
  const s = await getSiteSettingsForEmail();
  if (!s) {
    // Hardcoded fallback
    return {
      companyName: 'BalkanEstate',
      companyNameFormatted: 'BalkanEstate<sup>AI</sup>',
      logoUrl: '',
      emailLogoUrl: '',
      supportEmail: 'support@balkanestateai.com',
      contactPhone: '',
      frontendUrl: process.env.FRONTEND_URL || 'https://balkanestate.com',
      backendUrl: process.env.BACKEND_URL || 'https://api.balkanestate.com',
    };
  }
  return {
    companyName: s.companyName,
    companyNameFormatted: s.companyNameFormatted,
    logoUrl: s.logoUrl,
    emailLogoUrl: s.emailLogoUrl,
    supportEmail: s.supportEmail,
    contactPhone: s.contactPhone || '',
    frontendUrl: s.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestate.com',
    backendUrl: s.backendUrl || process.env.BACKEND_URL || 'https://api.balkanestate.com',
    emailFooterText: s.emailFooterText || 'All rights reserved.',
    facebookUrl: s.socialLinks?.facebook || '',
    instagramUrl: s.socialLinks?.instagram || '',
    twitterUrl: s.socialLinks?.twitter || '',
    linkedinUrl: s.socialLinks?.linkedin || '',
    youtubeUrl: s.socialLinks?.youtube || '',
  };
}

/**
 * Replace {{variable}} placeholders in a template string.
 * Unknown placeholders are left as-is so admins can spot missing variables.
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value ?? '');
  }
  // Strip any leftover {{#if ...}}...{{/if}} conditional blocks
  result = result.replace(/\{\{#if\s+\w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  return result;
}

/**
 * Build the full email HTML document from an EmailConfig and resolved variables.
 * Returns both html and subject so the caller can send immediately.
 *
 * Automatically injects SiteSettings variables (companyName, supportEmail, etc.)
 * so they are available in every template without callers needing to pass them.
 */
export function renderEmailConfig(
  config: IEmailConfig,
  variables: Record<string, string>,
): { html: string; subject: string } {
  const frontendUrl = variables.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestate.com';
  const year = new Date().getFullYear();
  const companyNameFormatted = variables.companyNameFormatted || 'BalkanEstate<sup>AI</sup>';
  const supportEmail = variables.supportEmail || 'support@balkanestateai.com';
  const emailFooterText = variables.emailFooterText || 'All rights reserved.';
  const emailLogoUrl = variables.emailLogoUrl || '';
  // Use config-level headerImageUrl if set, otherwise fall back to global email logo
  const headerImageUrl = (config as any).headerImageUrl || emailLogoUrl;

  const headerTitle    = replaceVariables(config.headerTitle, variables);
  const headerSubtitle = config.headerSubtitle ? replaceVariables(config.headerSubtitle, variables) : '';
  const bodyContent    = replaceVariables(config.bodyTemplate, variables);
  const ctaText        = config.ctaText ? replaceVariables(config.ctaText, variables) : '';
  const ctaUrl         = config.ctaUrl  ? replaceVariables(config.ctaUrl, variables)  : '';
  const footerReason   = config.footerReason ? replaceVariables(config.footerReason, variables) : '';
  const subject        = replaceVariables(config.subject, variables);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${config.preheaderText ? '<meta name="x-apple-data-detectors" content="none">' : ''}
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;-webkit-font-smoothing:antialiased;">
  ${config.preheaderText ? `
  <div style="display:none;max-height:0;overflow:hidden;">
    ${replaceVariables(config.preheaderText, variables)}
  </div>` : ''}

  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">

    <!-- Header -->
    <div style="background:${replaceVariables(config.headerGradient || 'linear-gradient(135deg,#0252CD 0%,#0369a1 100%)', variables)};padding:32px 24px;text-align:center;">
      ${headerImageUrl ? `
      <div style="margin-bottom:16px;">
        <img src="${headerImageUrl}" alt="" style="max-height:48px;max-width:200px;" />
      </div>` : ''}
      ${config.headerEmoji && !headerImageUrl ? `
      <div style="margin-bottom:12px;">
        <span style="display:inline-block;width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;line-height:60px;font-size:28px;">${config.headerEmoji}</span>
      </div>` : ''}
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${headerTitle}</h1>
      ${headerSubtitle ? `<p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:14px;">${headerSubtitle}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="padding:28px 24px;">
      ${bodyContent}

      ${config.ctaEnabled && ctaText && ctaUrl ? `
      <div style="margin-top:28px;text-align:center;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:${replaceVariables(config.headerGradient || 'linear-gradient(135deg,#0252CD 0%,#0369a1 100%)', variables)};color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,0.15);">
          ${ctaText}
        </a>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
      ${footerReason ? `<p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;">${footerReason}</p>` : ''}
      ${config.showUnsubscribe ? `
      <p style="color:#9ca3af;font-size:11px;margin:0 0 6px 0;">
        <a href="${frontendUrl}/settings/notifications" style="color:#9ca3af;text-decoration:underline;">Manage email preferences</a>
      </p>` : ''}
      <p style="color:#6b7280;font-size:12px;margin:4px 0 4px 0;">
        Need help? <a href="mailto:${supportEmail}" style="color:#0252CD;text-decoration:none;">${supportEmail}</a>
      </p>
      <p style="color:#9ca3af;font-size:11px;margin:4px 0 0 0;">
        &copy; ${year} ${companyNameFormatted}. ${emailFooterText}
      </p>
    </div>
  </div>
</body>
</html>`;

  return { html, subject };
}

/**
 * Async wrapper that automatically merges SiteSettings variables into the
 * local variables before rendering. Callers don't need to manually fetch
 * site settings — this function handles it.
 *
 * Usage:
 *   const { html, subject } = await renderEmailWithSiteSettings(config, localVars);
 */
export async function renderEmailWithSiteSettings(
  config: IEmailConfig,
  localVariables: Record<string, string>,
): Promise<{ html: string; subject: string }> {
  const siteVars = await getSiteSettingsVariables();
  // Local variables take priority over site settings
  const merged = { ...siteVars, ...localVariables };
  return renderEmailConfig(config, merged);
}

/**
 * Fetch an active EmailConfig by key.
 * Returns null (and never throws) so callers can fall back gracefully.
 */
export async function getActiveEmailConfig(key: string): Promise<IEmailConfig | null> {
  try {
    return await EmailConfig.findOne({ key, isActive: true }).lean() as unknown as IEmailConfig | null;
  } catch {
    return null;
  }
}

/**
 * Build a styled HTML block for a list of promotion coupon codes.
 * Safe to embed inside a bodyTemplate via {{couponCodesList}}.
 */
export function buildCouponCodesHtml(
  codes: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }>,
): string {
  if (!codes || codes.length === 0) return '';

  const tierMeta: Record<string, { label: string; bg: string; border: string }> = {
    highlight: { label: '✨ Highlighted',  bg: '#ecfdf5', border: '#059669' },
    premium:   { label: '💎 Premium',      bg: '#f5f3ff', border: '#7c3aed' },
    featured:  { label: '🔥 Featured',     bg: '#fff1f2', border: '#dc2626' },
  };

  const rows = codes.map(c => {
    const meta = tierMeta[c.tier] ?? { label: c.tier, bg: '#f9fafb', border: '#6b7280' };
    return `
      <div style="display:flex;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <span style="display:inline-block;background:${meta.border};color:#fff;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;">${meta.label}</span>
        <code style="display:inline-block;background:${meta.bg};border:1px solid ${meta.border};border-radius:4px;padding:6px 14px;font-size:14px;font-weight:700;letter-spacing:1.5px;color:#1f2937;font-family:monospace;">${c.code}</code>
      </div>`;
  }).join('');

  return `
    <div style="background:#f0fdf4;border-radius:10px;padding:18px;margin:16px 0;border:1px solid #86efac;">
      <p style="color:#166534;font-size:13px;font-weight:700;margin:0 0 12px 0;">🎫 Your promotion coupon codes — paste when boosting a listing:</p>
      ${rows}
      <p style="color:#4b7c5e;font-size:11px;margin:10px 0 0 0;line-height:1.5;">Each code is single-use and valid until the end of this period. New codes arrive with your next monthly refresh.</p>
    </div>`;
}
