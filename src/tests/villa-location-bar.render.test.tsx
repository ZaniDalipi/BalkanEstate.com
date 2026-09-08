/**
 * The villas corridor searches with the same box as the buy page.
 *
 * It used to render its own input and its own dropdown over the shared search
 * engine, so it got the app's suggestions but none of the omnibox's behaviour.
 * These assert the parts of that swap a user would notice: it is a real
 * combobox, the villa placeholder survived, and typing reaches the page.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: unknown) =>
            (typeof fallback === 'string' ? fallback : key.split('.').pop() ?? key),
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children?: React.ReactNode }) => children,
}));

// The engine is exercised by its own tests; here it only has to stay quiet so
// the bar can be rendered without reaching for a gazetteer or Google Places.
vi.mock('@/src/features/search/universal/useUniversalSearch', () => ({
    useUniversalSearch: () => ({
        groups: [],
        suggestions: [],
        isSearching: false,
        refreshRecents: vi.fn(),
        resolvePlace: vi.fn(),
    }),
}));

import VillaLocationBar from '@/src/features/villas/components/VillaLocationBar';

const renderBar = (props: Partial<React.ComponentProps<typeof VillaLocationBar>> = {}) => {
    const onQueryChange = vi.fn();
    const utils = render(
        <VillaLocationBar
            query=""
            onQueryChange={onQueryChange}
            onSelectSuggestion={vi.fn()}
            onSearch={vi.fn()}
            variant="desktop"
            {...props}
        />,
    );
    return { ...utils, onQueryChange };
};

describe('the villas search bar is the shared omnibox', () => {
    it('renders a combobox rather than a plain input', () => {
        renderBar();
        // role=combobox with a listbox to control is what the page's hand-rolled
        // input never was, and what ↑/↓ and screen readers rely on.
        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('aria-autocomplete', 'list');
        expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it("keeps the villas page's own placeholder", () => {
        renderBar();
        expect(screen.getByPlaceholderText('Search by location...')).toBeInTheDocument();
    });

    it('reports what is typed back to the page', () => {
        const { onQueryChange } = renderBar();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rolling hills' } });
        expect(onQueryChange).toHaveBeenCalledWith('rolling hills');
    });

    it('offers to clear a query that has been typed', () => {
        renderBar({ query: 'Tirana' });
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders bare on mobile, where it sits inside the glass pill', () => {
        const { container } = renderBar({ variant: 'mobile' });
        // The pill draws its own background; a second bordered box inside it is
        // the thing that made the two variants look like different controls.
        expect(container.querySelector('input')?.className).toContain('bg-transparent');
    });
});
