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
      companyName: 'BalkanEstateAI',
      companyNameFormatted: 'BalkanEstate<sup>AI</sup>',
      logoUrl: '',
      emailLogoUrl: '',
      supportEmail: 'support@balkanestateai.com',
      contactPhone: '',
      frontendUrl: process.env.FRONTEND_URL || 'https://balkanestateai.com',
      backendUrl: process.env.BACKEND_URL || 'https://api.balkanestateai.com',
      // Brand colors (light theme defaults)
      brandPrimary: '#0252CD',
      brandPrimaryDark: '#0142a8',
      brandAccent: '#10b981',
      brandText: '#1f2937',
      brandTextMuted: '#6b7280',
      brandBackground: '#ffffff',
      brandBackgroundAlt: '#f9fafb',
      // Brand colors (dark theme defaults)
      darkBrandPrimary: '#3b82f6',
      darkBrandPrimaryDark: '#2563eb',
      darkBrandAccent: '#34d399',
      darkBrandText: '#f9fafb',
      darkBrandTextMuted: '#9ca3af',
      darkBrandBackground: '#111827',
      darkBrandBackgroundAlt: '#1f2937',
    };
  }
  const colors = s.emailBrandColors || {} as any;
  const darkColors = s.emailBrandColorsDark || {} as any;
  return {
    companyName: s.companyName,
    companyNameFormatted: s.companyNameFormatted,
    logoUrl: s.logoUrl,
    emailLogoUrl: s.emailLogoUrl,
    supportEmail: s.supportEmail,
    contactPhone: s.contactPhone || '',
    frontendUrl: s.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestateai.com',
    backendUrl: s.backendUrl || process.env.BACKEND_URL || 'https://api.balkanestateai.com',
    emailFooterText: s.emailFooterText || 'All rights reserved.',
    facebookUrl: s.socialLinks?.facebook || '',
    instagramUrl: s.socialLinks?.instagram || '',
    twitterUrl: s.socialLinks?.twitter || '',
    linkedinUrl: s.socialLinks?.linkedin || '',
    youtubeUrl: s.socialLinks?.youtube || '',
    // Brand colors from SiteSettings (light theme)
    brandPrimary: colors.primary || '#0252CD',
    brandPrimaryDark: colors.primaryDark || '#0142a8',
    brandAccent: colors.accent || '#10b981',
    brandText: colors.text || '#1f2937',
    brandTextMuted: colors.textMuted || '#6b7280',
    brandBackground: colors.background || '#ffffff',
    brandBackgroundAlt: colors.backgroundAlt || '#f9fafb',
    // Brand colors from SiteSettings (dark theme)
    darkBrandPrimary: darkColors.primary || '#3b82f6',
    darkBrandPrimaryDark: darkColors.primaryDark || '#2563eb',
    darkBrandAccent: darkColors.accent || '#34d399',
    darkBrandText: darkColors.text || '#f9fafb',
    darkBrandTextMuted: darkColors.textMuted || '#9ca3af',
    darkBrandBackground: darkColors.background || '#111827',
    darkBrandBackgroundAlt: darkColors.backgroundAlt || '#1f2937',
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
  const frontendUrl = variables.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestateai.com';
  const year = new Date().getFullYear();
  const companyNameFormatted = variables.companyNameFormatted || 'BalkanEstateAI';
  const supportEmail = variables.supportEmail || 'support@balkanestateai.com';
  const emailFooterText = variables.emailFooterText || 'All rights reserved.';
  const emailLogoUrl = variables.emailLogoUrl || '';
  // Use config-level headerImageUrl if set, otherwise fall back to global email logo
  const headerImageUrl = (config as any).headerImageUrl || emailLogoUrl;

  // Brand colors from SiteSettings — light theme (inline styles)
  const brandPrimary = variables.brandPrimary || '#0252CD';
  const brandPrimaryDark = variables.brandPrimaryDark || '#0142a8';
  const brandText = variables.brandText || '#1f2937';
  const brandTextMuted = variables.brandTextMuted || '#6b7280';
  const brandBackground = variables.brandBackground || '#ffffff';
  const brandBackgroundAlt = variables.brandBackgroundAlt || '#f9fafb';

  // Brand colors from SiteSettings — dark theme (CSS media query)
  const darkPrimary = variables.darkBrandPrimary || '#3b82f6';
  const darkPrimaryDark = variables.darkBrandPrimaryDark || '#2563eb';
  const darkText = variables.darkBrandText || '#ffffff';
  const darkTextMuted = variables.darkBrandTextMuted || '#ffffff';
  const darkBackground = variables.darkBrandBackground || '#111827';
  const darkBackgroundAlt = variables.darkBrandBackgroundAlt || '#1f2937';

  // Default header gradient uses brand colors if config doesn't override
  const defaultGradient = `linear-gradient(135deg,${brandPrimary} 0%,${brandPrimaryDark} 100%)`;
  const darkGradient = `linear-gradient(135deg,${darkPrimary} 0%,${darkPrimaryDark} 100%)`;

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
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  ${config.preheaderText ? '<meta name="x-apple-data-detectors" content="none">' : ''}
  <style>
    @media (prefers-color-scheme: dark) {
      .ec-body { background-color: ${darkBackground} !important; }
      .ec-card { background-color: ${darkBackgroundAlt} !important; color: ${darkText} !important; }
      .ec-card p, .ec-card li, .ec-card td, .ec-card h1, .ec-card h2, .ec-card h3,
      .ec-card span, .ec-card div, .ec-card ul, .ec-card ol, .ec-card strong { color: ${darkText} !important; }
      .ec-header, .ec-header h1, .ec-header p, .ec-header span { color: #ffffff !important; }
      .ec-header { background: ${darkGradient} !important; }
      .ec-text { color: ${darkText} !important; }
      .ec-text-muted { color: ${darkTextMuted} !important; }
      .ec-footer { background: ${darkBackground} !important; border-color: ${darkBackgroundAlt} !important; color: ${darkTextMuted} !important; }
      .ec-footer p, .ec-footer a, .ec-footer span, .ec-footer div { color: ${darkTextMuted} !important; }
      .ec-link { color: ${darkPrimary} !important; }
      .ec-card a { color: ${darkPrimary} !important; }
      .ec-cta, .ec-cta center { background: ${darkGradient} !important; color: #ffffff !important; }
      .ec-border { border-color: ${darkBackgroundAlt} !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;-webkit-font-smoothing:antialiased;" class="ec-body">
  ${config.preheaderText ? `
  <div style="display:none;max-height:0;overflow:hidden;">
    ${replaceVariables(config.preheaderText, variables)}
  </div>` : ''}

  <div style="max-width:600px;margin:0 auto;background-color:${brandBackground};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);" class="ec-card">

    <!-- Header -->
    <div style="background:${replaceVariables(config.headerGradient || defaultGradient, variables)};padding:32px 24px;text-align:center;" class="ec-header">
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
    <div style="padding:28px 24px;color:${brandText};" class="ec-text">
      ${bodyContent}

      ${config.ctaEnabled && ctaText && ctaUrl ? `
      <div style="margin-top:28px;text-align:center;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="${brandPrimary}">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:'Segoe UI',Tahoma,sans-serif;font-size:15px;font-weight:bold;">${ctaText}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${ctaUrl}"
           style="display:inline-block;background-color:${brandPrimary};background:linear-gradient(135deg, ${brandPrimary} 0%, ${brandPrimaryDark} 100%);color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,0.15);"
           class="ec-cta">
          ${ctaText}
        </a>
        <!--<![endif]-->
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:${brandBackgroundAlt};padding:20px;text-align:center;border-top:1px solid #e5e7eb;" class="ec-footer">
      ${footerReason ? `<p style="color:${brandTextMuted};font-size:12px;margin:0 0 8px 0;" class="ec-text-muted">${footerReason}</p>` : ''}
      ${config.showUnsubscribe ? `
      <p style="color:${brandTextMuted};font-size:11px;margin:0 0 6px 0;" class="ec-text-muted">
        <a href="${frontendUrl}/settings/notifications" style="color:${brandTextMuted};text-decoration:underline;" class="ec-text-muted">Manage email preferences</a>
      </p>` : ''}
      <p style="color:${brandTextMuted};font-size:12px;margin:4px 0 4px 0;" class="ec-text-muted">
        Need help? <a href="mailto:${supportEmail}" style="color:${brandPrimary};text-decoration:none;" class="ec-link">${supportEmail}</a>
      </p>
      <p style="color:${brandTextMuted};font-size:11px;margin:4px 0 0 0;" class="ec-text-muted">
        &copy; ${year} ${companyNameFormatted.replace(/<sup>/gi, '<span style="font-size:0.7em;vertical-align:super;line-height:0;">').replace(/<\/sup>/gi, '</span>')}. ${emailFooterText}
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
