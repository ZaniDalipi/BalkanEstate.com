/**
 * Email Templates - Minimalistic, easy-to-read email designs
 *
 * Features:
 * - Clean, modern typography
 * - Generous whitespace for readability
 * - 3D house graphics for promotional emails
 * - Mobile-responsive design
 * - Dark mode support
 */

// =============================================================================
// Configuration
// =============================================================================

export const BRAND_COLORS = {
  primary: '#0252CD',
  primaryDark: '#0142a8',
  accent: '#10b981',
  text: '#1f2937',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  background: '#ffffff',
  backgroundAlt: '#f9fafb',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const FONTS = {
  primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'SF Mono', 'Monaco', 'Consolas', monospace",
};

// =============================================================================
// 3D House Graphics (SVG)
// =============================================================================

/**
 * 3D isometric house graphic for promotional emails
 * Creates a modern, eye-catching hero visual
 */
export const get3DHouseGraphic = (options: {
  size?: 'small' | 'medium' | 'large';
  style?: 'modern' | 'villa' | 'apartment';
  showFloatingElements?: boolean;
} = {}): string => {
  const { size = 'medium', style = 'modern', showFloatingElements = true } = options;

  const dimensions = {
    small: { width: 200, height: 160 },
    medium: { width: 300, height: 240 },
    large: { width: 400, height: 320 },
  };

  const { width, height } = dimensions[size];

  // Modern 3D isometric house
  const modernHouse = `
    <svg width="${width}" height="${height}" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="200" cy="300" rx="150" ry="20" fill="url(#shadow-gradient)" opacity="0.3"/>

      <!-- House Base (3D isometric) -->
      <g transform="translate(60, 80)">
        <!-- Left wall -->
        <path d="M0 120 L0 220 L120 280 L120 180 Z" fill="#e8f4fc"/>
        <path d="M0 120 L0 220 L120 280 L120 180 Z" fill="url(#wall-shadow)" opacity="0.1"/>

        <!-- Right wall -->
        <path d="M280 120 L280 220 L120 280 L120 180 Z" fill="#f8fafc"/>

        <!-- Roof left -->
        <path d="M0 120 L140 0 L140 60 L120 180 Z" fill="#0252CD"/>
        <path d="M0 120 L140 0 L140 60 L120 180 Z" fill="url(#roof-highlight)" opacity="0.3"/>

        <!-- Roof right -->
        <path d="M280 120 L140 0 L140 60 L120 180 Z" fill="#0369a1"/>

        <!-- Roof peak -->
        <path d="M140 0 L140 60 L120 180 L160 180 Z" fill="#0252CD" opacity="0.8"/>

        <!-- Window left -->
        <rect x="30" y="150" width="40" height="50" rx="4" fill="#bfdbfe"/>
        <rect x="32" y="152" width="36" height="46" rx="2" fill="#60a5fa" opacity="0.5"/>
        <line x1="50" y1="152" x2="50" y2="198" stroke="#94a3b8" stroke-width="2"/>
        <line x1="32" y1="175" x2="68" y2="175" stroke="#94a3b8" stroke-width="2"/>

        <!-- Window right -->
        <rect x="180" y="150" width="50" height="50" rx="4" fill="#bfdbfe"/>
        <rect x="182" y="152" width="46" height="46" rx="2" fill="#60a5fa" opacity="0.5"/>
        <line x1="205" y1="152" x2="205" y2="198" stroke="#94a3b8" stroke-width="2"/>
        <line x1="182" y1="175" x2="228" y2="175" stroke="#94a3b8" stroke-width="2"/>

        <!-- Door -->
        <rect x="100" y="200" width="40" height="70" rx="4" fill="#1e3a5f"/>
        <circle cx="130" cy="240" r="4" fill="#f59e0b"/>

        <!-- Chimney -->
        <rect x="180" y="30" width="25" height="50" fill="#94a3b8"/>
        <rect x="178" y="25" width="29" height="8" fill="#64748b"/>
      </g>

      ${showFloatingElements ? `
      <!-- Floating elements for promotional feel -->
      <!-- Sparkle 1 -->
      <g transform="translate(50, 60)">
        <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#f59e0b" opacity="0.8"/>
      </g>

      <!-- Sparkle 2 -->
      <g transform="translate(320, 100)">
        <path d="M8 0 L9.5 6 L16 8 L9.5 10 L8 16 L6.5 10 L0 8 L6.5 6 Z" fill="#10b981" opacity="0.7"/>
      </g>

      <!-- Sparkle 3 -->
      <g transform="translate(340, 200)">
        <path d="M6 0 L7 4.5 L12 6 L7 7.5 L6 12 L5 7.5 L0 6 L5 4.5 Z" fill="#0252CD" opacity="0.6"/>
      </g>

      <!-- Price tag -->
      <g transform="translate(280, 50)">
        <rect x="0" y="0" width="80" height="36" rx="18" fill="#10b981"/>
        <text x="40" y="24" font-family="${FONTS.primary}" font-size="14" font-weight="700" fill="white" text-anchor="middle">PROMO</text>
      </g>
      ` : ''}

      <!-- Gradients -->
      <defs>
        <linearGradient id="shadow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1f2937" stop-opacity="0"/>
          <stop offset="50%" stop-color="#1f2937" stop-opacity="1"/>
          <stop offset="100%" stop-color="#1f2937" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="wall-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#000000"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="roof-highlight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#ffffff"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  // Villa style
  const villaHouse = `
    <svg width="${width}" height="${height}" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="200" cy="295" rx="160" ry="25" fill="#1f2937" opacity="0.15"/>

      <!-- Main villa structure -->
      <g transform="translate(40, 60)">
        <!-- Base platform -->
        <rect x="20" y="200" width="280" height="20" rx="4" fill="#e2e8f0"/>

        <!-- Main building -->
        <rect x="40" y="100" width="240" height="100" fill="#fef3c7"/>
        <rect x="40" y="100" width="240" height="100" fill="url(#villa-shadow)" opacity="0.1"/>

        <!-- Left wing -->
        <rect x="0" y="130" width="60" height="70" fill="#fef9c3"/>

        <!-- Right wing -->
        <rect x="260" y="130" width="60" height="70" fill="#fef9c3"/>

        <!-- Main roof -->
        <path d="M30 100 L160 30 L290 100 Z" fill="#dc2626"/>
        <path d="M30 100 L160 30 L160 100 Z" fill="#ef4444"/>

        <!-- Left wing roof -->
        <path d="M-10 130 L30 90 L70 130 Z" fill="#dc2626"/>

        <!-- Right wing roof -->
        <path d="M250 130 L290 90 L330 130 Z" fill="#dc2626"/>

        <!-- Windows row -->
        <rect x="60" y="120" width="35" height="40" rx="2" fill="#87ceeb"/>
        <rect x="110" y="120" width="35" height="40" rx="2" fill="#87ceeb"/>
        <rect x="175" y="120" width="35" height="40" rx="2" fill="#87ceeb"/>
        <rect x="225" y="120" width="35" height="40" rx="2" fill="#87ceeb"/>

        <!-- Grand entrance -->
        <rect x="130" y="150" width="60" height="50" fill="#4a5568"/>
        <path d="M130 150 L160 130 L190 150 Z" fill="#4a5568"/>

        <!-- Columns -->
        <rect x="115" y="150" width="8" height="50" fill="#e2e8f0"/>
        <rect x="197" y="150" width="8" height="50" fill="#e2e8f0"/>

        <!-- Pool -->
        <ellipse cx="160" cy="250" rx="60" ry="20" fill="#38bdf8" opacity="0.7"/>
        <ellipse cx="160" cy="248" rx="55" ry="17" fill="#7dd3fc" opacity="0.5"/>
      </g>

      ${showFloatingElements ? `
      <!-- Luxury badge -->
      <g transform="translate(290, 40)">
        <rect x="0" y="0" width="90" height="36" rx="18" fill="linear-gradient(135deg, #f59e0b, #d97706)"/>
        <rect x="0" y="0" width="90" height="36" rx="18" fill="#f59e0b"/>
        <text x="45" y="24" font-family="${FONTS.primary}" font-size="12" font-weight="700" fill="white" text-anchor="middle">LUXURY</text>
      </g>

      <!-- Stars -->
      <text x="60" y="70" font-size="20">&#10022;</text>
      <text x="340" y="120" font-size="16" fill="#f59e0b">&#9733;</text>
      ` : ''}

      <defs>
        <linearGradient id="villa-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#000000"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  // Apartment building style
  const apartmentHouse = `
    <svg width="${width}" height="${height}" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="200" cy="300" rx="120" ry="20" fill="#1f2937" opacity="0.2"/>

      <!-- Building -->
      <g transform="translate(100, 40)">
        <!-- Main structure -->
        <rect x="0" y="40" width="200" height="220" fill="#f1f5f9"/>
        <rect x="0" y="40" width="200" height="220" fill="url(#building-gradient)"/>

        <!-- Glass facade -->
        <rect x="10" y="50" width="180" height="200" fill="#0ea5e9" opacity="0.2"/>

        <!-- Windows grid -->
        ${Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 4 }, (_, col) => `
            <rect x="${20 + col * 45}" y="${60 + row * 40}" width="35" height="30" rx="2" fill="#bfdbfe"/>
            <rect x="${22 + col * 45}" y="${62 + row * 40}" width="31" height="26" rx="1" fill="#60a5fa" opacity="0.4"/>
          `).join('')
        ).join('')}

        <!-- Roof structure -->
        <rect x="-10" y="30" width="220" height="15" fill="#64748b"/>
        <rect x="70" y="0" width="60" height="35" fill="#475569"/>
        <rect x="80" y="5" width="40" height="10" fill="#94a3b8"/>

        <!-- Entrance -->
        <rect x="70" y="220" width="60" height="40" fill="#1e3a5f"/>
        <rect x="75" y="225" width="50" height="30" fill="#38bdf8" opacity="0.3"/>

        <!-- Balconies -->
        <rect x="15" y="95" width="40" height="3" fill="#94a3b8"/>
        <rect x="145" y="95" width="40" height="3" fill="#94a3b8"/>
        <rect x="15" y="175" width="40" height="3" fill="#94a3b8"/>
        <rect x="145" y="175" width="40" height="3" fill="#94a3b8"/>
      </g>

      ${showFloatingElements ? `
      <!-- For sale badge -->
      <g transform="translate(260, 60)">
        <rect x="0" y="0" width="100" height="40" rx="20" fill="#0252CD"/>
        <text x="50" y="26" font-family="${FONTS.primary}" font-size="12" font-weight="700" fill="white" text-anchor="middle">NEW LISTING</text>
      </g>

      <!-- Location pin -->
      <g transform="translate(50, 100)">
        <circle cx="15" cy="15" r="15" fill="#ef4444" opacity="0.2"/>
        <path d="M15 5 C10 5 6 9 6 14 C6 21 15 28 15 28 C15 28 24 21 24 14 C24 9 20 5 15 5 Z M15 18 C12.8 18 11 16.2 11 14 C11 11.8 12.8 10 15 10 C17.2 10 19 11.8 19 14 C19 16.2 17.2 18 15 18 Z" fill="#ef4444"/>
      </g>
      ` : ''}

      <defs>
        <linearGradient id="building-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#e2e8f0"/>
          <stop offset="50%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  const houses = {
    modern: modernHouse,
    villa: villaHouse,
    apartment: apartmentHouse,
  };

  return houses[style];
};

// =============================================================================
// Base Template Components
// =============================================================================

/**
 * Generate the base HTML wrapper for all emails
 */
export const getBaseTemplate = (options: {
  content: string;
  preheader?: string;
  backgroundColor?: string;
}): string => {
  const { content, preheader = '', backgroundColor = '#f9fafb' } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>BalkanEstate</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: ${backgroundColor};
      font-family: ${FONTS.primary};
      -webkit-font-smoothing: antialiased;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #111827 !important; }
      .email-card { background-color: #1f2937 !important; }
      .text-primary { color: #f9fafb !important; }
      .text-muted { color: #9ca3af !important; }
      .border-light { border-color: #374151 !important; }
    }

    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .stack { display: block !important; width: 100% !important; }
      .stack-cell { display: block !important; width: 100% !important; padding: 8px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor};">
  <!-- Preheader text (hidden but shown in inbox preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    ${'&nbsp;'.repeat(100)}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor};" class="email-bg">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        ${content}
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generate a minimalistic card container
 */
export const getCardContainer = (content: string, options: {
  maxWidth?: number;
  padding?: string;
} = {}): string => {
  const { maxWidth = 560, padding = '48px 40px' } = options;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${maxWidth}px;" class="container">
  <tr>
    <td style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); padding: ${padding};" class="email-card">
      ${content}
    </td>
  </tr>
</table>`;
};

/**
 * Generate minimalistic header with logo
 */
export const getMinimalHeader = (options: {
  showLogo?: boolean;
  logoUrl?: string;
  tagline?: string;
} = {}): string => {
  const { showLogo = true, tagline } = options;
  const logoUrl = options.logoUrl || `${process.env.FRONTEND_URL || 'https://balkanestate.com'}/logo.png`;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
  <tr>
    <td align="center">
      ${showLogo ? `
      <div style="margin-bottom: 16px;">
        <span style="font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.primary}; letter-spacing: -0.5px;">
          BalkanEstate<sup style="font-size: 10px; color: ${BRAND_COLORS.textMuted};">AI</sup>
        </span>
      </div>
      ` : ''}
      ${tagline ? `<p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">${tagline}</p>` : ''}
    </td>
  </tr>
</table>`;
};

/**
 * Generate a promotional hero section with 3D house
 */
export const getPromoHero = (options: {
  title: string;
  subtitle?: string;
  houseStyle?: 'modern' | 'villa' | 'apartment';
  badge?: string;
  badgeColor?: string;
}): string => {
  const {
    title,
    subtitle,
    houseStyle = 'modern',
    badge,
    badgeColor = BRAND_COLORS.accent
  } = options;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
  <tr>
    <td align="center" style="padding: 24px 0;">
      <!-- 3D House Graphic -->
      <div style="margin-bottom: 24px;">
        ${get3DHouseGraphic({ size: 'medium', style: houseStyle, showFloatingElements: true })}
      </div>

      ${badge ? `
      <!-- Badge -->
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 100px;">
          ${badge}
        </span>
      </div>
      ` : ''}

      <!-- Title -->
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: ${BRAND_COLORS.text}; line-height: 1.2; letter-spacing: -0.5px;" class="text-primary">
        ${title}
      </h1>

      ${subtitle ? `
      <p style="margin: 0; font-size: 16px; color: ${BRAND_COLORS.textMuted}; line-height: 1.5;" class="text-muted">
        ${subtitle}
      </p>
      ` : ''}
    </td>
  </tr>
</table>`;
};

/**
 * Generate a simple text section
 */
export const getTextSection = (options: {
  greeting?: string;
  paragraphs: string[];
}): string => {
  const { greeting, paragraphs } = options;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding-bottom: 24px;">
      ${greeting ? `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text};" class="text-primary">
        ${greeting}
      </p>
      ` : ''}
      ${paragraphs.map(p => `
      <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.textMuted}; line-height: 1.6;" class="text-muted">
        ${p}
      </p>
      `).join('')}
    </td>
  </tr>
</table>`;
};

/**
 * Generate a primary CTA button
 */
export const getCtaButton = (options: {
  text: string;
  url: string;
  style?: 'primary' | 'secondary' | 'success';
  fullWidth?: boolean;
}): string => {
  const { text, url, style = 'primary', fullWidth = false } = options;

  const styles = {
    primary: { bg: BRAND_COLORS.primary, hover: BRAND_COLORS.primaryDark, text: '#ffffff' },
    secondary: { bg: '#ffffff', hover: '#f3f4f6', text: BRAND_COLORS.text, border: BRAND_COLORS.border },
    success: { bg: BRAND_COLORS.success, hover: '#059669', text: '#ffffff' },
  };

  const s = styles[style];

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="${fullWidth ? '100%' : 'auto'}" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" target="_blank" style="display: inline-block; background-color: ${s.bg}; color: ${s.text}; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; ${s.border ? `border: 1px solid ${s.border};` : ''} transition: background-color 0.2s;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
};

/**
 * Generate a stats grid (for reports)
 */
export const getStatsGrid = (stats: Array<{
  value: string | number;
  label: string;
  change?: number;
  color?: string;
}>): string => {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
  <tr>
    ${stats.map((stat, index) => `
    <td style="width: ${100 / stats.length}%; padding: ${index > 0 ? '0 0 0 8px' : '0 8px 0 0'}; vertical-align: top;" class="stack-cell">
      <div style="background-color: ${BRAND_COLORS.backgroundAlt}; border-radius: 12px; padding: 20px; text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: ${stat.color || BRAND_COLORS.primary}; margin-bottom: 4px;">
          ${stat.value}
        </div>
        <div style="font-size: 12px; color: ${BRAND_COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
          ${stat.label}
        </div>
        ${stat.change !== undefined ? `
        <div style="font-size: 12px; color: ${stat.change >= 0 ? BRAND_COLORS.success : BRAND_COLORS.error}; margin-top: 4px;">
          ${stat.change >= 0 ? '+' : ''}${stat.change}%
        </div>
        ` : ''}
      </div>
    </td>
    `).join('')}
  </tr>
</table>`;
};

/**
 * Generate a property card for alerts
 */
export const getPropertyCard = (property: {
  title: string;
  address: string;
  price: string | number;
  imageUrl?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  url: string;
  badge?: string;
}): string => {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0; border: 1px solid ${BRAND_COLORS.border}; border-radius: 12px; overflow: hidden;">
  <tr>
    ${property.imageUrl ? `
    <td style="width: 140px; vertical-align: top;">
      <a href="${property.url}" target="_blank">
        <img src="${property.imageUrl}" alt="" width="140" height="100" style="display: block; object-fit: cover;" />
      </a>
    </td>
    ` : ''}
    <td style="padding: 16px; vertical-align: top;">
      ${property.badge ? `
      <span style="display: inline-block; background-color: ${BRAND_COLORS.accent}; color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; margin-bottom: 8px;">
        ${property.badge}
      </span>
      ` : ''}
      <div style="font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.text}; margin-bottom: 4px;">
        <a href="${property.url}" target="_blank" style="color: inherit; text-decoration: none;">${property.title}</a>
      </div>
      <div style="font-size: 13px; color: ${BRAND_COLORS.textMuted}; margin-bottom: 8px;">
        ${property.address}
      </div>
      <div style="font-size: 18px; font-weight: 700; color: ${BRAND_COLORS.primary};">
        ${typeof property.price === 'number' ? `€${property.price.toLocaleString()}` : property.price}
      </div>
      ${property.beds || property.baths || property.sqft ? `
      <div style="font-size: 12px; color: ${BRAND_COLORS.textMuted}; margin-top: 8px;">
        ${property.beds ? `${property.beds} beds` : ''}
        ${property.baths ? `· ${property.baths} baths` : ''}
        ${property.sqft ? `· ${property.sqft.toLocaleString()} sqft` : ''}
      </div>
      ` : ''}
    </td>
  </tr>
</table>`;
};

/**
 * Generate minimalistic footer
 */
export const getMinimalFooter = (options: {
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  reason?: string;
  showSocial?: boolean;
}): string => {
  const { unsubscribeUrl, preferencesUrl, reason, showSocial = false } = options;
  const year = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; padding-top: 24px; border-top: 1px solid ${BRAND_COLORS.border};" class="border-light">
  <tr>
    <td align="center">
      ${reason ? `
      <p style="margin: 0 0 16px 0; font-size: 12px; color: ${BRAND_COLORS.textLight};">
        ${reason}
      </p>
      ` : ''}

      <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND_COLORS.textLight};">
        ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color: ${BRAND_COLORS.textLight};">Unsubscribe</a>` : ''}
        ${unsubscribeUrl && preferencesUrl ? ' · ' : ''}
        ${preferencesUrl ? `<a href="${preferencesUrl}" style="color: ${BRAND_COLORS.textLight};">Manage preferences</a>` : ''}
      </p>

      ${showSocial ? `
      <p style="margin: 16px 0 0 0;">
        <a href="https://twitter.com/balkanestate" style="margin: 0 8px; color: ${BRAND_COLORS.textLight};">Twitter</a>
        <a href="https://instagram.com/balkanestate" style="margin: 0 8px; color: ${BRAND_COLORS.textLight};">Instagram</a>
        <a href="https://facebook.com/balkanestate" style="margin: 0 8px; color: ${BRAND_COLORS.textLight};">Facebook</a>
      </p>
      ` : ''}

      <p style="margin: 16px 0 0 0; font-size: 11px; color: ${BRAND_COLORS.textLight};">
        © ${year} BalkanEstate<sup>AI</sup> · <a href="${frontendUrl}" style="color: ${BRAND_COLORS.textLight};">balkanestate.com</a>
      </p>
    </td>
  </tr>
</table>`;
};

// =============================================================================
// Complete Email Templates
// =============================================================================

/**
 * Promotional email template with 3D house hero
 */
export const getPromoTemplate = (options: {
  title: string;
  subtitle?: string;
  greeting: string;
  bodyParagraphs: string[];
  ctaText: string;
  ctaUrl: string;
  houseStyle?: 'modern' | 'villa' | 'apartment';
  badge?: string;
  badgeColor?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}): string => {
  const content = `
    ${getMinimalHeader({ tagline: 'Your dream home awaits' })}
    ${getPromoHero({
      title: options.title,
      subtitle: options.subtitle,
      houseStyle: options.houseStyle,
      badge: options.badge,
      badgeColor: options.badgeColor,
    })}
    ${getTextSection({
      greeting: options.greeting,
      paragraphs: options.bodyParagraphs,
    })}
    ${getCtaButton({
      text: options.ctaText,
      url: options.ctaUrl,
    })}
    ${getMinimalFooter({
      unsubscribeUrl: options.unsubscribeUrl,
      preferencesUrl: options.preferencesUrl,
      reason: "You're receiving this because you signed up for BalkanEstate.",
    })}
  `;

  return getBaseTemplate({
    content: getCardContainer(content),
    preheader: options.subtitle || options.title,
  });
};

/**
 * Transactional email template (simple, clean)
 */
export const getTransactionalTemplate = (options: {
  greeting: string;
  bodyParagraphs: string[];
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}): string => {
  const content = `
    ${getMinimalHeader()}
    ${getTextSection({
      greeting: options.greeting,
      paragraphs: options.bodyParagraphs,
    })}
    ${options.ctaText && options.ctaUrl ? getCtaButton({
      text: options.ctaText,
      url: options.ctaUrl,
    }) : ''}
    ${getMinimalFooter({
      unsubscribeUrl: options.unsubscribeUrl,
    })}
  `;

  return getBaseTemplate({
    content: getCardContainer(content),
  });
};

/**
 * Stats/Report email template
 */
export const getReportTemplate = (options: {
  title: string;
  period: string;
  greeting: string;
  stats: Array<{ value: string | number; label: string; change?: number; color?: string }>;
  highlights?: string[];
  ctaText: string;
  ctaUrl: string;
  unsubscribeUrl?: string;
}): string => {
  const content = `
    ${getMinimalHeader()}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 8px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND_COLORS.text};">
            ${options.title}
          </h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.textMuted};">
            ${options.period}
          </p>
        </td>
      </tr>
    </table>

    ${getTextSection({ greeting: options.greeting, paragraphs: [] })}
    ${getStatsGrid(options.stats)}

    ${options.highlights && options.highlights.length > 0 ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: ${BRAND_COLORS.backgroundAlt}; border-radius: 12px; padding: 20px;">
      <tr>
        <td>
          <div style="font-size: 14px; font-weight: 600; color: ${BRAND_COLORS.text}; margin-bottom: 12px;">
            Highlights
          </div>
          ${options.highlights.map(h => `
          <div style="font-size: 14px; color: ${BRAND_COLORS.textMuted}; padding: 4px 0; padding-left: 16px; position: relative;">
            <span style="position: absolute; left: 0;">•</span>
            ${h}
          </div>
          `).join('')}
        </td>
      </tr>
    </table>
    ` : ''}

    ${getCtaButton({ text: options.ctaText, url: options.ctaUrl })}
    ${getMinimalFooter({ unsubscribeUrl: options.unsubscribeUrl, reason: "You're receiving this because you're a member of BalkanEstate." })}
  `;

  return getBaseTemplate({
    content: getCardContainer(content),
    preheader: `${options.title} - ${options.period}`,
  });
};

/**
 * Property alert email template
 */
export const getPropertyAlertTemplate = (options: {
  recipientName: string;
  searchName: string;
  properties: Array<{
    title: string;
    address: string;
    price: string | number;
    imageUrl?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    url: string;
    badge?: string;
  }>;
  viewAllUrl: string;
  unsubscribeUrl?: string;
}): string => {
  const propertyCount = options.properties.length;

  const content = `
    ${getMinimalHeader()}

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <div style="display: inline-block; background-color: ${BRAND_COLORS.accent}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 100px; margin-bottom: 16px;">
            ${propertyCount} New ${propertyCount === 1 ? 'Match' : 'Matches'}
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${BRAND_COLORS.text};">
            New properties for "${options.searchName}"
          </h1>
        </td>
      </tr>
    </table>

    ${getTextSection({
      greeting: `Hi ${options.recipientName},`,
      paragraphs: [`Great news! ${propertyCount === 1 ? 'A new property matches' : `${propertyCount} new properties match`} your saved search.`],
    })}

    ${options.properties.slice(0, 3).map(p => getPropertyCard(p)).join('')}

    ${options.properties.length > 3 ? `
    <p style="text-align: center; font-size: 14px; color: ${BRAND_COLORS.textMuted}; margin: 16px 0;">
      + ${options.properties.length - 3} more properties
    </p>
    ` : ''}

    ${getCtaButton({ text: 'View All Matches', url: options.viewAllUrl })}
    ${getMinimalFooter({
      unsubscribeUrl: options.unsubscribeUrl,
      reason: `Alert from your saved search: "${options.searchName}"`
    })}
  `;

  return getBaseTemplate({
    content: getCardContainer(content),
    preheader: `${propertyCount} new ${propertyCount === 1 ? 'property matches' : 'properties match'} "${options.searchName}"`,
  });
};

export default {
  get3DHouseGraphic,
  getBaseTemplate,
  getCardContainer,
  getMinimalHeader,
  getPromoHero,
  getTextSection,
  getCtaButton,
  getStatsGrid,
  getPropertyCard,
  getMinimalFooter,
  getPromoTemplate,
  getTransactionalTemplate,
  getReportTemplate,
  getPropertyAlertTemplate,
  BRAND_COLORS,
};
