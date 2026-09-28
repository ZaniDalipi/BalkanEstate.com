process.env.SKIP_TEST_DB = 'true';

import { Types } from 'mongoose';
import { buildSocialCaption, listingUrlFor, MAX_CAPTION_LENGTH } from '../services/social/socialCaption';
import { instagramImageUrl, getSocialConfig } from '../services/social/socialPublisher';

const mockPublishPage = jest.fn();
const mockPublishInstagram = jest.fn();
const mockFindById = jest.fn();

jest.mock('../services/social/socialPublisher', () => {
  const actual = jest.requireActual('../services/social/socialPublisher');
  return {
    ...actual,
    publishToFacebookPage: (...a: unknown[]) => mockPublishPage(...a),
    publishToInstagram: (...a: unknown[]) => mockPublishInstagram(...a),
  };
});
jest.mock('../models/SocialPost', () => ({
  __esModule: true,
  default: { findById: (...a: unknown[]) => mockFindById(...a) },
}));

import { approveSocialPost, setSocialPostStatus } from '../services/social/socialQueueService';

const listing = {
  _id: 'abc123',
  title: 'Sea-view apartment',
  listingType: 'sale' as const,
  price: 125000,
  city: 'Durrës',
  country: 'Albania',
  beds: 2,
  baths: 1,
  sqft: 85,
  description: 'Bright apartment a few steps from the beach.',
};

describe('buildSocialCaption', () => {
  const url = listingUrlFor('https://balkanestateai.com/', 'abc123');

  it('builds the listing URL without a double slash', () => {
    expect(url).toBe('https://balkanestateai.com/property/abc123');
  });

  it('includes headline, place, price, facts, link and hashtags', () => {
    const caption = buildSocialCaption(listing, url);
    expect(caption).toContain('🏡 Sea-view apartment');
    expect(caption).toContain('📍 Durrës, Albania');
    expect(caption).toContain('💶 €125,000');
    expect(caption).toContain('🛏 2 beds · 🛁 1 bath · 📐 85 m²');
    expect(caption).toContain(`👉 ${url}`);
    expect(caption).toContain('#BalkanEstate #ForSale #DurresRealEstate #Albania');
  });

  it('shows the rent period and "price on request"', () => {
    expect(buildSocialCaption({ ...listing, listingType: 'rent', price: 600 }, url)).toContain('€600/month');
    expect(buildSocialCaption({ ...listing, isNegotiable: true }, url)).toContain('Price on request');
  });

  it('falls back to a generated headline and skips missing facts', () => {
    const caption = buildSocialCaption(
      { _id: 'x', propertyType: 'luxury-villa', listingType: 'sale', price: 1, city: 'Budva' },
      url
    );
    expect(caption.startsWith('🏡 Luxury villa for sale in Budva')).toBe(true);
    expect(caption).not.toContain('🛏');
    expect(caption).not.toMatch(/\n{3,}/);
  });

  it('never exceeds the Instagram caption limit', () => {
    const caption = buildSocialCaption({ ...listing, description: 'word '.repeat(2000) }, url);
    expect(caption.length).toBeLessThanOrEqual(MAX_CAPTION_LENGTH);
    expect(caption).toContain('…');
  });
});

describe('instagramImageUrl', () => {
  it('asks Cloudinary for a square JPEG', () => {
    expect(instagramImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.webp')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1080,h_1080,f_jpg,q_auto/v1/a.webp'
    );
  });
  it('leaves other hosts alone', () => {
    expect(instagramImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });
});

const makePost = (overrides: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  status: 'pending',
  caption: 'Original',
  listingUrl: 'https://balkanestateai.com/property/1',
  imageUrls: ['https://example.com/1.jpg'],
  channels: { facebookPage: { state: 'not_sent' }, instagram: { state: 'not_sent' } },
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('approveSocialPost', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FACEBOOK_PAGE_ID = '111';
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token';
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = '222';
  });
  afterAll(() => {
    process.env = env;
  });

  it('reports which channels are configured', () => {
    delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    expect(getSocialConfig()).toMatchObject({ facebookPage: true, instagram: false });
  });

  it('publishes the edited caption and records each channel result', async () => {
    const post = makePost();
    mockFindById.mockResolvedValue(post);
    mockPublishPage.mockResolvedValue({ postId: '111_9', postUrl: 'https://www.facebook.com/111_9' });
    mockPublishInstagram.mockRejectedValue(new Error('Invalid image'));

    await approveSocialPost(String(post._id), { caption: '  Edited  ', channels: ['facebookPage', 'instagram'] });

    expect(mockPublishPage).toHaveBeenCalledWith('Edited', post.listingUrl);
    expect(post.status).toBe('approved');
    expect(post.channels.facebookPage).toMatchObject({ state: 'posted', postId: '111_9' });
    expect(post.channels.instagram).toMatchObject({ state: 'failed', error: 'Invalid image' });
    expect(post.save).toHaveBeenCalled();
  });

  it('retries only failed channels and skips unconfigured ones', async () => {
    delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const post = makePost({
      status: 'approved',
      channels: { facebookPage: { state: 'posted', postId: '1' }, instagram: { state: 'failed' } },
    });
    mockFindById.mockResolvedValue(post);

    await approveSocialPost(String(post._id), { channels: ['facebookPage', 'instagram'] });

    expect(mockPublishPage).not.toHaveBeenCalled();
    expect(mockPublishInstagram).not.toHaveBeenCalled();
  });

  it('refuses an empty caption and a rejected post', async () => {
    mockFindById.mockResolvedValue(makePost());
    await expect(approveSocialPost(String(new Types.ObjectId()), { caption: '   ' })).rejects.toThrow(
      'Caption cannot be empty'
    );
    mockFindById.mockResolvedValue(makePost({ status: 'rejected' }));
    await expect(approveSocialPost(String(new Types.ObjectId()), {})).rejects.toThrow('rejected');
  });

  it('will not reject a post that is already live', async () => {
    mockFindById.mockResolvedValue(makePost({ channels: { facebookPage: { state: 'posted' }, instagram: {} } }));
    await expect(setSocialPostStatus(String(new Types.ObjectId()), 'rejected')).rejects.toThrow('Already published');
  });
});
