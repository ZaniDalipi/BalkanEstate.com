/**
 * News covers are chosen without uploading anything: a City Gallery photo when
 * the article names one of our cities, else the article's own image link.
 */
process.env.SKIP_TEST_DB = 'true';

import { findGalleryCity, pickNewsCover, usableImageUrl, type GalleryCity } from '../services/news/newsCover';

const gallery: GalleryCity[] = [
  { city: 'Tirana', country: 'Albania', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/tirana.jpg' },
  { city: 'Novi Sad', country: 'Serbia', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/novi-sad.jpg' },
  { city: 'Split', country: 'Croatia', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/split.jpg' },
  { city: 'Sarajevo', country: 'Bosnia & Herzegovina', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sarajevo.jpg' },
];

const article = (overrides: Partial<Parameters<typeof pickNewsCover>[0]> = {}) => ({
  title: 'Housing prices rise',
  excerpt: '',
  country: 'Albania',
  articleUrl: 'https://news.example.com/2026/09/story',
  ...overrides,
});

describe('pickNewsCover', () => {
  it('uses the City Gallery photo when the title names a gallery city', () => {
    expect(pickNewsCover(article({ title: 'Tirana apartment prices climb' }), gallery)).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/tirana.jpg',
      source: 'city-gallery',
    });
  });

  it('prefers the gallery over the article image', () => {
    const cover = pickNewsCover(article({ title: 'Tirana boom', ogImage: 'https://news.example.com/og.jpg' }), gallery);
    expect(cover?.source).toBe('city-gallery');
  });

  it('falls back to the article image, kept as a link', () => {
    expect(pickNewsCover(article({ ogImage: 'https://news.example.com/og.jpg' }), gallery)).toEqual({
      url: 'https://news.example.com/og.jpg',
      source: 'article',
    });
  });

  it('resolves a relative og:image against the article page', () => {
    expect(pickNewsCover(article({ ogImage: '/img/cover.jpg' }), gallery)?.url).toBe('https://news.example.com/img/cover.jpg');
  });

  it('uses a same-country gallery photo when there is nothing else', () => {
    expect(pickNewsCover(article(), gallery)).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/tirana.jpg',
      source: 'country-gallery',
    });
  });

  it('treats "and" and "&" in country names as the same country', () => {
    expect(pickNewsCover(article({ country: 'Bosnia and Herzegovina' }), gallery)?.source).toBe('country-gallery');
  });

  it('returns null when nothing fits', () => {
    expect(pickNewsCover(article({ country: 'Romania' }), gallery)).toBeNull();
  });
});

describe('findGalleryCity', () => {
  it('matches whole words and prefers the longer name', () => {
    expect(findGalleryCity('New towers in Novi Sad', gallery, 'Serbia')?.city).toBe('Novi Sad');
  });

  it('ignores a city name used as an ordinary word in another country', () => {
    expect(findGalleryCity('A split market in Belgrade', gallery, 'Serbia')).toBeNull();
  });

  it('ignores accents', () => {
    const accented = [{ ...gallery[0], city: 'Tiranë' }];
    expect(findGalleryCity('Tirane rents', accented, 'Albania')?.city).toBe('Tiranë');
  });
});

describe('usableImageUrl', () => {
  it.each([
    ['data:image/png;base64,AAA', null],
    ['javascript:alert(1)', null],
    ['https://news.example.com/logo.svg', null],
    ['http://news.example.com/a.jpg', 'https://news.example.com/a.jpg'],
  ])('%s → %s', (raw, expected) => {
    expect(usableImageUrl(raw)).toBe(expected);
  });
});
