/**
 * The screen a seller sees the instant their listing goes live. The listing is
 * already saved by then, so this screen's only job is to be readable and to
 * hand the seller over to their dashboard — it must never blank out, never show
 * an empty line while the encouragements rotate, and never lose the headline
 * because a locale is missing a key.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: unknown) =>
            (typeof fallback === 'string' ? fallback : key.split('.').pop() ?? key),
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
}));

import ListingSuccessCelebration from '@/src/features/seller/components/ListingSuccessCelebration';

const LOCALES = ['en', 'sq', 'bs', 'bg', 'hr', 'el', 'mk', 'me', 'ro', 'sr'];
const LOCALES_DIR = path.resolve(__dirname, '../i18n/locales');

/** Every key the celebration reads, relative to the `success` object. */
const SUCCESS_KEYS = [
    'publishedTitle',
    'publishedSubtitle',
    'updatedTitle',
    'updatedSubtitle',
    'redirecting',
    'chips.visible',
    'chips.alerts',
    'chips.messages',
    'encouragement.live',
    'encouragement.photos',
    'encouragement.notify',
    'encouragement.proud',
    'encouragement.updatedLive',
    'encouragement.updatedFresh',
    'encouragement.updatedNotify',
];

const lookup = (bundle: unknown, key: string): unknown =>
    key.split('.').reduce<unknown>(
        (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
        bundle,
    );

describe('ListingSuccessCelebration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('confirms the listing is live and says what happens next', () => {
        render(<ListingSuccessCelebration isEdit={false} />);

        expect(screen.getByText('Your listing is live')).toBeTruthy();
        expect(screen.getByText('Visible in search')).toBeTruthy();
        expect(screen.getByText('Buyer alerts sent')).toBeTruthy();
        expect(screen.getByText('Ready for messages')).toBeTruthy();
        expect(screen.getByText('Taking you to your dashboard...')).toBeTruthy();
    });

    it('tells an edit apart from a first publish', () => {
        render(<ListingSuccessCelebration isEdit />);

        expect(screen.getByText('Listing updated')).toBeTruthy();
        expect(screen.queryByText('Your listing is live')).toBeNull();
    });

    it('rotates through the encouragements without ever showing a blank line', () => {
        const { container } = render(<ListingSuccessCelebration isEdit={false} />);
        const line = () => container.querySelector('.celebration-message')?.textContent?.trim() ?? '';

        const seen = new Set<string>();
        // Four messages on a 1.5s rotation: eight ticks wraps the list twice.
        for (let i = 0; i < 8; i++) {
            expect(line().length).toBeGreaterThan(0);
            seen.add(line());
            act(() => { vi.advanceTimersByTime(1500); });
        }

        expect(seen.size).toBeGreaterThan(1);
    });

    it('stops rotating once the seller has been redirected away', () => {
        const { unmount } = render(<ListingSuccessCelebration isEdit={false} />);
        unmount();

        // A surviving interval would set state on an unmounted tree.
        expect(() => act(() => { vi.advanceTimersByTime(10_000); })).not.toThrow();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('carries its copy in all ten locales', () => {
        for (const locale of LOCALES) {
            const bundle = JSON.parse(
                fs.readFileSync(path.join(LOCALES_DIR, locale, 'newListing.json'), 'utf8'),
            );
            for (const key of SUCCESS_KEYS) {
                const value = lookup(bundle.success, key);
                expect(typeof value, `${locale} is missing success.${key}`).toBe('string');
                expect((value as string).trim().length, `${locale} has an empty success.${key}`).toBeGreaterThan(0);
            }
        }
    });
});
