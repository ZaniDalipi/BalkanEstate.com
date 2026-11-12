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
    const classes = (s: string) => s.split(/\s+/).filter(Boolean);

    it('puts the list beside the map when open', () => {
        const list = classes(splitListPanelClass(true, false));
        const map = classes(splitMapPanelClass(true, false));
        expect(list).toEqual(expect.arrayContaining(['lg:w-[45%]', 'xl:w-[55%]', 'lg:left-0']));
        expect(list).not.toContain('lg:-translate-x-full');
        expect(list).not.toContain('lg:invisible');
        expect(map).toEqual(expect.arrayContaining(['lg:ml-auto', 'lg:w-[55%]', 'xl:w-[45%]']));
        expect(map).not.toContain('lg:w-full');
    });

    it('slides the list out and gives the map the whole row when folded', () => {
        const list = classes(splitListPanelClass(true, true));
        const map = classes(splitMapPanelClass(true, true));
        expect(list).toEqual(expect.arrayContaining(['lg:-translate-x-full', 'lg:invisible']));
        // The list keeps its width while it slides, so its cards never re-lay out.
        expect(list).toEqual(expect.arrayContaining(['lg:w-[45%]', 'xl:w-[55%]']));
        expect(map).toContain('lg:w-full');
        expect(map).not.toContain('lg:w-[55%]');
        expect(map).not.toContain('xl:w-[45%]');
    });

    it('moves list and map on the same spring: the opening one when opening, the closing one when closing', () => {
        for (const [collapsed, ease, duration] of [[false, 'lg:ease-split-open', 'lg:duration-700'], [true, 'lg:ease-split-close', 'lg:duration-500']] as const) {
            for (const panel of [splitListPanelClass(true, collapsed), splitMapPanelClass(true, collapsed)]) {
                expect(classes(panel)).toEqual(expect.arrayContaining([ease, duration]));
            }
        }
    });

    it('moves the list content a little further than the panel, and lets it trail on the way back in', () => {
        const open = classes(splitListPanelClass(true, false));
        const folded = classes(splitListPanelClass(true, true));
        expect(folded).toContain('lg:*:-translate-x-[8%]');
        expect(open).not.toContain('lg:*:-translate-x-[8%]');
        expect(open).toContain('lg:*:delay-[60ms]');
        expect(folded.some((c) => c.startsWith('lg:*:delay'))).toBe(false);
    });

    it('does not move at all under reduced motion', () => {
        for (const collapsed of [false, true]) {
            expect(classes(splitListPanelClass(true, collapsed))).toEqual(expect.arrayContaining([
                'lg:motion-reduce:transition-none',
                'lg:motion-reduce:*:transition-none',
            ]));
            expect(classes(splitMapPanelClass(true, collapsed))).toContain('lg:motion-reduce:transition-none');
        }
    });

    it('never applies the split classes below lg', () => {
        for (const collapsed of [false, true]) {
            const all = [...classes(splitListPanelClass(true, collapsed)), ...classes(splitMapPanelClass(true, collapsed))];
            expect(all.every((c) => c.startsWith('lg:') || c.startsWith('xl:'))).toBe(true);
        }
    });

    it('leaves the panels to their own classes outside split view', () => {
        for (const collapsed of [false, true]) {
            expect(splitListPanelClass(false, collapsed)).toBe('');
            expect(splitMapPanelClass(false, collapsed)).toBe('');
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
