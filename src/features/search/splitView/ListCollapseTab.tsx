import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, Squares2x2Icon } from '@/constants';
import { toIntlLocale } from '@/src/shared/utils/intlLocale';
import { listCountBadge, SEARCH_LIST_PANEL_ID } from './listCollapse';

interface ListCollapseTabProps {
    /** The list is folded away and the map fills the page. */
    collapsed: boolean;
    onToggle: () => void;
    /** Listings the list holds, shown on "Show list"; `null` while not known. */
    count: number | null;
}

/**
 * The tab on the map's left edge that folds the list away, and brings it back.
 *
 * It sits inside the map panel at its left edge, so while the list slides it
 * rides the seam between the two. Open, it is a small chevron tab ("Hide
 * list"); folded, it reads "Show list" with how many listings are waiting.
 * It is one button in both states, so keyboard focus stays on it.
 * Split view only: the page renders it there.
 */
const ListCollapseTab: React.FC<ListCollapseTabProps> = ({ collapsed, onToggle, count }) => {
    const { t, i18n } = useTranslation(['search']);
    const reduceMotion = useReducedMotion();
    const badge = listCountBadge(count, toIntlLocale(i18n.language));

    const showLabel = t('search:listPanel.show', 'Show list');
    const label = !collapsed
        ? t('search:listPanel.hide', 'Hide list')
        : badge === null
            ? showLabel
            : t('search:listPanel.showCount', {
                count: count ?? 0,
                defaultValue_one: 'Show list, {{count}} result',
                defaultValue: 'Show list, {{count}} results',
            });
    const fade = { duration: reduceMotion ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] as const };
    const enter = reduceMotion ? { opacity: 1 } : { opacity: 0, x: collapsed ? -6 : 4 };

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={SEARCH_LIST_PANEL_ID}
            aria-label={label}
            title={collapsed ? undefined : t('search:listPanel.hideHint', 'Hide the list to see the whole map')}
            // Before: widens the touch target to 44px while the tab itself stays slim.
            className={`absolute left-0 top-1/2 z-[1001] flex -translate-y-1/2 touch-manipulation items-center rounded-r-2xl border border-l-0 border-neutral-200/80 bg-white/95 text-neutral-700 shadow-[0_6px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-colors before:absolute before:inset-y-0 before:left-0 before:w-11 before:content-[''] hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                collapsed ? 'h-11 pl-3 pr-3.5' : 'h-14 w-7 justify-center'
            }`}
        >
            <AnimatePresence initial={false} mode="popLayout">
                {collapsed ? (
                    <motion.span key="show" className="flex items-center gap-2" initial={enter} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={fade}>
                        <Squares2x2Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap text-sm font-semibold">{showLabel}</span>
                        {badge !== null && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold tabular-nums text-white">{badge}</span>
                        )}
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
                    </motion.span>
                ) : (
                    <motion.span key="hide" className="flex" initial={enter} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={fade}>
                        <ChevronLeftIcon className="h-4 w-4" />
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
};

export default ListCollapseTab;
