/**
 * Page navigation for long lists (My Listings): numbered pages on larger
 * screens, "Page 2 of 5" with Previous / Next on phones.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback: string, vars?: Record<string, unknown>) =>
            (fallback ?? key).replace(/{{(\w+)}}/g, (_, k) => String(vars?.[k])),
    }),
}));

const { default: Pagination, getPageItems } = await import('@/src/components/ui/Pagination');

describe('getPageItems', () => {
    it('lists every page when there are only a few', () => {
        expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(getPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('keeps first, last and the neighbours of the current page', () => {
        expect(getPageItems(6, 12)).toEqual([1, 'ellipsis-start', 5, 6, 7, 'ellipsis-end', 12]);
        expect(getPageItems(1, 12)).toEqual([1, 2, 'ellipsis-end', 12]);
        expect(getPageItems(12, 12)).toEqual([1, 'ellipsis-start', 11, 12]);
        expect(getPageItems(3, 12)).toEqual([1, 2, 3, 4, 'ellipsis-end', 12]);
    });
});

describe('Pagination', () => {
    it('renders nothing for a single page', () => {
        const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows where you are and moves between pages', () => {
        const onPageChange = vi.fn();
        render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

        expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

        fireEvent.click(screen.getByRole('button', { name: /Previous/ }));
        fireEvent.click(screen.getByRole('button', { name: /Next/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Page 5' }));
        expect(onPageChange.mock.calls.map(c => c[0])).toEqual([1, 3, 5]);
    });

    it('disables Previous on the first page and Next on the last', () => {
        const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
        expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();

        rerender(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
        expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
    });
});
