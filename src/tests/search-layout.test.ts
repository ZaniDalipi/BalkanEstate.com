/**
 * `getSearchLayout` decides whether Search / Rentals / Villas show the split
 * list+map view or one panel with the List/Map switch. A phone held sideways
 * can be 1024px+ wide; it must get the switch, not two cramped half-panels.
 */
import { describe, it, expect } from 'vitest';
import { getSearchLayout } from '@/src/shared/utils/searchLayout';
import { SHORT_LANDSCAPE_QUERY } from '@/src/hooks/useMediaQuery';

function fakeWindow(width: number, height: number, matchMediaThrows = false): Window {
    return {
        innerWidth: width,
        innerHeight: height,
        matchMedia: (q: string) => {
            if (matchMediaThrows) throw new Error('no matchMedia');
            const matches = q === SHORT_LANDSCAPE_QUERY && width > height && height <= 500;
            return { matches } as MediaQueryList;
        },
    } as unknown as Window;
}

describe('getSearchLayout', () => {
    it('is mobile under 768px in either orientation', () => {
        expect(getSearchLayout(fakeWindow(390, 844))).toBe('mobile');
        expect(getSearchLayout(fakeWindow(667, 375))).toBe('mobile');
    });

    it('is tablet from 768 to 1023px', () => {
        expect(getSearchLayout(fakeWindow(768, 1024))).toBe('tablet');
        expect(getSearchLayout(fakeWindow(932, 430))).toBe('tablet');
    });

    it('treats a wide phone held sideways as a tablet, not a split view', () => {
        expect(getSearchLayout(fakeWindow(1024, 460))).toBe('tablet');
        expect(getSearchLayout(fakeWindow(1100, 462))).toBe('tablet');
    });

    it('splits on real desktops and landscape tablets', () => {
        expect(getSearchLayout(fakeWindow(1180, 820))).toBe('split');
        expect(getSearchLayout(fakeWindow(1440, 900))).toBe('split');
    });

    it('falls back to width alone when matchMedia is unavailable', () => {
        expect(getSearchLayout(fakeWindow(1100, 462, true))).toBe('split');
    });
});
