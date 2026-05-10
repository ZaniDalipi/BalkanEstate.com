/**
 * Extract structured listing data from a detail-page HTML document.
 * Used by the normalizer to enrich data scraped from index/agency pages with
 * the much-richer information typically present on each listing's detail page:
 *
 *   1. JSON-LD            (most authoritative — schema.org RealEstateListing)
 *   2. OpenGraph meta     (og:title, og:image, og:description, product:price:amount)
 *   3. Schema.org microdata via itemprop attributes
 *   4. <meta itemprop> / Twitter cards
 *   5. Image gallery       (img.src, srcset, data-src, og:image array)
 *
 * Only fields that aren't already populated in `base` get filled in, so
 * data extracted from the index card is treated as preferred.
 */
import * as cheerio from 'cheerio';

type Mapped = Record<string, unknown>;

const setIfMissing = (target: Mapped, key: string, value: unknown): void => {
  if (value == null || value === '') return;
  if (target[key] !== undefined && target[key] !== null && target[key] !== '') return;
  target[key] = value;
};

const pushImages = (target: Mapped, urls: string[]): void => {
  if (!urls.length) return;
  const existing = Array.isArray(target.images) ? (target.images as unknown[]) : [];
  const existingUrls = new Set<string>(
    existing
      .map(i => (typeof i === 'string' ? i : (i as { url?: string })?.url))
      .filter((u): u is string => typeof u === 'string')
  );
  const merged = [...existing];
  for (const u of urls) {
    if (!u || existingUrls.has(u)) continue;
    if (u.startsWith('data:')) continue;
    merged.push(u);
    existingUrls.add(u);
  }
  if (merged.length) target.images = merged;
};

const resolveUrl = (base: string, href: string): string => {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

/** Walk a JSON-LD node (which may be an array or have @graph) and extract listing-like properties. */
const extractFromJsonLdNode = (node: Record<string, unknown>, base: string, target: Mapped): void => {
  // Resolve @graph wrappers
  if (Array.isArray(node['@graph'])) {
    for (const sub of node['@graph']) {
      if (sub && typeof sub === 'object') extractFromJsonLdNode(sub as Record<string, unknown>, base, target);
    }
    return;
  }
  // Pick whichever schema.org property is meaningful.
  setIfMissing(target, 'title', node.name);
  setIfMissing(target, 'description', node.description);

  const offers = node.offers;
  if (offers && typeof offers === 'object') {
    const o = offers as Record<string, unknown>;
    setIfMissing(target, 'price', o.price ?? o.lowPrice ?? o.highPrice);
    setIfMissing(target, 'priceCurrency', o.priceCurrency);
  } else if (typeof offers === 'string' || typeof offers === 'number') {
    setIfMissing(target, 'price', offers);
  }

  const address = node.address;
  if (address && typeof address === 'object') {
    const a = address as Record<string, unknown>;
    setIfMissing(target, 'address', a.streetAddress);
    setIfMissing(target, 'city', a.addressLocality);
    setIfMissing(target, 'country', a.addressCountry);
    setIfMissing(target, 'postalCode', a.postalCode);
  } else if (typeof address === 'string') {
    setIfMissing(target, 'address', address);
  }

  const geo = node.geo;
  if (geo && typeof geo === 'object') {
    const g = geo as Record<string, unknown>;
    setIfMissing(target, 'lat', g.latitude);
    setIfMissing(target, 'lng', g.longitude);
  }

  const floorSize = node.floorSize;
  if (floorSize && typeof floorSize === 'object') {
    setIfMissing(target, 'sqft', (floorSize as Record<string, unknown>).value);
  }

  setIfMissing(target, 'beds', node.numberOfRooms ?? node.numberOfBedrooms);
  setIfMissing(target, 'baths', node.numberOfBathroomsTotal ?? node.numberOfFullBathrooms);
  setIfMissing(target, 'yearBuilt', node.yearBuilt);
  setIfMissing(target, 'propertyType', node['@type']);

  // Images can be a string, an array of strings, or array of ImageObject.
  const images = node.image;
  const imgUrls: string[] = [];
  if (typeof images === 'string') imgUrls.push(resolveUrl(base, images));
  else if (Array.isArray(images)) {
    for (const im of images) {
      if (typeof im === 'string') imgUrls.push(resolveUrl(base, im));
      else if (im && typeof im === 'object') {
        const u = (im as { url?: unknown }).url ?? (im as { contentUrl?: unknown }).contentUrl;
        if (typeof u === 'string') imgUrls.push(resolveUrl(base, u));
      }
    }
  }
  pushImages(target, imgUrls);
  if (imgUrls.length && !target.imageUrl) target.imageUrl = imgUrls[0];
};

const extractJsonLd = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    try {
      const data = JSON.parse(txt) as unknown;
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && typeof item === 'object') extractFromJsonLdNode(item as Record<string, unknown>, base, target);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
};

const extractOpenGraph = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  const meta = (prop: string): string | undefined => {
    const el = $(`meta[property="${prop}"], meta[name="${prop}"]`).first();
    const v = el.attr('content');
    return v ? v.trim() : undefined;
  };
  setIfMissing(target, 'title', meta('og:title') ?? meta('twitter:title'));
  setIfMissing(target, 'description', meta('og:description') ?? meta('twitter:description'));
  setIfMissing(target, 'price', meta('product:price:amount') ?? meta('og:price:amount'));
  setIfMissing(target, 'priceCurrency', meta('product:price:currency') ?? meta('og:price:currency'));
  setIfMissing(target, 'city', meta('og:locality') ?? meta('place:location:locality'));
  setIfMissing(target, 'country', meta('og:country-name'));
  setIfMissing(target, 'lat', meta('og:latitude') ?? meta('place:location:latitude'));
  setIfMissing(target, 'lng', meta('og:longitude') ?? meta('place:location:longitude'));

  // og:image may appear multiple times — collect all.
  const ogImages: string[] = [];
  $('meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c) ogImages.push(resolveUrl(base, c.trim()));
  });
  pushImages(target, ogImages);
  if (ogImages.length && !target.imageUrl) target.imageUrl = ogImages[0];
};

/** Extract microdata via [itemprop] attributes. */
const extractMicrodata = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  const prop = (name: string): string | undefined => {
    const el = $(`[itemprop="${name}"]`).first();
    if (!el.length) return undefined;
    return (el.attr('content') ?? el.attr('href') ?? el.text() ?? '').trim() || undefined;
  };
  setIfMissing(target, 'title', prop('name'));
  setIfMissing(target, 'description', prop('description'));
  setIfMissing(target, 'price', prop('price'));
  setIfMissing(target, 'priceCurrency', prop('priceCurrency'));
  setIfMissing(target, 'address', prop('streetAddress'));
  setIfMissing(target, 'city', prop('addressLocality'));
  setIfMissing(target, 'country', prop('addressCountry'));
  setIfMissing(target, 'lat', prop('latitude'));
  setIfMissing(target, 'lng', prop('longitude'));

  const microImages: string[] = [];
  $('[itemprop="image"]').each((_, el) => {
    const u = $(el).attr('src') ?? $(el).attr('content') ?? $(el).attr('href');
    if (u) microImages.push(resolveUrl(base, u));
  });
  pushImages(target, microImages);
};

/**
 * When the same image appears in multiple resolutions via query params (e.g.
 * ?w=400 and ?w=1200), keep only the largest version to maximise quality.
 */
const deduplicateImageUrls = (urls: string[]): string[] => {
  // Group by the URL with size-related query params stripped.
  const groups = new Map<string, { url: string; score: number }>();
  for (const u of urls) {
    let base = u;
    let score = 0;
    try {
      const parsed = new URL(u);
      // Score by explicit width/height params — prefer larger
      const w = parseInt(parsed.searchParams.get('w') ?? parsed.searchParams.get('width') ?? '0', 10);
      const h = parseInt(parsed.searchParams.get('h') ?? parsed.searchParams.get('height') ?? '0', 10);
      score = w || h;
      // Key = URL without size params
      ['w', 'width', 'h', 'height', 'size', 'thumb', 'resize', 'dim'].forEach(p => parsed.searchParams.delete(p));
      base = parsed.toString();
    } catch { /* keep url as-is */ }
    const existing = groups.get(base);
    if (!existing || score > existing.score) groups.set(base, { url: u, score });
  }
  return Array.from(groups.values()).map(g => g.url);
};

/** Pull every reasonable image URL from <img> tags on the page (with srcset & lazy-load support). */
const extractGalleryImages = ($: cheerio.CheerioAPI, base: string, target: Mapped): void => {
  const found: string[] = [];
  $('img').each((_, el) => {
    const $el = $(el);
    // Try every common lazy-load attr in priority order
    const candidate =
      $el.attr('src') ??
      $el.attr('data-src') ??
      $el.attr('data-lazy-src') ??
      $el.attr('data-original') ??
      $el.attr('data-lazy') ??
      $el.attr('data-image');
    if (candidate) found.push(resolveUrl(base, candidate));

    // srcset: pick the largest
    const srcset = $el.attr('srcset') ?? $el.attr('data-srcset');
    if (srcset) {
      const parts = srcset.split(',').map(p => p.trim());
      let best: { url: string; width: number } | null = null;
      for (const p of parts) {
        const [u, w] = p.split(/\s+/);
        const width = parseInt((w ?? '0').replace(/\D/g, ''), 10) || 0;
        if (!best || width > best.width) best = { url: u, width };
      }
      if (best) found.push(resolveUrl(base, best.url));
    }
  });
  // <source srcset> inside <picture> — prefer the largest descriptor
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (!srcset) return;
    const parts = srcset.split(',').map(p => p.trim());
    let best: { url: string; width: number } | null = null;
    for (const p of parts) {
      const [u, w] = p.split(/\s+/);
      const width = parseInt((w ?? '0').replace(/\D/g, ''), 10) || 0;
      if (!best || width > best.width) best = { url: u, width };
    }
    if (best) found.push(resolveUrl(base, best.url));
  });

  // Swiper, Fancybox, Slick, Lightbox and other gallery widgets store the
  // full-resolution URL in data attributes on slide/thumbnail wrappers.
  const galleryAttrSelectors = [
    '[data-image]', '[data-src]', '[data-original]', '[data-image-url]',
    '[data-gallery-image]', '[data-photo]', '[data-full]', '[data-full-image]',
    '[data-fancybox]', '[data-fancybox-href]', '[data-lightbox]',
    '[data-swiper-slide-index]', // Swiper slide — pull src from inner <img> instead
    '.swiper-slide img', '.slick-slide img', '.flexslider li img',
    '.gallery-item img', '.gallery-image img', '.fancybox img',
    'a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"], a[href$=".webp"]',
  ];
  for (const selector of galleryAttrSelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const tag = (el as { tagName?: string }).tagName?.toLowerCase();
      // For anchor tags pointing to images — use href
      if (tag === 'a') {
        const href = $el.attr('href') ?? $el.attr('data-fancybox-href');
        if (href) found.push(resolveUrl(base, href));
        return;
      }
      // For img tags — prefer explicit data attrs, then src
      let url = $el.attr('data-full') ?? $el.attr('data-full-image') ??
        $el.attr('data-src') ?? $el.attr('data-original') ??
        $el.attr('data-image') ?? $el.attr('data-image-url') ??
        $el.attr('src');
      if (!url) {
        const bg = $el.attr('style');
        if (bg) {
          const match = bg.match(/url\(['"]?([^'")\]]+)['"]?\)/i);
          if (match) url = match[1];
        }
      }
      if (url) found.push(resolveUrl(base, url));
    });
  }

  // Also scan for JSON gallery arrays embedded in page scripts (common in WP/custom RE sites)
  $('script:not([src])').each((_, el) => {
    const src = $(el).html() ?? '';
    // Look for arrays of image URLs in JS variables
    const urlPattern = /["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/gi;
    let m: RegExpExecArray | null;
    while ((m = urlPattern.exec(src)) !== null) {
      found.push(m[1]);
    }
  });

  // Filter out tracking pixels, icons, thumbnails, and non-listing images.
  const meaningful = found.filter((u) => {
    const lower = u.toLowerCase();
    // Skip tracking pixels and 1x1 spacers
    if (/[?&](w|width|h|height)=1\b/.test(lower)) return false;
    // Skip common icon/logo/avatar paths
    if (/(\/icon|\/logo|\/avatar|\/sprite|\/blank|\/pixel|\/spacer|\/placeholder|\/thumb[s]?\/[^/]*[_-]\d{1,3}x\d{1,3})/i.test(lower)) return false;
    // Skip known tracker domains
    if (/(doubleclick|google-analytics|facebook\.net\/tr|pixel\.)/i.test(lower)) return false;
    // Skip very small thumbnail hints in URL parameters
    if (/[?&](size|dim|thumb|resize)=\d{1,3}\b/i.test(lower)) return false;
    return true;
  });

  // Deduplicate: prefer higher-resolution variant when a URL appears in multiple
  // sizes via query params (e.g. ?w=400 vs ?w=1200 — keep ?w=1200).
  const deduped = deduplicateImageUrls(found.filter((u) => {
    const lower = u.toLowerCase();
    if (/[?&](w|width|h|height)=1\b/.test(lower)) return false;
    if (/(\/icon|\/logo|\/avatar|\/sprite|\/blank|\/pixel|\/spacer|\/placeholder|\/thumb[s]?\/[^/]*[_-]\d{1,3}x\d{1,3})/i.test(lower)) return false;
    if (/(doubleclick|google-analytics|facebook\.net\/tr|pixel\.)/i.test(lower)) return false;
    if (/[?&](size|dim|thumb|resize)=\d{1,3}\b/i.test(lower)) return false;
    return true;
  }));
  pushImages(target, deduped);
  void meaningful; // meaningful kept for potential future use
};

const extractStructuredPriceFromHtml = ($: cheerio.CheerioAPI, target: Mapped): void => {
  if (target.price) return;
  // Look for common price displays in HTML
  const selectors = ['[data-price]', '[data-list-price]', '[data-asking-price]', '.price', '.listing-price', '[itemprop="price"]'];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const val = el.attr('data-price') ?? el.attr('data-list-price') ?? el.attr('data-asking-price') ?? el.text();
      if (val) {
        target.price = val.trim();
        return;
      }
    }
  }
};

const extractStructuredLocationFromHtml = ($: cheerio.CheerioAPI, target: Mapped): void => {
  // Extract address/city/country from structured elements if not already present
  if (!target.address) {
    const addrEl = $('[itemprop="streetAddress"]').first();
    if (addrEl.length) target.address = addrEl.text().trim();
  }
  if (!target.city) {
    const cityEl = $('[itemprop="addressLocality"]').first();
    if (cityEl.length) target.city = cityEl.text().trim();
  }
  if (!target.country) {
    const countryEl = $('[itemprop="addressCountry"]').first();
    if (countryEl.length) target.country = countryEl.text().trim();
  }
};

/**
 * Extract fields from Balkan/Croatian real estate label-value block patterns.
 *
 * Many Croatian and regional sites (premium-nekretnine, njuskalo, etc.) render
 * detail pages as icon-boxes or definition lists with a human-readable label
 * ("Lokacija", "Cijena", "Površina") and a value next to or below it.
 * We scan common DOM patterns and map them to canonical fields.
 */
const extractBalkanLabelValues = ($: cheerio.CheerioAPI, baseUrl: string, target: Mapped): void => {
  // Normalise a label string to a lookup key.
  const normLabel = (s: string) => s.toLowerCase().replace(/[^a-zčćšđžáéíóú0-9]/gi, '').trim();

  const LABEL_MAP: Record<string, string> = {
    // Price
    'cijena': 'price', 'cena': 'price', 'ciena': 'price', 'price': 'price', 'preis': 'price',
    'prodajnacijjena': 'price', 'prodajnacena': 'price',
    // Area / floor size
    'površina': 'sqft', 'povrsina': 'sqft', 'površinainterijera': 'sqft',
    'stambenapovrš': 'sqft', 'interijor': 'sqft', 'quadrature': 'sqft',
    'površinaokućnice': 'plotSqm', 'okućnica': 'plotSqm', 'okucnica': 'plotSqm',
    'plotarea': 'plotSqm', 'groundarea': 'plotSqm', 'landarea': 'plotSqm',
    // Bedrooms
    'spavaćesobe': 'beds', 'spavacesobe': 'beds', 'sobe': 'beds', 'broj soba': 'beds',
    'bedrooms': 'beds', 'schlafzimmer': 'beds', 'chambres': 'beds',
    // Bathrooms
    'kupatilo': 'baths', 'kupatila': 'baths', 'wc': 'baths', 'bathrooms': 'baths',
    // Location / city
    'lokacija': 'city', 'location': 'city', 'mjesto': 'city', 'grad': 'city',
    // Property type
    'vrstanekretnine': 'propertyType', 'vrstaponude': 'propertyType', 'tip': 'propertyType',
    'type': 'propertyType',
    // Year built
    'godišnjaizgradnje': 'yearBuilt', 'godinaizgradnje': 'yearBuilt', 'yearbuilt': 'yearBuilt',
    'baujahr': 'yearBuilt',
    // Floor
    'kat': 'floor', 'sprat': 'floor', 'etaž': 'floor', 'floor': 'floor',
    // Distance to sea (Croatian sites often show this)
    'udaljenostodmora': 'distanceToSea', 'udaljenostdoumora': 'distanceToSea',
    'distancetosea': 'distanceToSea', 'distancefromsea': 'distanceToSea',
    'distanzameer': 'distanceToSea', 'odmorja': 'distanceToSea',
  };

  const applyLabelValue = (labelRaw: string, valueRaw: string): void => {
    const key = normLabel(labelRaw);
    const field = LABEL_MAP[key];
    if (!field || !valueRaw.trim()) return;

    const v = valueRaw.trim();
    if (field === 'price' && !target.price) {
      target.price = v;
    } else if (field === 'sqft' && !target.sqft) {
      // Extract numeric part from "180 m²"
      const m = v.match(/(\d[\d.,\s]*)/);
      if (m) {
        const n = parseFloat(m[1].replace(/[\s.]/g, '').replace(',', '.'));
        if (n >= 10 && n <= 50_000) target.sqft = n;
      }
    } else if (field === 'plotSqm' && !target.plotSqm) {
      const m = v.match(/(\d[\d.,\s]*)/);
      if (m) {
        const n = parseFloat(m[1].replace(/[\s.]/g, '').replace(',', '.'));
        if (n >= 1 && n <= 500_000) target.plotSqm = n;
      }
    } else if (field === 'beds' && !target.beds) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 20) target.beds = n;
    } else if (field === 'baths' && !target.baths) {
      const n = parseInt(v, 10);
      if (n >= 1 && n <= 10) target.baths = n;
    } else if (field === 'city' && !target.city) {
      // "Malinska, Malinska-Dubašnica" → take first segment as city
      target.city = v.split(/[,/]/)[0].trim();
      if (!target.address) target.address = v;
    } else if (field === 'propertyType' && !target.propertyType) {
      target.propertyType = v;
    } else if (field === 'yearBuilt' && !target.yearBuilt) {
      const n = parseInt(v, 10);
      if (n >= 1800 && n <= 2100) target.yearBuilt = n;
    } else if (field === 'floor' && !target.floor) {
      target.floor = v;
    } else if (field === 'distanceToSea' && !target.distanceToSea) {
      // "1500 m" → 1500 (metres)
      const m = v.match(/(\d[\d.,\s]*)/);
      if (m) {
        const n = parseFloat(m[1].replace(/[\s.]/g, '').replace(',', '.'));
        if (n >= 1 && n <= 100_000) target.distanceToSea = n;
      }
    }
  };

  // Pattern 1: <dt>Label</dt><dd>Value</dd>
  $('dl dt, dl th').each((_, el) => {
    const label = $(el).text().trim();
    const value = $(el).next('dd, td').text().trim();
    if (label && value) applyLabelValue(label, value);
  });

  // Pattern 2: table rows <tr><th>Label</th><td>Value</td></tr>
  $('tr').each((_, el) => {
    const cells = $(el).find('th, td');
    if (cells.length >= 2) {
      applyLabelValue($(cells[0]).text().trim(), $(cells[1]).text().trim());
    }
  });

  // Pattern 3: sibling elements where one has class containing "label"/"naziv"/"opis"
  // and the adjacent sibling is the value — e.g. <span class="label">Cijena</span><span class="value">…</span>
  const labelSelectors = [
    '[class*="label"]:not(label)',
    '[class*="naziv"]',
    '[class*="opis-polja"]',
    '[class*="field-label"]',
    '[class*="prop-label"]',
    '[class*="info-label"]',
    '[class*="detail-label"]',
  ];
  for (const sel of labelSelectors) {
    $(sel).each((_, el) => {
      const label = $(el).text().trim();
      const value = ($(el).next().text() ?? '').trim() || ($(el).siblings('[class*="value"],[class*="vrijednost"],[class*="field-value"],[class*="prop-value"]').first().text() ?? '').trim();
      if (label && value) applyLabelValue(label, value);
    });
  }

  // Pattern 4: icon-box grid — parent div contains both label and value as child elements.
  // e.g.: <div class="info-box"><div class="value">180 m²</div><div class="label">Površina</div></div>
  const boxSelectors = [
    '[class*="info-box"]',
    '[class*="property-feature"]',
    '[class*="detail-item"]',
    '[class*="listing-detail"]',
    '[class*="spec-item"]',
    '[class*="feature-item"]',
    '[class*="attr-item"]',
  ];
  for (const sel of boxSelectors) {
    $(sel).each((_, el) => {
      const children = $(el).children();
      // Try all combinations of 2 child elements
      const texts: string[] = [];
      children.each((__, ch) => {
        const t = $(ch).text().trim();
        if (t) texts.push(t);
      });
      if (texts.length >= 2) {
        // Try label=last child, value=first (and vice versa) since layouts differ
        applyLabelValue(texts[texts.length - 1], texts[0]);
        applyLabelValue(texts[0], texts[texts.length - 1]);
      }
    });
  }

  void baseUrl; // not needed here but keeps the signature consistent
};

/**
 * Smart text extraction with strict context. Only fills target fields that
 * weren't already populated by JSON-LD/OG/microdata (the more reliable sources).
 *
 * Conservative on purpose: we'd rather miss a field than fabricate one. False
 * positives have a real cost — they end up as wrong data in the listings page.
 */
const extractSmartFieldsFromText = ($: cheerio.CheerioAPI, target: Mapped): void => {
  // Strip noise (navigation, scripts, styles, footer) before scanning so we
  // don't pick up "20 results", "5 stars", site-wide phone numbers, etc.
  const $clone = cheerio.load($.html());
  $clone('nav, header, footer, script, style, noscript, .menu, .navigation, .breadcrumb, .header, .footer, .nav, .ads, .advert, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Prefer the main content area; fall back to body if no main is identified.
  const mainScope = $clone('main, article, [itemtype*="Product"], [itemtype*="Place"], [class*="listing"], [class*="property"], [id*="listing"], [id*="property"]').first();
  const scope = mainScope.length ? mainScope : $clone('body');

  const textContent = scope
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  if (!textContent || textContent.length < 20) return;

  // Helper: parse a numeric string and validate against a sane range.
  const parseRanged = (s: string, min: number, max: number, allowDecimals = false): number | null => {
    const cleaned = allowDecimals ? s.replace(',', '.') : s.replace(/[.,\s]/g, '');
    const n = allowDecimals ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return n;
  };

  // Smart price extraction — currency must be adjacent to a sufficiently large number.
  if (target.price == null || target.price === '') {
    const pricePatterns = [
      /(?:€|EUR|\$|USD|£|GBP|RSD|kn|HRK|BAM|MKD)\s*([\d][\d.,\s]*[\d](?:\s*[KMB])?)(?!\d)/i,
      /(?<!\d)([\d][\d.,\s]*[\d](?:\s*[KMB])?)\s*(?:€|EUR|\$|USD|£|GBP|RSD|kn|HRK|BAM|MKD)\b/i,
    ];
    for (const re of pricePatterns) {
      const m = textContent.match(re);
      if (!m) continue;
      const numStr = m[1].replace(/[^\d.,KMB]/gi, '');
      const num = parseFloat(numStr.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
      if (!Number.isFinite(num) || num < 100 || num > 100_000_000) continue;
      target.price = m[0].trim();
      break;
    }
  }

  // Beds — require word boundary, reject anything outside 1..15.
  // Prefer "spavaće sobe" (sleeping rooms = bedrooms) over bare "sobe" (rooms).
  if (target.beds == null || target.beds === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:bed(?:room)?s?|spava[cć][ae]\s+sobe?|soba|sobi|sobe|chambre[s]?|habitaci[oó]n(?:es)?|zimmer|schlafzimmer)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 15);
      if (n != null) target.beds = n;
    }
  }

  // Baths — full words only; `wc` is too prone to false matches.
  if (target.baths == null || target.baths === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:bath(?:room)?s?|kupatil[ao]?|toilets?|salle\s+de\s+bain|badezimmer|ba[nñ]os?)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 10);
      if (n != null) target.baths = n;
    }
  }

  // Area — require explicit m² / m2 / sqm unit and avoid letter-prefixed false hits.
  if (target.sqft == null || target.sqft === '') {
    const m = textContent.match(
      /(?<![A-Za-z])(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s*m\.?|square\s*meters?|qm|kvadrata?)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 10, 50_000, true);
      if (n != null) target.sqft = n;
    }
  }

  // Living rooms — explicit phrase only.
  if (target.livingRooms == null || target.livingRooms === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:living\s+rooms?|sitting\s+rooms?|dnevn[ai]\s+sob[ae]|wohnzimmer|salon)s?\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 5);
      if (n != null) target.livingRooms = n;
    }
  }

  // Parking — explicit "parking" or "garage" with a count, not a free-floating number.
  if (target.parking == null || target.parking === '') {
    const m = textContent.match(
      /(?<![.\d])(\d{1,2})\s*(?:parking\s+(?:spots?|spaces?|places?)|parking\s+lots?|parkir(?:ali[sš]ta?|no\s+mjesto)|garage[s]?|garaž[ae]|stellpl[aä]tze?)\b/i
    );
    if (m) {
      const n = parseRanged(m[1], 1, 10);
      if (n != null) target.parking = n;
    }
  }
};

/**
 * Main entry point. Mutates `target` in-place with any fields it can extract
 * from the supplied detail-page HTML. Returns the same object for chaining.
 */
export const enrichFromDetailHtml = (
  html: string,
  baseUrl: string,
  target: Mapped
): Mapped => {
  if (!html || typeof html !== 'string') return target;
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return target;
  }
  // Order matters: JSON-LD is most authoritative, then OG, then microdata, then
  // Balkan label-value blocks, then gallery images, then structured patterns,
  // finally smart text extraction (lowest priority fallback).
  extractJsonLd($, baseUrl, target);
  extractOpenGraph($, baseUrl, target);
  extractMicrodata($, baseUrl, target);
  extractBalkanLabelValues($, baseUrl, target);
  extractGalleryImages($, baseUrl, target);
  extractStructuredPriceFromHtml($, target);
  extractStructuredLocationFromHtml($, target);
  extractSmartFieldsFromText($, target);
  return target;
};
