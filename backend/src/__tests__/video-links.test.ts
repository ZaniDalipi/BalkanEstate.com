/**
 * Videos are links only. "How it works" accepts YouTube links; the listing
 * video generator only validates its options (the file is downloaded, never
 * stored).
 */
process.env.SKIP_TEST_DB = 'true';

import { extractYouTubeId, toYouTubeEmbedUrl, validateYouTubeLink } from '../utils/videoLinks';
import { validateVideoRequest } from '../controllers/videoController';
import { publicIdFromVideoUrl } from '../scripts/removeStoredVideos';

describe('YouTube links', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ])('reads the id from %s', (url) => {
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    expect(toYouTubeEmbedUrl(url)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it.each([
    'https://res.cloudinary.com/demo/video/upload/v1/how.mp4',
    'https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'javascript:alert(1)',
    '',
  ])('rejects %s', (url) => {
    expect(validateYouTubeLink(url).isValid).toBe(false);
  });

  it('explains that files are not uploaded', () => {
    expect(validateYouTubeLink('https://example.com/video.mp4').error).toMatch(/not uploaded/);
  });
});

describe('validateVideoRequest', () => {
  it('fills defaults', () => {
    expect(validateVideoRequest({})).toEqual({
      isValid: true,
      value: {
        format: 'vertical',
        quality: 'mobile',
        duration: 3,
        includeWatermark: true,
        musicStyle: 'elegant',
        backgroundStyle: 'elegant',
      },
    });
  });

  it.each([
    [{ format: 'wide' }, /format/],
    [{ quality: '4k' }, /quality/],
    [{ duration: '5' }, /Duration/],
    [{ duration: 1 }, /Duration/],
    [{ musicStyle: 'metal' }, /music/],
    [{ backgroundStyle: 'neon' }, /background/],
    [{ includeWatermark: 'no' }, /includeWatermark/],
  ])('rejects %j', (body, message) => {
    const result = validateVideoRequest(body);
    expect(result.isValid).toBe(false);
    if (!result.isValid) expect(result.error).toMatch(message);
  });
});

describe('publicIdFromVideoUrl', () => {
  it('strips version and extension', () => {
    expect(
      publicIdFromVideoUrl('https://res.cloudinary.com/demo/video/upload/v1700000000/balkan-estate/users/u1/listings/p1/videos/showcase.mp4')
    ).toBe('balkan-estate/users/u1/listings/p1/videos/showcase');
  });

  it('ignores anything that is not a Cloudinary video', () => {
    expect(publicIdFromVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});
