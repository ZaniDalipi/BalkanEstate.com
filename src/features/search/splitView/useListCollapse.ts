import { useCallback } from 'react';
import { useUIStore } from '@/src/app/store/uiStore';
import { isListCollapsed } from './listCollapse';

export interface ListCollapse {
    /** The list is folded away and the map fills the page, right now. */
    collapsed: boolean;
    /** Fold the list away, or bring it back. Remembered on this device. */
    toggle: () => void;
}

/**
 * The split view's "hide the list" preference, shared by Search, Rentals and
 * Villas. It only takes effect in split view; on phones and tablets the
 * List / Map switch decides which panel shows.
 */
export function useListCollapse(isSplitView: boolean): ListCollapse {
    const preferCollapsed = useUIStore((s) => s.isSearchListCollapsed);
    const setPreferCollapsed = useUIStore((s) => s.setSearchListCollapsed);

    // Read the current value at click time, so two quick clicks toggle twice.
    const toggle = useCallback(() => {
        setPreferCollapsed(!useUIStore.getState().isSearchListCollapsed);
    }, [setPreferCollapsed]);

    return { collapsed: isListCollapsed(isSplitView, preferCollapsed), toggle };
}
