/**
 * The full-size review walks the whole queue: deciding on a draft opens the
 * next one, and prev/next continue onto the neighbouring page.
 */

import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDraftViewer } from '@/src/features/listing-sources/hooks/useDraftViewer';
import type { ImportedDraft } from '@/src/features/listing-sources/api/importReviewApi';

const d = (id: string) => ({ id } as ImportedDraft);

describe('useDraftViewer', () => {
    it('opens the next draft once one is decided, and closes after the last', async () => {
        const decide = vi.fn().mockResolvedValue(null);
        const { result } = renderHook(() =>
            useDraftViewer({ drafts: [d('a'), d('b')], page: 1, loadedPage: 1, pages: 1, total: 2, setPage: vi.fn(), decide })
        );
        act(() => result.current.open('a'));
        await act(() => result.current.onDecision('accept'));
        expect(decide).toHaveBeenCalledWith('accept', 'a');
        expect(result.current.viewing?.id).toBe('b');

        // The list hasn't refetched yet, so 'a' is still in it — it must not come back.
        await act(() => result.current.onDecision('reject'));
        expect(result.current.viewing).toBeNull();
    });

    it('stays on the draft and reports why when a decision fails', async () => {
        const decide = vi.fn().mockResolvedValue('Monthly limit reached');
        const { result } = renderHook(() =>
            useDraftViewer({ drafts: [d('a'), d('b')], page: 1, loadedPage: 1, pages: 1, total: 2, setPage: vi.fn(), decide })
        );
        act(() => result.current.open('a'));
        await act(() => result.current.onDecision('accept'));
        expect(result.current.viewing?.id).toBe('a');
        expect(result.current.error).toBe('Monthly limit reached');
    });

    it('continues onto the next page from the last draft on this one', async () => {
        const setPage = vi.fn();
        let props = { drafts: [d('a'), d('b')], page: 1, loadedPage: 1, pages: 2, total: 21, setPage, decide: vi.fn() };
        const { result, rerender } = renderHook(() => useDraftViewer(props));
        act(() => result.current.open('b'));
        act(() => result.current.next());
        expect(setPage).toHaveBeenCalledWith(2);

        // Still showing page 1's data while page 2 loads — nothing opens yet.
        props = { ...props, page: 2 };
        rerender();
        expect(result.current.viewing?.id).toBe('b');

        props = { ...props, drafts: [d('c')], loadedPage: 2 };
        rerender();
        await waitFor(() => expect(result.current.viewing?.id).toBe('c'));
        expect(result.current.position).toEqual({ index: 20, total: 21 });
    });
});
