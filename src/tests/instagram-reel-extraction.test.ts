/**
 * Instagram's embed iframe waits for a tap before it plays, so a reel used as a
 * property tour opened as a still frame. The gallery now plays the file that
 * embed would itself play — which means reading a URL out of Instagram's markup.
 *
 * Instagram has carried that URL in several shapes over the years and serves
 * different ones to different clients, so the reader tries each known shape.
 * These tests pin every shape, and — since the result becomes the `src` of a
 * video element — that nothing outside Instagram's own CDN is ever returned.
 */

import { describe, it, expect } from 'vitest';
import { extractInstagramVideoUrl } from '@/backend/src/utils/instagramEmbed';

const CDN = 'https://scontent-vie1-1.cdninstagram.com/v/t50.2886-16/reel.mp4';

describe('reading the playable file out of an Instagram embed', () => {
  it('takes the URL from the JSON blob, unescaped', () => {
    const html = `<script>window.__d({"video_url":"https:\\/\\/scontent-vie1-1.cdninstagram.com\\/v\\/t50.2886-16\\/reel.mp4?efg=abc\\u0026oe=67890"})</script>`;
    // The slashes and the ampersand arrive escaped; a URL kept that way 404s.
    expect(extractInstagramVideoUrl(html)).toBe(`${CDN}?efg=abc&oe=67890`);
  });

  it('takes the first entry of a video_versions list', () => {
    const html = `{"video_versions":[{"type":101,"url":"${CDN}"},{"type":102,"url":"https://other.cdninstagram.com/low.mp4"}]}`;
    expect(extractInstagramVideoUrl(html)).toBe(CDN);
  });

  it.each([
    ['og:video meta', `<meta property="og:video" content="${CDN}" />`],
    ['og:video:secure_url meta', `<meta property="og:video:secure_url" content="${CDN}" />`],
    ['meta with the attributes reversed', `<meta content="${CDN}" property="og:video" />`],
    ['a plain video element', `<video src="${CDN}" playsinline></video>`],
  ])('takes the URL from %s', (_shape, html) => {
    expect(extractInstagramVideoUrl(html)).toBe(CDN);
  });

  it('accepts the fbcdn host Instagram also serves from', () => {
    const fbcdn = 'https://video-vie1-1.xx.fbcdn.net/v/t42/reel.mp4';
    expect(extractInstagramVideoUrl(`<video src="${fbcdn}"></video>`)).toBe(fbcdn);
  });

  it('returns nothing when the page carries no video', () => {
    // An ordinary outcome, not a failure: the gallery keeps Instagram's embed.
    const html = '<html><body><img src="https://scontent.cdninstagram.com/poster.jpg" /></body></html>';
    expect(extractInstagramVideoUrl(html)).toBeNull();
  });

  it.each([
    ['a host that is not Instagram', 'https://evil.example.com/payload.mp4'],
    ['a lookalike host', 'https://cdninstagram.com.evil.example.com/payload.mp4'],
    ['plain http', 'http://scontent.cdninstagram.com/reel.mp4'],
    ['a javascript url', 'javascript:alert(1)'],
  ])('refuses %s', (_case, url) => {
    // This value ends up as a video element's src, so the markup is never
    // trusted to name the host.
    expect(extractInstagramVideoUrl(`"video_url":"${url}"`)).toBeNull();
  });

  it('falls through a rejected candidate to a later shape that is valid', () => {
    const html = `"video_url":"https://evil.example.com/payload.mp4" <video src="${CDN}"></video>`;
    expect(extractInstagramVideoUrl(html)).toBe(CDN);
  });
});
