/**
 * The deleted first share picture (/og-image.png) answers "410 Gone", never an
 * image and never a cacheable page, so crawlers drop their stored copy.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { onRequest } from '@/functions/og-image.png';

describe('removed og-image.png', () => {
  it('answers 410 Gone without an image or a long cache', async () => {
    const response = onRequest();

    expect(response.status).toBe(410);
    expect(response.headers.get('content-type')).not.toMatch(/^image\//);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noimageindex');
    expect(await response.text()).toBe('This image has been removed.');
  });

  it('is not shipped as a static file or pointed to by the site shell', () => {
    expect(existsSync(resolve(__dirname, '../../public/og-image.png'))).toBe(false);
    const shell = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    expect(shell).not.toContain('og-image.png');
  });
});
