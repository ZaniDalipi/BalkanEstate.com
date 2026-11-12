import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUIStore } from '@/src/app/store/uiStore';
import ListCollapseTab from './ListCollapseTab';
import { useListCollapse } from './useListCollapse';
import { SEARCH_LIST_PANEL_ID, splitListPanelClass, splitMapPanelClass } from './listCollapse';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

/** The page wiring as Search, Rentals and Villas do it: list panel, map panel, tab on the map's edge. */
function Page({ split = true, count = 12 }: { split?: boolean; count?: number | null }) {
    const { collapsed, toggle } = useListCollapse(split);
    return (
        <div>
            <div id={SEARCH_LIST_PANEL_ID} data-testid="list" className={splitListPanelClass(split, collapsed)} />
            <div data-testid="map" className={splitMapPanelClass(split, collapsed)}>
                {split && <ListCollapseTab collapsed={collapsed} onToggle={toggle} count={count} />}
            </div>
        </div>
    );
}

const tab = () => screen.getByRole('button', { name: /list/i });

beforeEach(() => {
    useUIStore.setState({ isSearchListCollapsed: false });
    vi.mocked(window.localStorage.setItem).mockReset();
});

describe('ListCollapseTab — hiding the list in split view', () => {
    it('starts with the list beside the map and a tab to hide it', () => {
        render(<Page />);
        expect(tab()).toHaveAccessibleName('Hide list');
        expect(tab()).toHaveAttribute('aria-expanded', 'true');
        expect(tab()).toHaveAttribute('aria-controls', SEARCH_LIST_PANEL_ID);
        expect(document.getElementById(SEARCH_LIST_PANEL_ID)).toBe(screen.getByTestId('list'));
        expect(screen.getByTestId('list').className).not.toContain('lg:invisible');
        expect(screen.getByTestId('map').className).toContain('lg:w-[55%]');
    });

    it('folds the list away so the map fills the page, then brings it back', () => {
        render(<Page count={12} />);

        fireEvent.click(tab());
        expect(tab()).toHaveAccessibleName('Show list, 12 results');
        expect(tab()).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText('Show list')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByTestId('list').className).toContain('lg:-translate-x-full');
        expect(screen.getByTestId('list').className).toContain('lg:invisible');
        expect(screen.getByTestId('map').className).toContain('lg:w-full');

        fireEvent.click(tab());
        expect(tab()).toHaveAccessibleName('Hide list');
        expect(tab()).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId('list').className).not.toContain('lg:invisible');
        expect(screen.getByTestId('map').className).not.toContain('lg:w-full');
    });

    it('keeps focus on the same button when it switches between hide and show', () => {
        render(<Page />);
        const button = tab();
        button.focus();
        fireEvent.click(button);
        expect(tab()).toBe(button);
        expect(document.activeElement).toBe(button);
    });

    it('reads plain "Show list" while the number of results is not known yet', () => {
        render(<Page count={null} />);
        fireEvent.click(tab());
        expect(tab()).toHaveAccessibleName('Show list');
        expect(screen.queryByText('12')).not.toBeInTheDocument();
    });

    it('remembers the choice on this device', () => {
        render(<Page />);
        fireEvent.click(tab());
        expect(useUIStore.getState().isSearchListCollapsed).toBe(true);
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            'ui-store',
            expect.stringContaining('"isSearchListCollapsed":true'),
        );
    });

    it('opens folded when that was the last choice', () => {
        useUIStore.setState({ isSearchListCollapsed: true });
        render(<Page count={3} />);
        expect(tab()).toHaveAccessibleName('Show list, 3 results');
        expect(screen.getByTestId('map').className).toContain('lg:w-full');
    });

    it('still toggles when storage refuses to save', () => {
        vi.mocked(window.localStorage.setItem).mockImplementation(() => {
            throw new DOMException('Quota exceeded', 'QuotaExceededError');
        });
        render(<Page />);
        expect(() => fireEvent.click(tab())).not.toThrow();
        expect(tab()).toHaveAttribute('aria-expanded', 'false');
    });

    it('slides out a "Hide list" label while the pointer is over the open tab', () => {
        render(<Page />);
        const hideReveal = () => screen.getByText('Hide list').closest('[data-shown]');
        expect(hideReveal()).toHaveAttribute('data-shown', 'false');
        fireEvent.pointerEnter(tab());
        expect(hideReveal()).toHaveAttribute('data-shown', 'true');
        fireEvent.pointerLeave(tab());
        expect(hideReveal()).toHaveAttribute('data-shown', 'false');
    });

    it('does not slide out "Hide list" under a pointer that just clicked "Show list"', () => {
        useUIStore.setState({ isSearchListCollapsed: true });
        render(<Page />);
        fireEvent.pointerEnter(tab());
        fireEvent.click(tab());
        expect(screen.getByText('Hide list').closest('[data-shown]')).toHaveAttribute('data-shown', 'false');
        // A fresh hover still reveals it.
        fireEvent.pointerLeave(tab());
        fireEvent.pointerEnter(tab());
        expect(screen.getByText('Hide list').closest('[data-shown]')).toHaveAttribute('data-shown', 'true');
    });

    it('grows into the "Show list" pill when folded, and never shows the hover label then', () => {
        render(<Page />);
        const showReveal = () => screen.getByText('Show list').closest('[data-shown]');
        expect(showReveal()).toHaveAttribute('data-shown', 'false');
        fireEvent.pointerEnter(tab());
        fireEvent.click(tab());
        expect(showReveal()).toHaveAttribute('data-shown', 'true');
        expect(screen.getByText('Hide list').closest('[data-shown]')).toHaveAttribute('data-shown', 'false');
    });

    it('draws no list shadow on a page that opens folded: it plays only when the list moves', () => {
        useUIStore.setState({ isSearchListCollapsed: true });
        render(<Page />);
        // First render: settled at the last keyframe, so nothing is drawn.
        expect(screen.getByTestId('seam-shade').style.opacity).toBe('0');
    });

    it('leaves phones and tablets to the List / Map switch, even with the list remembered as hidden', () => {
        useUIStore.setState({ isSearchListCollapsed: true });
        render(<Page split={false} />);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByTestId('list').className).not.toContain('lg:invisible');
        expect(screen.getByTestId('map').className).not.toContain('lg:w-full');
    });
});
