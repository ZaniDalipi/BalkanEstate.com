import React from 'react';
import { useTranslation } from 'react-i18next';

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * The page buttons to show: always the first and last page, the current page
 * with `siblings` on each side, and an ellipsis for each gap.
 * e.g. current 6 of 12 → 1 … 5 6 7 … 12
 */
export const getPageItems = (current: number, totalPages: number, siblings = 1): PageItem[] => {
    // Few enough pages to show them all without any ellipsis
    if (totalPages <= 5 + siblings * 2) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(2, current - siblings);
    const end = Math.min(totalPages - 1, current + siblings);
    const items: PageItem[] = [1];
    if (start > 2) items.push('ellipsis-start');
    for (let p = start; p <= end; p++) items.push(p);
    if (end < totalPages - 1) items.push('ellipsis-end');
    items.push(totalPages);
    return items;
};

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Disables the controls, e.g. while the next page is loading */
    disabled?: boolean;
    className?: string;
}

const Chevron: React.FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
    </svg>
);

/**
 * Page navigation: "‹ Previous · Page 2 of 5 · Next ›" on phones (large touch
 * targets, no crowded number row), numbered page buttons from `sm` up.
 */
const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, disabled = false, className = '' }) => {
    const { t } = useTranslation('common');
    if (totalPages <= 1) return null;

    const canGoBack = page > 1 && !disabled;
    const canGoForward = page < totalPages && !disabled;
    const stepButton =
        'inline-flex items-center justify-center gap-1 min-h-[44px] px-3 sm:px-4 rounded-lg border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

    return (
        <nav className={`flex items-center justify-between gap-2 ${className}`} aria-label={t('pagination.label', 'Pagination')}>
            <button type="button" className={stepButton} onClick={() => onPageChange(page - 1)} disabled={!canGoBack}>
                <Chevron direction="left" />
                <span>{t('previous', 'Previous')}</span>
            </button>

            {/* Phones: just where you are */}
            <p className="sm:hidden text-sm font-medium text-neutral-700" aria-live="polite">
                {t('pagination.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}
            </p>

            {/* Larger screens: numbered pages */}
            <ol className="hidden sm:flex items-center gap-1">
                {getPageItems(page, totalPages).map(item =>
                    typeof item === 'number' ? (
                        <li key={item}>
                            <button
                                type="button"
                                onClick={() => onPageChange(item)}
                                disabled={disabled}
                                aria-current={item === page ? 'page' : undefined}
                                aria-label={t('pagination.goToPage', 'Page {{page}}', { page: item })}
                                className={`min-w-[40px] min-h-[40px] px-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    item === page
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-neutral-700 hover:bg-neutral-100 disabled:opacity-40'
                                }`}
                            >
                                {item}
                            </button>
                        </li>
                    ) : (
                        <li key={item} className="px-1 text-neutral-400 select-none" aria-hidden="true">…</li>
                    )
                )}
            </ol>

            <button type="button" className={stepButton} onClick={() => onPageChange(page + 1)} disabled={!canGoForward}>
                <span>{t('next', 'Next')}</span>
                <Chevron direction="right" />
            </button>
        </nav>
    );
};

export default Pagination;
