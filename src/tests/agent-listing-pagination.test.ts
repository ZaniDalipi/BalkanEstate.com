/**
 * Paging an agent's listings. The tab shows 6 at a time; the awkward cases
 * are the edges — a page that stops being valid because the list under it
 * shrank, and the window of page numbers on a long list.
 */

import { describe, it, expect } from 'vitest';
import { LISTINGS_PER_PAGE, pageCount, pageSlice, pageWindow } from '@/src/features/agents/utils/listingPagination';

const listings = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('pageCount', () => {
    it('caps a page at 6 listings — three complete rows of the two-up grid', () => {
        expect(LISTINGS_PER_PAGE).toBe(6);
        expect(pageCount(6)).toBe(1);
        expect(pageCount(7)).toBe(2);
        expect(pageCount(34)).toBe(6);
        expect(pageCount(100)).toBe(17);
    });

    it('calls an empty list page 1 of 1, not page 1 of 0', () => {
        expect(pageCount(0)).toBe(1);
    });
});

describe('pageSlice', () => {
    it('hands out 6 per page and the remainder on the last one', () => {
        const all = listings(34);

        const first = pageSlice(all, 1);
        expect(first.items).toEqual([1, 2, 3, 4, 5, 6]);
        expect(first.firstIndex).toBe(0);
        expect(first.totalPages).toBe(6);

        const second = pageSlice(all, 2);
        expect(second.items).toEqual([7, 8, 9, 10, 11, 12]);
        expect(second.firstIndex).toBe(6);

        const last = pageSlice(all, 6);
        expect(last.items).toEqual([31, 32, 33, 34]);
        expect(last.firstIndex).toBe(30);
    });

    it('every listing appears exactly once across the pages', () => {
        const all = listings(103);
        const { totalPages } = pageSlice(all, 1);
        const walked = Array.from({ length: totalPages }, (_, i) => pageSlice(all, i + 1).items).flat();

        expect(walked).toEqual(all);
    });

    it('clamps a page the list has shrunk past instead of showing nothing', () => {
        // A visitor on page 9 narrows the filter down to two pages of results.
        const narrowed = pageSlice(listings(10), 9);

        expect(narrowed.page).toBe(2);
        expect(narrowed.items).toEqual([7, 8, 9, 10]);
    });

    it('clamps a page below one', () => {
        expect(pageSlice(listings(30), 0).page).toBe(1);
        expect(pageSlice(listings(30), -3).page).toBe(1);
    });

    it('reports page 1 of 1 for an empty list', () => {
        expect(pageSlice([], 1)).toEqual({ page: 1, totalPages: 1, firstIndex: 0, items: [] });
    });
});

describe('pageWindow', () => {
    it('prints every page while they still fit', () => {
        expect(pageWindow(1, 1)).toEqual([1]);
        expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('keeps the first and last page reachable from the middle of a long list', () => {
        expect(pageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    });

    it('opens no gap where the pages are already adjacent', () => {
        expect(pageWindow(1, 12)).toEqual([1, 2, null, 12]);
        expect(pageWindow(12, 12)).toEqual([1, null, 11, 12]);
        expect(pageWindow(3, 12)).toEqual([1, 2, 3, 4, null, 12]);
    });

    it('never repeats a page number', () => {
        for (let total = 1; total <= 30; total++) {
            for (let current = 1; current <= total; current++) {
                const shown = pageWindow(current, total).filter((p): p is number => p !== null);
                expect(new Set(shown).size).toBe(shown.length);
                expect(shown).toContain(current);
            }
        }
    });
});
