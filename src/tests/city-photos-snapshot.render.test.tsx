/**
 * Writes the City Photos screen's markup to a file for a browser screenshot.
 *
 * Not an assertion — a rendering harness. Run with
 * `CITY_PHOTOS_HTML_OUT=<path> npx vitest run src/tests/city-photos-snapshot.render.test.tsx`
 * and it dumps the DOM jsdom produced; a Chromium pass then loads it with the
 * built stylesheet to check the layout actually holds. Skipped unless that
 * variable is set, so it costs nothing in CI.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'node:fs';

const apiRequest = vi.fn();

vi.mock('@/src/shared/api', () => ({
    apiRequest: (...args: unknown[]) => apiRequest(...args),
    uploadRequest: vi.fn(),
}));

vi.mock('react-i18next', () => {
    const translate = (key: string, fallback?: unknown, options?: unknown) => {
        const template = typeof fallback === 'string' ? fallback : key;
        const vars = (typeof fallback === 'object' && fallback !== null ? fallback : options) as
            | Record<string, unknown>
            | undefined;
        return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? ''));
    };
    return {
        useTranslation: () => ({ t: translate, i18n: { language: 'en', changeLanguage: vi.fn() } }),
        Trans: ({ children }: { children: React.ReactNode }) => children,
        initReactI18next: { type: '3rdParty', init: vi.fn() },
    };
});

import CityPhotosManager from '../features/admin/components/CityPhotosManager';
import type { AdminCityPhoto } from '../features/admin/api/adminApi';

const OUT = process.env.CITY_PHOTOS_HTML_OUT;

const url = (name: string) =>
    `https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill/sample.jpg#${name}`;

const rows: AdminCityPhoto[] = [
    {
        city: 'Tirana', country: 'Albania', countryCode: 'AL', featured: true,
        imageUpdatedAt: '2026-08-30T00:00:00.000Z',
        active: { imageUrl: url('manual'), source: 'manual', credit: 'Photo by Jane Doe on Unsplash' },
        candidates: {
            manual: { imageUrl: url('manual'), source: 'manual', credit: 'Photo by Jane Doe on Unsplash' },
            cityGallery: { imageUrl: url('gallery'), source: 'city-gallery' },
            villaDestination: { imageUrl: url('villa'), source: 'villa-destination' },
            auto: { imageUrl: url('auto'), source: 'auto' },
        },
    },
    {
        city: 'Budva', country: 'Montenegro', countryCode: 'ME', featured: true,
        imageUpdatedAt: null,
        active: { imageUrl: url('auto2'), source: 'auto' },
        candidates: {
            manual: null,
            cityGallery: { imageUrl: url('gallery2'), source: 'city-gallery' },
            villaDestination: null,
            auto: { imageUrl: url('auto2'), source: 'auto' },
        },
    },
    {
        city: 'Prishtinë', country: 'Kosovo', countryCode: 'XK', featured: false,
        imageUpdatedAt: null,
        active: null,
        candidates: { manual: null, cityGallery: null, villaDestination: null, auto: null },
    },
];

describe.skipIf(!OUT)('City Photos rendering harness', () => {
    it('dumps the screen with an override, an inherited photo and no photo at all', async () => {
        apiRequest.mockResolvedValue({ cities: rows });

        const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
        const { container } = render(
            <QueryClientProvider client={client}><CityPhotosManager /></QueryClientProvider>,
        );

        await screen.findByText('Tirana');
        // The URL editor is collapsed by default; open one so the screenshot
        // covers the field row and its host hint too.
        (await screen.findAllByRole('button', { name: /Use a URL/i }))[0].click();
        await screen.findByLabelText(/Image URL/i);

        fs.writeFileSync(OUT!, container.innerHTML, 'utf-8');
        expect(fs.existsSync(OUT!)).toBe(true);
    });
});
