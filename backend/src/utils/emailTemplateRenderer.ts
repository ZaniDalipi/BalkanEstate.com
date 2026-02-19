/**
 * Shared email template renderer.
 * Used by emailConfigController (admin preview/test) and emailService (actual sending)
 * so both render identically from the same EmailConfig document.
 */
import EmailConfig, { IEmailConfig } from '../models/EmailConfig';

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
 */
export function renderEmailConfig(
  config: IEmailConfig,
  variables: Record<string, string>,
): { html: string; subject: string } {
  const frontendUrl = variables.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestate.com';
  const year = new Date().getFullYear();

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
    <div style="background:${config.headerGradient || 'linear-gradient(135deg,#0252CD 0%,#0369a1 100%)'};padding:32px 24px;text-align:center;">
      ${config.headerEmoji ? `
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
           style="display:inline-block;background:${config.headerGradient || 'linear-gradient(135deg,#0252CD 0%,#0369a1 100%)'};color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,0.15);">
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
      <p style="color:#9ca3af;font-size:11px;margin:4px 0 0 0;">
        &copy; ${year} BalkanEstate<sup>AI</sup>. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { html, subject };
}

/**
 * Fetch an active EmailConfig by key.
 * Returns null (and never throws) so callers can fall back gracefully.
 */
export async function getActiveEmailConfig(key: string): Promise<IEmailConfig | null> {
  try {
    return await EmailConfig.findOne({ key, isActive: true }).lean() as IEmailConfig | null;
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
