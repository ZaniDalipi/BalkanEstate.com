/**
 * The fullscreen photo viewer changes photo through the WebGL morph where it
 * can. The plain <img> stays underneath for zoom and annotation. Without
 * WebGL (or with a refused context) the viewer looks exactly as before; a
 * single photo that cannot be textured (dead link, no CORS) costs only that
 * photo's morph, never the whole gallery's.
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
const canvasOpacity = () => layer()?.querySelector('canvas')?.style.opacity;
const fakeImage = () => ({ naturalWidth: 1600, naturalHeight: 1000 }) as HTMLImageElement;

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

  it('shows a photo it cannot texture as the plain photo, keeping the layer for the rest', async () => {
    withWebGL(fakeGl());
    loadTextureImage.mockImplementation(() => Promise.reject(new Error('no CORS')));
    renderViewer();
    await waitFor(() => expect(canvasOpacity()).toBe('0'));
    // The layer stays: the next photo that loads gets the morph again.
    expect(layer()).not.toBeNull();
    expect(screen.getByAltText('Property image {{current}} of {{total}}')).toBeTruthy();
  });

  it('keeps the morph when only a neighbouring photo is broken', async () => {
    withWebGL(fakeGl());
    loadTextureImage.mockImplementation((src) =>
      src.includes('/p1/') ? Promise.reject(new Error('404')) : Promise.resolve(fakeImage())
    );
    renderViewer();
    // Photo 0 is fine, so it is drawn even though photo 1 next to it failed.
    await waitFor(() => expect(canvasOpacity()).toBe('1'));
  });

  it('steps past a broken photo and resumes the morph on the next good one', async () => {
    withWebGL(fakeGl());
    loadTextureImage.mockImplementation((src) =>
      src.includes('/p1/') ? Promise.reject(new Error('404')) : Promise.resolve(fakeImage())
    );
    renderViewer();
    await waitFor(() => expect(canvasOpacity()).toBe('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    await waitFor(() => expect(canvasOpacity()).toBe('0'));
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    await waitFor(() => expect(canvasOpacity()).toBe('1'));
  });
});
