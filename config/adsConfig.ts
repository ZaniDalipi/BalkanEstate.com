/**
 * Ads & Sponsorship Configuration
 *
 * This file contains configuration for:
 * 1. Sponsored agencies that appear as floating logos on the landing page
 * 2. Google AdSense configuration for display ads
 * 3. Rotating sponsor banners on Buy/Sell cards
 */

// ============================================================================
// SPONSORED AGENCIES (Floating logos on landing page)
// ============================================================================

export interface SponsoredAgency {
  id: string;
  name: string;
  logo: string;
  url?: string;
  tagline?: string;
  tier: 'platinum' | 'gold' | 'silver'; // Affects size and prominence
}

/**
 * Sponsored agencies that appear as floating logos
 * - Platinum: Larger logos (60-80px), more instances
 * - Gold: Medium logos (45-60px)
 * - Silver: Smaller logos (35-45px)
 *
 * To add a new sponsor:
 * 1. Add their logo to /public/sponsors/ directory
 * 2. Add their entry to this array
 */
export const SPONSORED_AGENCIES: SponsoredAgency[] = [
  // ===== SAMPLE SPONSORS (Replace with real partner logos) =====
  {
    id: 'remax-balkan',
    name: 'RE/MAX Balkan',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/RE-MAX_Logo.svg/200px-RE-MAX_Logo.svg.png',
    url: 'https://remax.com',
    tagline: 'The Real Estate Leaders',
    tier: 'platinum',
  },
  {
    id: 'century21-serbia',
    name: 'Century 21 Serbia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Century_21_logo_2018.svg/200px-Century_21_logo_2018.svg.png',
    url: 'https://century21.com',
    tagline: 'Smarter. Bolder. Faster.',
    tier: 'platinum',
  },
  {
    id: 'keller-williams',
    name: 'Keller Williams',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Keller_Williams_Realty_logo.svg/200px-Keller_Williams_Realty_logo.svg.png',
    url: 'https://kw.com',
    tagline: 'Where Careers Grow',
    tier: 'gold',
  },
  {
    id: 'coldwell-banker',
    name: 'Coldwell Banker',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Coldwell_Banker_logo_2020.svg/200px-Coldwell_Banker_logo_2020.svg.png',
    url: 'https://coldwellbanker.com',
    tagline: 'Guiding People Home',
    tier: 'gold',
  },
  {
    id: 'sothebys-realty',
    name: "Sotheby's International",
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sotheby%27s_International_Realty_logo.svg/200px-Sotheby%27s_International_Realty_logo.svg.png',
    url: 'https://sothebysrealty.com',
    tagline: 'Artfully Uniting Extraordinary Homes',
    tier: 'silver',
  },
];

// ============================================================================
// ROTATING SPONSOR BANNERS (Overlay on Buy/Sell cards)
// ============================================================================

export interface SponsorBanner {
  id: string;
  agencyName: string;
  message: string; // e.g., "is selling premium homes on"
  logo?: string;
  accentColor?: string; // Gradient color for banner
}

/**
 * Rotating sponsor messages that appear on Buy/Sell card images
 * These rotate every 5 seconds with a smooth animation
 */
export const SPONSOR_BANNERS: SponsorBanner[] = [
  {
    id: 'remax-banner',
    agencyName: 'RE/MAX Balkan',
    message: 'is selling premium properties on',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/RE-MAX_Logo.svg/100px-RE-MAX_Logo.svg.png',
    accentColor: '#DC143C', // RE/MAX red
  },
  {
    id: 'century21-banner',
    agencyName: 'Century 21 Serbia',
    message: 'lists exclusive homes on',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Century_21_logo_2018.svg/100px-Century_21_logo_2018.svg.png',
    accentColor: '#BF9B30', // Century 21 gold
  },
  {
    id: 'kw-banner',
    agencyName: 'Keller Williams',
    message: 'partners with',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Keller_Williams_Realty_logo.svg/100px-Keller_Williams_Realty_logo.svg.png',
    accentColor: '#B82837', // KW red
  },
  {
    id: 'cb-banner',
    agencyName: 'Coldwell Banker',
    message: 'showcases luxury estates on',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Coldwell_Banker_logo_2020.svg/100px-Coldwell_Banker_logo_2020.svg.png',
    accentColor: '#012169', // CB blue
  },
  {
    id: 'local-agency',
    agencyName: 'Balkan Premium Realty',
    message: 'trusts',
    accentColor: '#0252CD', // BalkanEstate blue
  },
];

// ============================================================================
// GOOGLE ADSENSE CONFIGURATION
// ============================================================================

export interface AdSenseConfig {
  clientId: string; // Your AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
  enabled: boolean;
  testMode: boolean; // Show test ads in development
}

export const ADSENSE_CONFIG: AdSenseConfig = {
  // Replace with your actual AdSense publisher ID
  clientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-XXXXXXXXXXXXXXXX',
  enabled: import.meta.env.VITE_ADSENSE_ENABLED === 'true',
  testMode: import.meta.env.DEV || import.meta.env.VITE_ADSENSE_TEST_MODE === 'true',
};

/**
 * Ad slot configurations for different placements
 * Each slot ID corresponds to an ad unit created in your AdSense account
 */
export interface AdSlot {
  id: string;
  slotId: string; // AdSense ad unit ID
  format: 'auto' | 'rectangle' | 'vertical' | 'horizontal' | 'fluid';
  responsive: boolean;
  minWidth?: number;
  minHeight?: number;
}

export const AD_SLOTS: Record<string, AdSlot> = {
  // Horizontal banner at top/bottom of pages
  leaderboard: {
    id: 'leaderboard',
    slotId: import.meta.env.VITE_AD_SLOT_LEADERBOARD || '1234567890',
    format: 'horizontal',
    responsive: true,
    minHeight: 90,
  },
  // Rectangle ads in sidebar or between content
  rectangle: {
    id: 'rectangle',
    slotId: import.meta.env.VITE_AD_SLOT_RECTANGLE || '0987654321',
    format: 'rectangle',
    responsive: true,
    minWidth: 300,
    minHeight: 250,
  },
  // In-feed ads between property listings
  inFeed: {
    id: 'in-feed',
    slotId: import.meta.env.VITE_AD_SLOT_INFEED || '1122334455',
    format: 'fluid',
    responsive: true,
  },
  // Sidebar vertical ads
  sidebar: {
    id: 'sidebar',
    slotId: import.meta.env.VITE_AD_SLOT_SIDEBAR || '5544332211',
    format: 'vertical',
    responsive: true,
    minWidth: 160,
    minHeight: 600,
  },
};

// ============================================================================
// AD DISPLAY SETTINGS
// ============================================================================

export const AD_SETTINGS = {
  // Floating logos settings
  floatingLogos: {
    enabled: true,
    instancesPerSponsor: {
      platinum: 3,
      gold: 2,
      silver: 1,
    },
    sizeRange: {
      platinum: { min: 50, max: 70 },
      gold: { min: 40, max: 55 },
      silver: { min: 30, max: 45 },
    },
    opacity: 0.25, // Logo opacity (0-1)
  },

  // Sponsor banner rotation settings
  sponsorBanner: {
    enabled: true,
    rotationInterval: 5000, // ms between rotations
    animationDuration: 500, // ms for fade transition
  },

  // AdSense display settings
  adsense: {
    refreshInterval: 60000, // ms between ad refreshes (min 60s per AdSense policy)
    lazyLoad: true, // Load ads only when visible
    lazyLoadThreshold: 200, // px before viewport to start loading
  },
};
