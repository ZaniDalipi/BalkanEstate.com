import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, Squares2x2Icon } from '@/constants';
import { toIntlLocale } from '@/src/shared/utils/intlLocale';
import { listCountBadge, SEARCH_LIST_PANEL_ID } from './listCollapse';
import { BADGE_DELAY_S, DOCK_PULSE_DELAY_S, revealTransition } from './tabMotion';
import SeamShade from './SeamShade';
import TabReveal from './TabReveal';

interface ListCollapseTabProps {
    /** The list is folded away and the map fills the page. */
    collapsed: boolean;
    onToggle: () => void;
    /** Listings the list holds, shown on "Show list"; `null` while not known. */
    count: number | null;
}

/** Keyboard focus only: a mouse click focuses the button too, and that should not keep the label out. */
function isKeyboardFocus(el: Element): boolean {
    try {
        return el.matches(':focus-visible');
    } catch {
        return false;
    }
}

/**
 * The tab on the map's left edge that folds the list away, and brings it back.
 *
 * It sits inside the map panel at its left edge, so while the list slides it
 * rides the seam, with the list's shadow (`SeamShade`) beside it. Open, it is
 * a slim chevron tab that slides out a "Hide list" label on hover or keyboard
 * focus. Folding the list away, it docks at the page edge, then grows into
 * "Show list" with the count, flips its chevron and pulses once (`tabMotion`).
 * It is one button in both states, so keyboard focus stays on it.
 * Split view only: the page renders it there.
 */
const ListCollapseTab: React.FC<ListCollapseTabProps> = ({ collapsed, onToggle, count }) => {
    const { t, i18n } = useTranslation(['search']);
    const reduceMotion = useReducedMotion() ?? false;
    const [hovered, setHovered] = useState(false);
    const [keyboardFocused, setKeyboardFocused] = useState(false);
    const badge = listCountBadge(count, toIntlLocale(i18n.language));

    const showLabel = t('search:listPanel.show', 'Show list');
    const hideLabel = t('search:listPanel.hide', 'Hide list');
    const label = !collapsed
        ? hideLabel
        : badge === null
            ? showLabel
            : t('search:listPanel.showCount', {
                count: count ?? 0,
                defaultValue_one: 'Show list, {{count}} result',
                defaultValue: 'Show list, {{count}} results',
            });

    return (
        <>
            <SeamShade collapsed={collapsed} />
            <motion.button
                type="button"
                onClick={() => {
                    // The pointer is still over the tab after a click: "Hide list" waits
                    // for it to come back, instead of sliding out mid-animation.
                    setHovered(false);
                    onToggle();
                }}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                onFocus={(e) => setKeyboardFocused(isKeyboardFocus(e.currentTarget))}
                onBlur={() => setKeyboardFocused(false)}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                style={{ originX: 0 }}
                aria-expanded={!collapsed}
                aria-controls={SEARCH_LIST_PANEL_ID}
                aria-label={label}
                title={collapsed ? undefined : t('search:listPanel.hideHint', 'Hide the list to see the whole map')}
                // Before: widens the touch target to 44px while the tab itself stays slim.
                className="absolute left-0 top-1/2 z-[1001] flex h-12 -translate-y-1/2 touch-manipulation items-center rounded-r-2xl border border-l-0 border-neutral-200/80 bg-white/95 px-1.5 text-neutral-700 shadow-[0_6px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-colors before:absolute before:inset-y-0 before:left-0 before:w-11 before:content-[''] hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
                <TabReveal shown={collapsed} waitForDock>
                    <span className="flex items-center gap-2 whitespace-nowrap pl-1.5 pr-2">
                        <Squares2x2Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-semibold">{showLabel}</span>
                        {badge !== null && (
                            <motion.span
                                className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold tabular-nums text-white"
                                initial={false}
                                animate={{ scale: collapsed ? 1 : 0.4, opacity: collapsed ? 1 : 0 }}
                                transition={revealTransition(collapsed, true, reduceMotion, BADGE_DELAY_S)}
                            >
                                {badge}
                            </motion.span>
                        )}
                    </span>
                </TabReveal>
                <TabReveal shown={!collapsed && (hovered || keyboardFocused)}>
                    <span className="whitespace-nowrap pl-2 pr-1 text-sm font-semibold">{hideLabel}</span>
                </TabReveal>
                <motion.span
                    aria-hidden="true"
                    data-testid="tab-chevron"
                    className="flex"
                    initial={false}
                    animate={{ rotate: collapsed ? 180 : 0 }}
                    transition={revealTransition(collapsed, true, reduceMotion)}
                >
                    <ChevronLeftIcon className="h-4 w-4" />
                </motion.span>
                <AnimatePresence initial={false}>
                    {collapsed && !reduceMotion && (
                        <motion.span
                            key="dock-pulse"
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 rounded-r-2xl ring-2 ring-primary/50"
                            style={{ originX: 0 }}
                            initial={{ opacity: 0, scale: 1 }}
                            animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 1.18] }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: DOCK_PULSE_DELAY_S, duration: 0.7, times: [0, 0.15, 1], ease: 'easeOut' }}
                        />
                    )}
                </AnimatePresence>
            </motion.button>
        </>
    );
};

export default ListCollapseTab;
