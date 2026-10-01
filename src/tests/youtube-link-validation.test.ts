import { describe, it, expect } from 'vitest';
import { extractYouTubeId, validateYouTubeUrl } from '../shared/utils/validation';

/**
 * Site videos are YouTube links only — the admin form can no longer upload a
 * file, so the link check is the whole gate.
 */
describe('validateYouTubeUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ])('accepts %s', (url) => {
    expect(validateYouTubeUrl(url)).toEqual({ isValid: true });
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it.each([
    ['', 'Paste a YouTube link'],
    ['https://res.cloudinary.com/demo/video/upload/v1/how.mp4', 'Only YouTube links are supported (youtube.com or youtu.be)'],
    ['https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ', 'Only YouTube links are supported (youtube.com or youtu.be)'],
    ['not a url', 'Only YouTube links are supported (youtube.com or youtu.be)'],
  ])('rejects %j', (url, error) => {
    expect(validateYouTubeUrl(url)).toEqual({ isValid: false, error });
  });
});
