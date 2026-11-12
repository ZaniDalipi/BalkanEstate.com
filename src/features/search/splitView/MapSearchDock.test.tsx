import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useUIStore } from '@/src/app/store/uiStore';
import ListCollapseTab from './ListCollapseTab';
import MapSearchDock from './MapSearchDock';
import { useListCollapse } from './useListCollapse';
import { SEARCH_LIST_PANEL_ID, splitListPanelClass, splitMapPanelClass } from './listCollapse';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

/** The page wiring: a search box in the list's header, and the same search on the map while the list is folded. */
function Page({ split = true }: { split?: boolean }) {
    const { collapsed, toggle } = useListCollapse(split);
    const [query, setQuery] = useState('');
    const box = (label: string) => (
        <input aria-label={label} value={query} onChange={(e) => setQuery(e.target.value)} />
    );
    return (
        <div>
            <div id={SEARCH_LIST_PANEL_ID} className={splitListPanelClass(split, collapsed)}>
                {box('List search')}
            </div>
            <div data-testid="map" className={splitMapPanelClass(split, collapsed)}>
                {split && (
                    <>
                        <MapSearchDock shown={collapsed}>{box('Map search')}</MapSearchDock>
                        <ListCollapseTab collapsed={collapsed} onToggle={toggle} count={4} />
                    </>
                )}
            </div>
        </div>
    );
}

const dock = () => screen.queryByRole('search', { name: 'Search on the map' });

beforeEach(() => {
    useUIStore.setState({ isSearchListCollapsed: false });
});

describe('MapSearchDock — searching while the list is hidden', () => {
    it('is not on the map while the list, with its own search box, is showing', () => {
        render(<Page />);
        expect(dock()).not.toBeInTheDocument();
        expect(screen.getByTestId('map').className).not.toContain('--map-dock-h');
    });

    it('gives the map a search box when the list is folded away, and makes room for it', () => {
        render(<Page />);
        fireEvent.click(screen.getByRole('button', { name: 'Hide list' }));
        const search = dock();
        expect(search).toBeInTheDocument();
        expect(within(search as HTMLElement).getByLabelText('Map search')).toBeInTheDocument();
        expect(screen.getByTestId('map').className).toContain('lg:[--map-dock-h:3.75rem]');
    });

    it('searches the same thing as the list header: what is typed on the map is there when the list comes back', async () => {
        render(<Page />);
        fireEvent.click(screen.getByRole('button', { name: 'Hide list' }));
        fireEvent.change(screen.getByLabelText('Map search'), { target: { value: 'Zagreb' } });

        fireEvent.click(screen.getByRole('button', { name: /^Show list/ }));
        await waitFor(() => expect(dock()).not.toBeInTheDocument());
        expect(screen.getByLabelText('List search')).toHaveValue('Zagreb');
    });

    it('does not take keyboard focus from the tab when it appears', () => {
        render(<Page />);
        const tab = screen.getByRole('button', { name: 'Hide list' });
        tab.focus();
        fireEvent.click(tab);
        expect(dock()).toBeInTheDocument();
        expect(document.activeElement).toBe(tab);
    });

    it('is there from the start on a page that opens with the list folded', () => {
        useUIStore.setState({ isSearchListCollapsed: true });
        render(<Page />);
        expect(dock()).toBeInTheDocument();
    });

    it('never shows on phones and tablets, which have their own search bar', () => {
        useUIStore.setState({ isSearchListCollapsed: true });
        render(<Page split={false} />);
        expect(dock()).not.toBeInTheDocument();
    });
});
