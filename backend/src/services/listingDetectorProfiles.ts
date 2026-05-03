/**
 * Site-specific CSS selector profiles for the most common Balkan real-estate
 * portals. These are used by the detector when the URL's host matches a known
 * domain, providing much more accurate field extraction than the generic
 * heuristic.
 *
 * Selectors are relative to the listing-card root unless noted.
 * Use "|attr:X" suffix to read an attribute (e.g. "a|attr:href" or "img|attr:src").
 */

export interface SiteProfile {
  /** One or more CSS selectors (comma-separated) for a single listing card. */
  listingItem: string;
  /** Selector (within card) for the anchor that links to the detail page. */
  link: string;
  title?: string;
  price?: string;
  image?: string;
  location?: string;
  sqft?: string;
  /** CSS selector for the "next page" anchor on the index / results page. */
  nextPageSelector?: string;
  /** URL query param to use for page-number pagination (e.g. "page", "strana"). */
  pageParam?: string;
}

/**
 * Keys are lower-cased hostname substrings. Checked with String.includes()
 * so "nekretnine.hr" also matches "www.nekretnine.hr" and
 * "stari.nekretnine.hr".
 */
export const BALKAN_SITE_PROFILES: Record<string, SiteProfile> = {

  // ── Croatia ────────────────────────────────────────────────────────────────

  /**
   * nekretnine.hr  (largest Croatian portal, Django/server-rendered)
   * Agency page: /en/agencije-nekretnina/{id}/
   * Listing cards are inside <article class="regular-ad-container"> or
   * <div class="real-estate-ad"> depending on section.
   */
  'nekretnine.hr': {
    listingItem: 'article.regular-ad-container, article.real-estate-ad, div.real-estate-ad',
    link: 'a.listing--title, h3.product-title a, h2 a, a.listing-title',
    title: 'h3.product-title, a.listing--title, h2',
    price: 'strong.price-value, .price-box strong, [class*="price-value"]',
    image: 'img[class*="listing-"], img[class*="thumb"], img.main-image|attr:src',
    location: '.listing--location, .ad-location, [class*="location"]',
    sqft: '[class*="size"], [class*="surface"], [class*="povrsina"]',
    nextPageSelector: 'a[rel="next"], .pagination a.next, a[class*="next-page"]',
  },

  /**
   * njuskalo.hr  (Croatian classifieds, has anti-scraping; server-rendered)
   * Real-estate listings: /nekretnine/
   */
  'njuskalo.hr': {
    listingItem: 'li.EntityList-item--Regular, li.EntityList-item, article.entity-body',
    link: 'a.entity-description-title, h3 a, a.title-link',
    title: '.entity-description-title, h3',
    price: '.price-box--regular, .price, [class*="price"]',
    image: 'img.entity-thumbnail|attr:src, img[class*="thumb"]|attr:src',
    location: '.entity-description-location, [class*="location"]',
    nextPageSelector: 'a[rel="next"], li.pagination__item--next a',
  },

  /**
   * crozilla.com  (Croatian property portal)
   */
  'crozilla.com': {
    listingItem: '.listing-search-item, article.property-item, .search-result-item',
    link: 'a.property-title, h2 a, h3 a',
    title: 'h2.property-title, h3, [class*="title"]',
    price: '[class*="price"], .price-value, strong',
    image: 'img[class*="property"]|attr:src, img[class*="listing"]|attr:src',
    location: '[class*="location"], [class*="address"], .city',
    nextPageSelector: 'a[rel="next"], .pagination .next',
  },

  /**
   * imovina.hr  (Croatian portal)
   */
  'imovina.hr': {
    listingItem: '.listing-item, .property-card, article.ad',
    link: 'a.listing-title, h3 a, a[class*="title"]',
    title: 'h3, [class*="title"]',
    price: '[class*="price"], .price',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  // ── Serbia ─────────────────────────────────────────────────────────────────

  /**
   * 4zida.rs  (major Serbian portal, partly React-based)
   * Listing cards: <div class="listing-item"> or <article data-cy="listing">
   */
  '4zida.rs': {
    listingItem: '[data-cy="listing-item"], .listing-item, article.property',
    link: 'a[data-cy="listing-title"], h2 a, h3 a, a[class*="title"]',
    title: '[data-cy="listing-title"], h2, h3',
    price: '[data-cy="listing-price"], .price, [class*="price"]',
    image: 'img[class*="listing"]|attr:src, img[class*="photo"]|attr:src, img|attr:src',
    location: '[data-cy="listing-location"], [class*="location"]',
    sqft: '[data-cy="listing-size"], [class*="size"]',
    nextPageSelector: 'a[rel="next"], [data-cy="next-page"] a',
    pageParam: 'page',
  },

  /**
   * halooglasi.com  (Serbian classifieds giant, server-rendered)
   */
  'halooglasi.com': {
    listingItem: '.classified, .classified--real-estate, li.classified, .product-item',
    link: 'h3 a, a.classified-title, a[class*="title"]',
    title: 'h3, .classified-title, [class*="title"]',
    price: '.price-full, .price, [class*="price"]',
    image: 'img.classified-image|attr:data-src, img[class*="photo"]|attr:src, img|attr:src',
    location: '.location-text, [class*="location"]',
    sqft: '[class*="kvadrat"], [class*="surface"]',
    nextPageSelector: '.pager a.next, a[rel="next"]',
    pageParam: 'page',
  },

  /**
   * beznekretnina.rs  (Serbian portal with agency/private listings)
   */
  'beznekretnina.rs': {
    listingItem: '.real-estate-item, .listing-item, .property-item, article',
    link: 'a.listing-title, h3 a, h2 a',
    title: 'h3, h2, [class*="title"]',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"], .pagination a.next',
    pageParam: 'page',
  },

  /**
   * cityexpert.rs  (Belgrade agency portal, React/Next.js)
   * Data is often in __NEXT_DATA__ so the JSON extractor runs first;
   * these selectors serve as HTML fallback.
   */
  'cityexpert.rs': {
    listingItem: '[class*="listing-item"], [class*="PropertyCard"], article',
    link: 'a[class*="title"], h2 a, h3 a',
    title: '[class*="title"], h2, h3',
    price: '[class*="price"], [class*="Price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"], [class*="next"] a',
    pageParam: 'page',
  },

  /**
   * indomio.rs  (Immobiliare Group — Italian network, covers Serbia)
   * Uses .in-listingcardimmolist for cards.
   */
  'indomio.rs': {
    listingItem: '.in-listingcardimmolist, [class*="listingcard"], article',
    link: 'a[class*="ListingCard"], h2 a, a[class*="title"]',
    title: '[class*="title"], h2',
    price: '[class*="price"], [class*="Price"]',
    image: 'img[class*="ImageCard"]|attr:src, img|attr:src',
    location: '[class*="location"], [class*="Location"]',
    sqft: '[class*="surface"], [class*="size"]',
    nextPageSelector: 'a[rel="next"], [class*="next"]',
    pageParam: 'pag',
  },

  /**
   * kupujem-prodajem.com / kupujemprodajem.com  (Serbian classifieds)
   */
  'kupujem-prodajem.com': {
    listingItem: '.kp-ad-container, .classified, .ad-item',
    link: 'a.kp-title, h3 a, a[class*="title"]',
    title: '.kp-title, h3',
    price: '.price-box, .price, [class*="price"]',
    image: 'img[class*="ad-photo"]|attr:src, img|attr:src',
    nextPageSelector: 'a[rel="next"], .pagination a.next',
    pageParam: 'page',
  },
  'kupujemprodajem.com': {
    listingItem: '.kp-ad-container, .classified, .ad-item',
    link: 'a.kp-title, h3 a, a[class*="title"]',
    title: '.kp-title, h3',
    price: '.price-box, .price, [class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
    pageParam: 'page',
  },

  // ── Bulgaria ───────────────────────────────────────────────────────────────

  /**
   * imot.bg  (Bulgaria's largest portal — classic table-based layout)
   * Listings use <a> tags with hrefs that include "pcgi/form.cgi"
   * Each row/block is a <td> in a results table.
   */
  'imot.bg': {
    listingItem: 'tr.result, table.listResult td, .advert-table td, td[class*="adv"]',
    link: 'a[href*="form.cgi"], a[class*="offer"], a.title',
    title: 'a[class*="offer"], .title, a',
    price: '.price, [class*="price"], td:last-child',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"], a[class*="next"]',
    pageParam: 'page',
  },

  /**
   * homes.bg  (Bulgarian property portal)
   */
  'homes.bg': {
    listingItem: '.listing-item, .property-card, article.property',
    link: 'a.listing-title, h3 a, h2 a',
    title: 'h3, h2, [class*="title"]',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
    pageParam: 'page',
  },

  /**
   * alo.bg  (Bulgarian classifieds)
   */
  'alo.bg': {
    listingItem: '.classified-item, .ad-item, .search-item',
    link: 'a.ad-title, h3 a, a[class*="title"]',
    title: 'h3, .ad-title',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  // ── Slovenia ───────────────────────────────────────────────────────────────

  /**
   * nepremicnine.net  (Slovenia's main portal — confirmed selector .oglas_container)
   */
  'nepremicnine.net': {
    listingItem: '.oglas_container, .oglas-container, .ad-container, li.oglas',
    link: 'a.title, h2 a, h3 a, a[class*="oglas"]',
    title: 'h2, h3, a.title',
    price: '[class*="price"], .cena',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"], .pagination a.next',
    pageParam: 'page',
  },

  /**
   * bolha.com  (Slovenian classifieds — confirmed selector .EntityList-item)
   */
  'bolha.com': {
    listingItem: '.EntityList-item--Regular, .EntityList-item, .ad, li.ad',
    link: 'a.entity-description-title, h3 a, a[class*="title"]',
    title: '.entity-description-title, h3',
    price: '.price-box, .price, [class*="price"]',
    image: 'img[class*="entity"]|attr:src, img|attr:src',
    location: '.entity-description-location, [class*="location"]',
    nextPageSelector: 'a[rel="next"], li.pagination__item--next a',
    pageParam: 'page',
  },

  /**
   * realestate.si / siol.net  (Slovenian sites)
   */
  'realestate.si': {
    listingItem: '.listing-item, .property-item, article',
    link: 'h3 a, a[class*="title"]',
    title: 'h3, [class*="title"]',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  // ── Bosnia & Herzegovina ───────────────────────────────────────────────────

  /**
   * nekretnine.ba  (Bosnia's main portal)
   */
  'nekretnine.ba': {
    listingItem: '.ad-thumb-area, .listing-item, .property-item, article.ad',
    link: 'a.ad-thumb-title, h3 a, h2 a',
    title: 'h3, h2, .ad-thumb-title',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
    pageParam: 'strana',
  },

  /**
   * nekretnine.com.ba
   */
  'nekretnine.com.ba': {
    listingItem: '.listing-item, .property-item, article',
    link: 'h3 a, a[class*="title"]',
    title: 'h3',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  // ── Montenegro ────────────────────────────────────────────────────────────

  /**
   * nekretnine.me  (Montenegrin portal)
   */
  'nekretnine.me': {
    listingItem: '.listing-item, .ad-item, .property-item, article',
    link: 'a.listing-title, h3 a',
    title: 'h3, [class*="title"]',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
    pageParam: 'page',
  },

  /**
   * oglasnik.me  (Montenegrin classifieds)
   */
  'oglasnik.me': {
    listingItem: '.classified, .listing-item, .ad',
    link: 'h3 a, a[class*="title"]',
    title: 'h3',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  // ── North Macedonia ────────────────────────────────────────────────────────

  /**
   * pazar3.mk  (Macedonian classifieds — largest portal)
   */
  'pazar3.mk': {
    listingItem: '.listing-item, .classified, .ad-item, article',
    link: 'h2 a, h3 a, a[class*="title"]',
    title: 'h2, h3',
    price: '[class*="price"], [class*="cena"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
    pageParam: 'page',
  },

  /**
   * reklama5.mk  (Macedonian real-estate focused portal)
   */
  'reklama5.mk': {
    listingItem: '.ad-item, .listing-item, .classified, .result-item',
    link: 'a[class*="title"], h3 a',
    title: 'h3, [class*="title"]',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  /**
   * cup.com.mk  (Macedonian property portal)
   */
  'cup.com.mk': {
    listingItem: '.property, .listing-item, article',
    link: 'h3 a, a[class*="title"]',
    title: 'h3',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  // ── Albania & Kosovo ───────────────────────────────────────────────────────

  /**
   * merrjep.com  (Albanian classifieds)
   */
  'merrjep.com': {
    listingItem: '.listing, .ad-item, li.classified',
    link: 'a.title, h3 a',
    title: 'h3, .title',
    price: '.price, [class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
    pageParam: 'page',
  },

  /**
   * njoftime.com  (Albanian classifieds)
   */
  'njoftime.com': {
    listingItem: '.classified-item, .ad-item, article',
    link: 'h3 a, a[class*="title"]',
    title: 'h3',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },

  /**
   * shtepine.com  (Kosovo property portal)
   */
  'shtepine.com': {
    listingItem: '.property-item, .listing-item, article',
    link: 'h3 a, a[class*="title"]',
    title: 'h3',
    price: '[class*="price"]',
    image: 'img|attr:src',
    nextPageSelector: 'a[rel="next"]',
  },
};

/** Find a matching site profile for a given absolute URL. */
export const findSiteProfile = (url: string): SiteProfile | null => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [key, profile] of Object.entries(BALKAN_SITE_PROFILES)) {
    if (hostname === key || hostname.endsWith(`.${key}`)) return profile;
  }
  return null;
};
