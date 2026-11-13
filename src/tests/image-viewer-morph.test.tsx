/**
 * The fullscreen photo viewer changes photo through the WebGL morph where it
 * can. The plain <img> stays underneath for zoom and annotation, and the
 * viewer must look exactly as before wherever the morph cannot run: no WebGL,
 * a refused context, or a photo that cannot be textured (no CORS).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { isAuthenticated: true, currentUser: { id: 'u1' } }, dispatch: vi.fn() }),
}));
vi.mock('../../services/apiService', () => ({
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
  uploadMessageImage: vi.fn(),
}));
vi.mock('@/src/app/router/navigation', () => ({ navigate: vi.fn() }));

// Photos never finish loading in jsdom; each test decides how a load ends.
const loadTextureImage = vi.fn((_src: string) => new Promise<HTMLImageElement>(() => {}));
vi.mock('@/src/components/ui/morph-gallery/morphGl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/components/ui/morph-gallery/morphGl')>();
  return { ...actual, loadTextureImage: (src: string) => loadTextureImage(src) };
});

import ImageViewerModal from '../features/property-details/components/ImageViewerModal';

/** Enough of a WebGL context for the program to "compile": every call succeeds. */
const fakeGl = () =>
  new Proxy({} as Record<string, unknown>, {
    get: (_t, prop: string) => {
      if (/^[A-Z_0-9]+$/.test(prop)) return 0;
      if (prop === 'getShaderParameter' || prop === 'getProgramParameter') return () => true;
      return () => ({});
    },
  });

const photo = (n: number) => `https://media.test/listing/p${n}/original.jpg`;
const images = Array.from({ length: 8 }, (_, i) => ({ url: photo(i), tag: 'other' }));

const renderViewer = () =>
  render(<ImageViewerModal images={images} startIndex={0} onClose={() => undefined} />);

const layer = () => document.querySelector<HTMLElement>('[data-testid="viewer-morph-layer"]');

const withWebGL = (context: unknown) => {
  vi.stubGlobal('WebGLRenderingContext', class {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as RenderingContext);
};

beforeEach(() => {
  cleanup();
  loadTextureImage.mockReset();
  loadTextureImage.mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ImageViewerModal morph transition', () => {
  it('is absent in a browser without WebGL, leaving the plain viewer', () => {
    renderViewer();
    expect(layer()).toBeNull();
    expect(screen.getByAltText('Property image {{current}} of {{total}}')).toBeTruthy();
  });

  it('lays the morph canvas over the photo, without taking its pointer events', () => {
    withWebGL(fakeGl());
    renderViewer();
    expect(layer()?.querySelector('canvas')).not.toBeNull();
    expect(layer()?.className).toContain('pointer-events-none');
    // The real photo stays mounted underneath for zoom, annotation and the styler.
    expect(screen.getByAltText('Property image {{current}} of {{total}}')).toBeTruthy();
  });

  it('textures only the visible photo and its neighbours, from the viewer-sized CDN source', () => {
    withWebGL(fakeGl());
    renderViewer();
    const requested = loadTextureImage.mock.calls.map(([src]) => src);
    expect(requested).toHaveLength(5);
    expect(requested[0]).toContain('/listing/p0/');
    requested.forEach((src) => expect(src).toMatch(/^https:\/\/media\.test\/.*\/w1920\.webp$/));
  });

  it('hides while zoomed, so the plain photo is what gets zoomed', () => {
    withWebGL(fakeGl());
    renderViewer();
    expect(layer()?.className).not.toContain('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(layer()?.className).toContain('hidden');
  });

  it('hides while annotating, so the drawing sits on the plain photo', () => {
    withWebGL(fakeGl());
    renderViewer();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle annotation mode' }));
    expect(layer()?.className).toContain('hidden');
  });

  it('removes itself when the browser refuses a WebGL context', async () => {
    withWebGL(null);
    renderViewer();
    await waitFor(() => expect(layer()).toBeNull());
  });

  it('removes itself when a photo cannot be textured', async () => {
    withWebGL(fakeGl());
    loadTextureImage.mockImplementation(() => Promise.reject(new Error('no CORS')));
    renderViewer();
    await waitFor(() => expect(layer()).toBeNull());
  });
});
