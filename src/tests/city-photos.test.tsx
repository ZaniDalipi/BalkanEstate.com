/**
 * City photos — resolution chain and the admin screen that edits it.
 *
 * The point of both is that an admin's edit is visible. Before this, the UI
 * derived every city picture from a storage path built out of the city's
 * name, so the stored `imageUrl` was written by the backend and read by
 * nobody: editing a photo changed a database row and nothing else. These
 * pin the two halves — the stored URL is preferred, and the convention path is
 * still there behind it for the cities nobody has curated.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { cityImageSources } from '../features/cities/utils/cityImage';
import { validateCityPhoto } from '../shared/utils/validation';

const apiRequest = vi.fn();
const uploadRequest = vi.fn();

vi.mock('@/src/shared/api', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
  uploadRequest: (...args: unknown[]) => uploadRequest(...args),
}));

/**
 * The shared setup's `t` returns the key, which would make every assertion
 * here a translation key rather than the words on screen. This one honours the
 * inline English default and applies interpolation, so a button asserted by
 * its accessible name is asserted the way a reader finds it — and a dropped
 * `{{city}}` shows up as a failure instead of passing quietly.
 */
vi.mock('react-i18next', () => {
  const translate = (key: string, fallback?: unknown, options?: unknown) => {
    const template = typeof fallback === 'string' ? fallback : key;
    const vars = (typeof fallback === 'object' && fallback !== null ? fallback : options) as
      | Record<string, unknown>
      | undefined;
    return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(vars?.[name] ?? ''));
  };
  return {
    useTranslation: () => ({
      t: translate,
      i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});

import CityPhotosManager from '../features/admin/components/CityPhotosManager';
import type { AdminCityPhoto } from '../features/admin/api/adminApi';

// Must match VITE_CDN_HOST in vitest.config.ts.
const CDN = 'https://test-zone.b-cdn.net';

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe('cityImageSources', () => {
  it('puts the curated photo first and keeps the convention id behind it', () => {
    const sources = cityImageSources(
      { city: 'Tirana', country: 'Albania', imageUrl: 'https://images.example/tirana.jpg' },
      { width: 800, height: 400 },
    );

    expect(sources[0]).toBe('https://images.example/tirana.jpg');
    // Not merely a fallback for a broken URL: a city with no curated photo at
    // all still has to render, and that is what the convention id is for.
    expect(sources[1]).toContain('city-albania-tirana');
  });

  it('falls back to the convention id alone when nothing is curated', () => {
    const sources = cityImageSources({ city: 'Budva', country: 'Montenegro' }, { width: 400, height: 200 });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toContain('city-montenegro-budva');
  });

  it('resizes a curated photo to the box it fills', () => {
    const [first] = cityImageSources(
      {
        city: 'Split',
        country: 'Croatia',
        imageUrl: `${CDN}/balkan-estate/cities/city-split.webp`,
      },
      { width: 800, height: 400 },
    );

    // `crop: 'fill'` becomes an aspect ratio plus a width — see
    // config/imageConfig.ts, where the box is expressed that way because Bunny
    // letterboxes rather than crops when handed both dimensions.
    const params = new URL(first).searchParams;
    expect(params.get('width')).toBe('800');
    expect(params.get('aspect_ratio')).toBe('800:400');
  });

  it('passes a photo on a host we cannot transform through untouched', () => {
    const [first] = cityImageSources(
      { city: 'Ohrid', country: 'North Macedonia', imageUrl: 'https://upload.wikimedia.org/ohrid.jpg' },
      { width: 800, height: 400 },
    );

    expect(first).toBe('https://upload.wikimedia.org/ohrid.jpg');
  });

  it('refuses a stored value that has no business in an img src', () => {
    for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAA', '   ', 'https://a.example/x\njavascript:1']) {
      const sources = cityImageSources({ city: 'Skopje', country: 'North Macedonia', imageUrl: bad }, { width: 10, height: 10 });
      expect(sources.every(url => url.startsWith(CDN))).toBe(true);
    }
  });
});

describe('validateCityPhoto', () => {
  const CURATED = `${CDN}/balkan-estate/cities/x.webp`;

  it('accepts a plausible override', () => {
    expect(validateCityPhoto({
      city: 'Tirana', country: 'Albania', imageUrl: CURATED, imageCredit: 'Jane Doe',
    })).toEqual({ isValid: true });
  });

  it('requires https, not just a URL', () => {
    expect(validateCityPhoto({
      city: 'Tirana', country: 'Albania', imageUrl: CURATED.replace('https', 'http'),
    }).isValid).toBe(false);
  });

  it('rejects a host the CSP would blank out, with a reason', () => {
    // Saving one of these produced an empty frame and no explanation, which is
    // why the check is here and not only in the browser's console.
    const result = validateCityPhoto({ city: 'Tirana', country: 'Albania', imageUrl: 'https://images.example/x.jpg' });
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/b-cdn\.net/);
  });

  it('matches the host exactly, not as a suffix', () => {
    expect(validateCityPhoto({
      city: 'Tirana', country: 'Albania', imageUrl: 'https://test-zone.b-cdn.net.evil.example/x.jpg',
    }).isValid).toBe(false);
  });

  it('allows Wikimedia, where the automatic fallback chain already ends', () => {
    expect(validateCityPhoto({
      city: 'Tirana', country: 'Albania', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/x.jpg',
    }).isValid).toBe(true);
  });

  it('rejects an over-long URL or credit rather than letting the server truncate it', () => {
    expect(validateCityPhoto({
      city: 'Tirana', country: 'Albania',
      imageUrl: `${CDN}/balkan-estate/${'a'.repeat(2100)}`,
    }).isValid).toBe(false);

    expect(validateCityPhoto({
      city: 'Tirana', country: 'Albania', imageUrl: CURATED, imageCredit: 'c'.repeat(201),
    }).isValid).toBe(false);
  });

  it('rejects a missing photo', () => {
    expect(validateCityPhoto({ city: 'Tirana', country: 'Albania', imageUrl: '' }).isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The admin screen
// ---------------------------------------------------------------------------

const photoRow = (overrides: Partial<AdminCityPhoto> = {}): AdminCityPhoto => ({
    city: 'Tirana',
    country: 'Albania',
    countryCode: 'AL',
    featured: true,
    imageUpdatedAt: null,
    active: { imageUrl: `${CDN}/balkan-estate/cities/auto.webp`, source: 'auto' },
    candidates: {
        manual: null,
        cityGallery: { imageUrl: `${CDN}/balkan-estate/cities/gallery.webp`, source: 'city-gallery' },
        villaDestination: null,
        auto: { imageUrl: `${CDN}/balkan-estate/cities/auto.webp`, source: 'auto' },
    },
    ...overrides,
});

const renderManager = () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}><CityPhotosManager /></QueryClientProvider>);
};

describe('CityPhotosManager', () => {
    beforeEach(() => {
        apiRequest.mockReset();
        uploadRequest.mockReset();
    });

    it('offers a photo curated elsewhere for the same place', async () => {
        apiRequest.mockResolvedValue({ cities: [photoRow()] });
        renderManager();

        expect(await screen.findByRole('button', { name: /City Gallery/i })).toBeInTheDocument();
        // The photo already winning is not offered back to itself.
        expect(screen.queryByRole('button', { name: /Auto \(Wikipedia\)/i })).not.toBeInTheDocument();
    });

    it('adopting a candidate pins it as this city\'s own photo', async () => {
        apiRequest.mockResolvedValue({ cities: [photoRow()] });
        renderManager();

        fireEvent.click(await screen.findByRole('button', { name: /City Gallery/i }));

        await waitFor(() => {
            expect(apiRequest).toHaveBeenCalledWith('/admin/city-photos', expect.objectContaining({
                method: 'PUT',
                // Copied, not referenced: whoever curates villas or the gallery
                // must not be able to change a city's picture out from under it.
                body: expect.objectContaining({
                    city: 'Tirana',
                    country: 'Albania',
                    imageUrl: `${CDN}/balkan-estate/cities/gallery.webp`,
                }),
            }));
        });
    });

    it('refuses a non-https URL inline instead of sending it', async () => {
        apiRequest.mockResolvedValue({ cities: [photoRow()] });
        renderManager();

        fireEvent.click(await screen.findByRole('button', { name: /Use a URL/i }));
        fireEvent.change(screen.getByLabelText(/Image URL/i), {
            target: { value: 'http://images.example/x.jpg' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Save photo/i }));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(apiRequest).not.toHaveBeenCalledWith('/admin/city-photos', expect.objectContaining({ method: 'PUT' }));
    });

    it('offers Clear override only where an override exists', async () => {
        apiRequest.mockResolvedValue({ cities: [photoRow()] });
        const { unmount } = renderManager();
        await screen.findByText('Tirana');
        expect(screen.queryByRole('button', { name: /Clear override/i })).not.toBeInTheDocument();
        unmount();

        const manual = { imageUrl: `${CDN}/balkan-estate/cities/manual.webp`, source: 'manual' as const };
        apiRequest.mockResolvedValue({
            cities: [photoRow({ active: manual, candidates: { ...photoRow().candidates, manual } })],
        });
        renderManager();

        expect(await screen.findByRole('button', { name: /Clear override/i })).toBeInTheDocument();
    });

    it('filters to the cities nobody has reviewed', async () => {
        const manual = { imageUrl: `${CDN}/balkan-estate/cities/manual.webp`, source: 'manual' as const };
        apiRequest.mockResolvedValue({
            cities: [
                photoRow(),
                photoRow({ city: 'Budva', country: 'Montenegro', active: manual, candidates: { ...photoRow().candidates, manual } }),
            ],
        });
        renderManager();

        await screen.findByText('Budva');
        fireEvent.click(screen.getByRole('checkbox'));

        expect(screen.getByText('Tirana')).toBeInTheDocument();
        expect(screen.queryByText('Budva')).not.toBeInTheDocument();
    });

    it('says so when the list cannot be loaded, rather than showing an empty table', async () => {
        apiRequest.mockRejectedValue(new Error('offline'));
        renderManager();

        expect(await screen.findByRole('alert')).toHaveTextContent(/Failed to load city photos/i);
    });
});
