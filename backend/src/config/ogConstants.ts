/**
 * Constants for Open Graph / social media link preview generation.
 */

export const OG_BASE_URL = process.env.FRONTEND_URL ?? 'https://balkanestateai.com';

/** Supported language codes (must match frontend SUPPORTED_LANG_CODES). */
export const SUPPORTED_LANG_CODES = [
  'en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el',
] as const;

export type SupportedLangCode = typeof SUPPORTED_LANG_CODES[number];

/**
 * User-agent substrings that identify social media / link-preview crawlers.
 * These bots make a single HTTP request and parse meta tags — they do not
 * execute JavaScript, so they would otherwise see the generic homepage OG tags.
 */
export const BOT_UA_PATTERNS = [
  // Meta / Facebook
  'facebookexternalhit',
  'facebot',
  // X / Twitter
  'twitterbot',
  // LinkedIn
  'linkedinbot',
  // WhatsApp
  'whatsapp',
  // Telegram
  'telegrambot',
  // Slack
  'slackbot',
  // Discord
  'discordbot',
  // VK
  'vkshare',
  // Skype
  'skypeuripreview',
  // Pinterest
  'pinterest',
  // Apple / iMessage
  'applebot',
  // Search engines (also benefit from real OG tags)
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  // Wayback Machine
  'ia_archiver',
  // SEO tooling
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'rogerbot',
  'screaming frog',
] as const;

/** Cache duration (seconds) for OG HTML responses served to crawlers. */
export const OG_CACHE_MAX_AGE_SECONDS = 3600; // 1 hour
