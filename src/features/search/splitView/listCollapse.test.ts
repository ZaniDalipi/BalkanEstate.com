import { describe, it, expect } from 'vitest';
import {
    isListCollapsed,
    listCountBadge,
    readCollapsedPreference,
    splitListPanelClass,
    splitMapPanelClass,
} from './listCollapse';

describe('isListCollapsed', () => {
    it('folds the list away only in split view', () => {
        expect(isListCollapsed(true, true)).toBe(true);
        expect(isListCollapsed(true, false)).toBe(false);
    });

    it('leaves phones and tablets to the List / Map switch, whatever was remembered', () => {
        expect(isListCollapsed(false, true)).toBe(false);
        expect(isListCollapsed(false, false)).toBe(false);
    });
});

describe('split panel classes', () => {
    const classes = (s: string) => s.split(/\s+/);

    it('puts the list beside the map when open', () => {
        const list = classes(splitListPanelClass(false));
        const map = classes(splitMapPanelClass(false));
        expect(list).toEqual(expect.arrayContaining(['lg:w-[45%]', 'xl:w-[55%]', 'lg:left-0']));
        expect(list).not.toContain('lg:-translate-x-full');
        expect(list).not.toContain('lg:invisible');
        expect(map).toEqual(expect.arrayContaining(['lg:ml-auto', 'lg:w-[55%]', 'xl:w-[45%]']));
        expect(map).not.toContain('lg:w-full');
    });

    it('slides the list out and gives the map the whole row when folded', () => {
        const list = classes(splitListPanelClass(true));
        const map = classes(splitMapPanelClass(true));
        expect(list).toEqual(expect.arrayContaining(['lg:-translate-x-full', 'lg:invisible']));
        // The list keeps its width while it slides, so its cards never re-lay out.
        expect(list).toEqual(expect.arrayContaining(['lg:w-[45%]', 'xl:w-[55%]']));
        expect(map).toContain('lg:w-full');
        expect(map).not.toContain('lg:w-[55%]');
        expect(map).not.toContain('xl:w-[45%]');
    });

    it('moves both panels with one duration and easing, and not at all under reduced motion', () => {
        for (const collapsed of [false, true]) {
            for (const panel of [splitListPanelClass(collapsed), splitMapPanelClass(collapsed)]) {
                expect(classes(panel)).toEqual(expect.arrayContaining([
                    'lg:duration-300',
                    'lg:ease-[cubic-bezier(0.32,0.72,0,1)]',
                    'lg:motion-reduce:transition-none',
                ]));
            }
        }
    });

    it('never applies the split classes below lg', () => {
        for (const collapsed of [false, true]) {
            const all = [...classes(splitListPanelClass(collapsed)), ...classes(splitMapPanelClass(collapsed))];
            expect(all.every((c) => c.startsWith('lg:') || c.startsWith('xl:'))).toBe(true);
        }
    });
});

describe('readCollapsedPreference', () => {
    it('keeps a remembered choice', () => {
        expect(readCollapsedPreference({ isSearchListCollapsed: true })).toBe(true);
        expect(readCollapsedPreference({ isSearchListCollapsed: false })).toBe(false);
    });

    it('opens with the list showing when storage holds nothing usable', () => {
        expect(readCollapsedPreference(undefined)).toBe(false);
        expect(readCollapsedPreference(null)).toBe(false);
        expect(readCollapsedPreference('true')).toBe(false);
        expect(readCollapsedPreference({})).toBe(false);
        expect(readCollapsedPreference({ isSearchListCollapsed: 'true' })).toBe(false);
        expect(readCollapsedPreference({ isSearchListCollapsed: 1 })).toBe(false);
    });
});

describe('listCountBadge', () => {
    it('formats the count in the visitor language', () => {
        expect(listCountBadge(0, 'en')).toBe('0');
        expect(listCountBadge(12, 'en')).toBe('12');
        expect(listCountBadge(2345, 'en')).toBe('2,345');
    });

    it('leaves the badge out while the count is unknown or unusable', () => {
        expect(listCountBadge(null, 'en')).toBeNull();
        expect(listCountBadge(undefined, 'en')).toBeNull();
        expect(listCountBadge(Number.NaN, 'en')).toBeNull();
        expect(listCountBadge(Number.POSITIVE_INFINITY, 'en')).toBeNull();
        expect(listCountBadge(-1, 'en')).toBeNull();
    });

    it('still shows the number when the locale is not one Intl knows', () => {
        expect(listCountBadge(7, 'not a locale!')).toBe('7');
    });
});
