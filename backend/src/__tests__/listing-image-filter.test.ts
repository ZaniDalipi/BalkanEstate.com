process.env.SKIP_TEST_DB = 'true';

import { enrichFromDetailHtml } from '../services/listingHtmlEnricher';
import {
  MAX_IMPORTED_IMAGES,
  cleanImportedImageUrls,
  isJunkImageUrl,
} from '../services/listingImageFilter';

/**
 * Feed detail pages are scraped broadly, so the photo list must drop site
 * chrome (flags, logos, agent portraits) and never exceed the per-listing
 * photo limit a manual upload has.
 */
describe('isJunkImageUrl', () => {
  it.each([
    'https://c21.al/wp-content/plugins/sitepress-multilingual-cms/res/flags/en.png',
    'https://c21.al/wp-content/uploads/2024/01/flag-al.jpg',
    'https://c21.al/wp-content/uploads/2024/01/century21-logo.png',
    'https://c21.al/wp-content/themes/everest/images/pin.png',
    'https://c21.al/wp-content/uploads/2024/01/house-150x150.jpg',
    'https://c21.al/images/whatsapp.png',
    'https://c21.al/uploads/avatar/agent-12.jpg',
    'https://secure.gravatar.com/avatar/abc.jpg',
    'https://maps.googleapis.com/maps/api/staticmap?center=41,19',
    'https://c21.al/uploads/icons/bed.svg',
    'https://c21.al/spinner.gif',
    'data:image/png;base64,AAAA',
  ])('rejects %s', (url) => {
    expect(isJunkImageUrl(url)).toBe(true);
  });

  it.each([
    'https://c21.al/wp-content/uploads/2024/01/IMG_2034.jpg',
    'https://c21.al/wp-content/uploads/2024/01/villa-pool-1024x768.jpg',
    'https://cdn.example.com/listings/8812/living-room.webp?w=1200',
    'https://c21.al/wp-content/uploads/2024/01/country-house-garden.jpg',
  ])('keeps %s', (url) => {
    expect(isJunkImageUrl(url)).toBe(false);
  });
});

describe('cleanImportedImageUrls', () => {
  it('drops junk and duplicates and caps at the listing photo limit', () => {
    const photos = Array.from({ length: 76 }, (_, i) => `https://c21.al/uploads/photo-${i}.jpg`);
    const urls = ['https://c21.al/flags/sq.png', photos[0], photos[0], ...photos];
    const cleaned = cleanImportedImageUrls(urls);
    expect(cleaned).toHaveLength(MAX_IMPORTED_IMAGES);
    expect(cleaned[0]).toBe(photos[0]);
    expect(new Set(cleaned).size).toBe(cleaned.length);
    expect(cleaned).not.toContain('https://c21.al/flags/sq.png');
  });
});

describe('detail page gallery extraction', () => {
  it('ignores images in the header, language switcher, agent card and related listings', () => {
    const html = `
      <html><body class="lang-sq">
        <header class="site-header">
          <img src="/uploads/brand.jpg">
          <div class="wpml-ls"><img src="/uploads/sq.jpg"><img src="/uploads/en.jpg"></div>
        </header>
        <main>
          <div class="property-gallery swiper">
            <div class="swiper-slide"><img src="/uploads/a.jpg"></div>
            <div class="swiper-slide"><img src="/uploads/b.jpg"></div>
          </div>
          <div class="agent-card"><img src="/uploads/jane.jpg"></div>
          <section class="related-properties"><img src="/uploads/other-listing.jpg"></section>
        </main>
        <script>var all = ["https://c21.al/uploads/script-only.jpg"];</script>
      </body></html>`;
    const target = enrichFromDetailHtml(html, 'https://c21.al/property/1', {}) as { images?: string[] };
    expect(target.images).toEqual(['https://c21.al/uploads/a.jpg', 'https://c21.al/uploads/b.jpg']);
  });
});
