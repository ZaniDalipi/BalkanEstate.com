process.env.SKIP_TEST_DB = 'true';

import * as cheerio from 'cheerio';
import {
  MAX_LISTING_PHOTOS, isJunkPhotoUrl, keepListingFolder, photoKey, selectListingPhotos,
} from '../../services/listingAttributes/listingPhotos';
import { photosOnPage } from '../../services/listingAttributes/pagePhotos';

const site = 'https://agency.example';

describe('which images are listing photos', () => {
  it.each([
    '/wp-content/plugins/Classifieds/assets/img/flags/hr.png',
    '/wp-content/themes/selio/assets/images/markers/default.png',
    '/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    '/uploads/logo.png',
    '/img/icon-bed.svg',
    '/uploads/strict_cache/224x178photo.jpg',
    '/uploads/2024/05/house-150x150.jpg',
  ])('drops %s', (path) => {
    expect(isJunkPhotoUrl(`${site}${path}`)).toBe(true);
  });

  it('keeps real photos', () => {
    expect(isJunkPhotoUrl(`${site}/uploads/strict_cache/770x483224018393.jpg`)).toBe(false);
    expect(isJunkPhotoUrl(`${site}/source/Vlore-ALVS1455/marea-coast-3-ai-1.png`)).toBe(false);
  });

  it('gives every size of one photo the same key', () => {
    expect(photoKey(`${site}/c/1040x660224018383.jpg`)).toBe(photoKey(`${site}/c/770x483224018383.jpg`));
    expect(photoKey(`${site}/u/house-1024x768.jpg`)).toBe(photoKey(`${site}/u/house.jpg`));
    expect(photoKey(`${site}/u/house.jpg?w=400`)).toBe(photoKey(`${site}/u/house.jpg?w=1600`));
    expect(photoKey(`${site}/c/770x483224018383.jpg`)).not.toBe(photoKey(`${site}/c/770x483224018393.jpg`));
  });
});

describe('selectListingPhotos', () => {
  it('keeps each photo once, in its largest size, in page order', () => {
    const out = selectListingPhotos([
      `${site}/c/770x483111.jpg`, `${site}/c/770x483222.jpg`, `${site}/c/1040x660111.jpg`, `${site}/flags/us.png`,
    ]);
    expect(out).toEqual([`${site}/c/1040x660111.jpg`, `${site}/c/770x483222.jpg`]);
  });

  it(`never returns more than a listing may have (${MAX_LISTING_PHOTOS})`, () => {
    const many = Array.from({ length: 80 }, (_, i) => `${site}/uploads/photo-${i}.jpg`);
    expect(selectListingPhotos(many)).toHaveLength(MAX_LISTING_PHOTOS);
  });

  it("drops odd photos from other listings' folders", () => {
    const own = [1, 2, 3, 4].map((i) => `${site}/source/Vlore-ALVS1455/${i}.jpg`);
    const others = [`${site}/source/Vlore-ALV1010/a.jpg`, `${site}/source/Radhime-ALV057/b.jpg`];
    expect(keepListingFolder([...own, ...others])).toEqual(own);
    // Date folders say nothing about which listing a photo is of.
    const dated = [`${site}/uploads/2024/05/a.jpg`, `${site}/uploads/2024/05/b.jpg`, `${site}/uploads/2024/05/c.jpg`, `${site}/uploads/2023/11/d.jpg`];
    expect(keepListingFolder(dated)).toEqual(dated);
  });
});

describe('photosOnPage', () => {
  const page = `<html><body class="wp-custom-logo">
    <header><img src="/uploads/brand.png" alt="Agency"></header>
    <div class="ci sw_widget"><div class="property-imgs">
      <img src="/c/1040x660111.jpg"><img src="/c/770x483222.jpg"><img src="/c/770x483333.jpg">
    </div></div>
    <div class="similar-listings"><img src="/c/851x678999.jpg"></div>
    <div class="sw_win_map"><img src="/c/575x700111.jpg"></div>
    <div class="agent-card"><img src="/uploads/agent-portrait.jpg"></div>
    <footer><img src="/uploads/partner.jpg"></footer>
  </body></html>`;

  it("keeps the gallery and skips the similar listings, map, agent and footer", () => {
    expect(photosOnPage(cheerio.load(page), `${site}/listing/1`)).toEqual([
      `${site}/c/1040x660111.jpg`, `${site}/c/770x483222.jpg`, `${site}/c/770x483333.jpg`,
    ]);
  });
});
