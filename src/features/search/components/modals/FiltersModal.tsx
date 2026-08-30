import React, { useCallback, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, AdjustmentsHorizontalIcon } from '@/constants';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Commit the staged filters and close. */
  onApply: () => void;
  onReset: () => void;
  /** Number of filters currently set, shown next to the title. */
  activeCount?: number;
  /** Results the applied filters currently match, shown on the primary button. */
  resultCount?: number;
  isApplying?: boolean;
  children: React.ReactNode;
}

/**
 * Filter panel as a modal.
 *
 * It used to be an accordion inside the results column, so opening it pushed
 * the listings down and the two competed for the same narrow width. Over the
 * page it gets the room for a two-column layout and leaves the results where
 * they were.
 *
 * Full-screen on phones, a centred dialog from `sm` up.
 */
const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  activeCount = 0,
  resultCount,
  isApplying = false,
  children,
}) => {
  const { t } = useTranslation(['search', 'common']);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Remember what opened the dialog so focus can go back there on close.
  useEffect(() => {
    if (isOpen) restoreFocusRef.current = document.activeElement as HTMLElement;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Keep Tab inside the dialog.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const handleApply = useCallback(() => {
    onApply();
    onClose();
  }, [onApply, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch sm:items-center sm:justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-neutral-900/50 sm:backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-3xl bg-white flex flex-col sm:rounded-2xl shadow-2xl overflow-hidden max-h-full sm:max-h-[85vh]"
      >
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-200">
          <div className="flex items-center gap-2 min-w-0">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <h2 id={titleId} className="text-base font-semibold text-neutral-900 truncate">
              {t('search:filters.filters', 'Filters')}
            </h2>
            {activeCount > 0 && (
              <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-primary rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common:close', 'Close')}
            className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 after:absolute after:content-[''] after:-inset-1.5"
            data-custom-target
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-neutral-200 bg-white">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 hover:underline transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t('search:filters.resetFilters', 'Reset Filters')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-wait transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {typeof resultCount === 'number'
              ? t('search:filters.showResults', {
                  count: resultCount,
                  defaultValue: 'Show {{count}} results',
                })
              : t('search:filters.applyFilters', 'Show results')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersModal;
