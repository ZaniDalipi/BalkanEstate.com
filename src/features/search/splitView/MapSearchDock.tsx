import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { searchDockMotion } from './tabMotion';

interface MapSearchDockProps {
    /** The list, and the search box in its header, is folded away. */
    shown: boolean;
    /** The page's own search box in its pill form (the one its phone bar uses). */
    children: React.ReactNode;
}

/**
 * Search on the map while the list is folded away.
 *
 * The search box lives in the list's header, so hiding the list used to hide
 * the only way to look up a place: the visitor had to bring the list back to
 * search, then hide it again. This is the same box (each page passes its
 * own), floating at the map's top left.
 *
 * It sits inside the map panel, so it travels with the map's edge, and the
 * returning list slides over where it was. It stops short of the floating
 * header on the right (`--floating-header-w`). The panel publishes its height
 * as `--map-dock-h` (see `splitMapPanelClass`), and the map's own top-left
 * overlays move down by it. Above the map's controls (1000–1003) so the
 * suggestions drop over them; pointer events pass through around the pill.
 */
const MapSearchDock: React.FC<MapSearchDockProps> = ({ shown, children }) => {
    const { t } = useTranslation(['search']);
    const reduceMotion = useReducedMotion() ?? false;
    const dock = searchDockMotion(reduceMotion);

    return (
        <AnimatePresence initial={false}>
            {shown && (
                <motion.div
                    key="map-search-dock"
                    role="search"
                    aria-label={t('search:listPanel.mapSearch', 'Search on the map')}
                    className="pointer-events-none absolute left-0 right-0 top-3 z-[1004] flex pl-4"
                    style={{ paddingRight: 'max(1rem, var(--floating-header-w, 0px))', transformOrigin: 'top left' }}
                    initial={dock.initial}
                    animate={dock.animate}
                    exit={dock.exit}
                >
                    <div className="pointer-events-auto flex min-h-12 w-full max-w-md items-center rounded-full border border-white/70 bg-white/90 p-1 shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MapSearchDock;
