import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One panel of the gallery. Purely what the panel needs to paint itself —
 * where the data came from (database, props, a test) is the caller's business.
 */
export interface ElasticGalleryItem {
    /** Stable identity. Drives the active panel and the React key. */
    id: string;
    /** Large label, shown horizontally when active and vertically when not. */
    title: string;
    /** Small pill above the title. */
    subtitle?: string;
    imageUrl: string;
    /** Responsive candidates; paired with `imageSizes`. */
    imageSrcSet?: string;
    imageSizes?: string;
    /** Low-quality placeholder painted behind the photo while it loads. */
    placeholderUrl?: string;
    alt: string;
}

interface ElasticGalleryProps {
    items: ElasticGalleryItem[];
    /** Call-to-action under the title of the active panel. */
    actionLabel: string;
    /**
     * Fired when a panel is chosen — click on an already-active panel, Enter,
     * or Space. Hovering and focusing only expand a panel; they never select
     * it, so a keyboard user can walk the gallery without being navigated away.
     */
    onItemSelect?: (item: ElasticGalleryItem) => void;
    /** Accessible name for the group, e.g. "Explore cities". */
    label: string;
    className?: string;
}

/**
 * Accordion gallery: the active panel expands to take four times the width of
 * its siblings, the rest collapse into labelled slivers.
 *
 * Presentational by design — no data fetching, no routing, no translation
 * lookups. It renders the items it is handed and reports selections upward.
 *
 * Interaction model, in one place because it is the part that is easy to get
 * subtly wrong:
 *
 * - mouse hover / keyboard focus     → expand (cheap, reversible, no navigation)
 * - click on an inactive panel       → expand it (a touch tap can then "peek")
 * - click on the active panel        → select
 * - Enter / Space on a focused panel → select (focus already expanded it)
 *
 * That is what makes one tap on a phone reveal a city rather than immediately
 * leaving the page, while a mouse user — whose hover already expanded the
 * panel — still selects on the first click.
 *
 * The two ignored cases below are what make that hold on a touchscreen, where
 * a tap synthesises a hover and a focus *before* the click:
 *
 * - a hover from a coarse pointer is not a hover, it is the start of a tap;
 * - a focus caused by a pointer press on the same panel is part of that tap.
 *
 * Without both, the synthesised events would expand the panel first and the
 * tap's own click would then read as "click on the active panel" — so every
 * first tap would navigate.
 */
export function ElasticGallery({
    items,
    actionLabel,
    onItemSelect,
    label,
    className,
}: ElasticGalleryProps) {
    const [requestedId, setRequestedId] = useState<string | null>(null);
    /**
     * The panel the pointer was last pressed on. A focus event that names the
     * same panel came from that press rather than from the keyboard — the only
     * way to tell the two apart without depending on event ordering.
     */
    const pointerDownIdRef = useRef<string | null>(null);
    // Panels whose photo failed to load. Their labels still render over a
    // neutral background, so a dead image URL costs a photo, not a panel.
    const [brokenIds, setBrokenIds] = useState<ReadonlySet<string>>(() => new Set());

    /*
     * The active panel is derived, not stored: if `items` changes and the panel
     * an admin just removed was the active one, the fallback takes over in the
     * same render. Holding it in state alone would need an effect to repair it
     * and would paint one frame with nothing expanded.
     */
    const activeId = useMemo(() => {
        if (requestedId && items.some(item => item.id === requestedId)) return requestedId;
        return items[0]?.id ?? null;
    }, [items, requestedId]);

    /**
     * Hover expansion, but only from a pointer that can actually hover. A
     * touchscreen reports `pointerType: 'touch'` here as part of a tap.
     * A browser too old to send a pointer type is treated as a mouse, which
     * is what it would have been.
     */
    const handlePointerEnter = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>, item: ElasticGalleryItem) => {
            if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
            setRequestedId(item.id);
        },
        [],
    );

    const handleFocus = useCallback(
        (item: ElasticGalleryItem) => {
            // Focus that follows a press on this same panel belongs to that
            // press; only focus arriving on its own (Tab, arrow keys) expands.
            if (pointerDownIdRef.current === item.id) return;
            setRequestedId(item.id);
        },
        [],
    );

    const handleClick = useCallback(
        (item: ElasticGalleryItem) => {
            // First click expands, second selects. `activeId` is already the
            // hovered panel for a mouse user, so this costs them nothing.
            if (item.id !== activeId) {
                setRequestedId(item.id);
                return;
            }
            onItemSelect?.(item);
        },
        [activeId, onItemSelect],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLButtonElement>, item: ElasticGalleryItem) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            // Space scrolls the page by default, and a button's implicit click
            // would re-enter `handleClick` with the two-step rule — which would
            // swallow the first Enter on a panel focus had already expanded.
            event.preventDefault();
            onItemSelect?.(item);
        },
        [onItemSelect],
    );

    const markBroken = useCallback((id: string) => {
        setBrokenIds(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    if (items.length === 0) return null;

    return (
        <div
            role="group"
            aria-label={label}
            className={cn(
                'mx-auto flex h-[440px] w-full max-w-6xl flex-col gap-2 px-4 md:h-[600px] md:flex-row md:gap-4',
                className,
            )}
        >
            {items.map(item => {
                const isActive = item.id === activeId;
                const isBroken = brokenIds.has(item.id);

                return (
                    <button
                        key={item.id}
                        type="button"
                        onPointerEnter={event => handlePointerEnter(event, item)}
                        onPointerDown={() => { pointerDownIdRef.current = item.id; }}
                        onFocus={() => handleFocus(item)}
                        onClick={() => handleClick(item)}
                        onKeyDown={event => handleKeyDown(event, item)}
                        aria-current={isActive}
                        aria-label={item.subtitle ? `${item.title}, ${item.subtitle}` : item.title}
                        className={cn(
                            'group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 text-left',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                            // Only the flex basis and the dimming animate. Both
                            // are composited cheaply enough to stay smooth with
                            // a dozen panels on screen.
                            'transition-[flex-grow,filter] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none',
                            isActive ? 'flex-[4]' : 'flex-[1]',
                            isActive ? 'brightness-100' : 'brightness-[.55] hover:brightness-75',
                        )}
                    >
                        <div className="absolute inset-0 h-full w-full">
                            {!isBroken && (
                                <img
                                    src={item.imageUrl}
                                    srcSet={item.imageSrcSet || undefined}
                                    sizes={item.imageSizes || undefined}
                                    alt={item.alt}
                                    loading="lazy"
                                    decoding="async"
                                    onError={() => markBroken(item.id)}
                                    className={cn(
                                        'h-full w-full object-cover transition-transform duration-1000 motion-reduce:transition-none',
                                        isActive ? 'scale-100' : 'scale-110',
                                    )}
                                    style={
                                        item.placeholderUrl
                                            ? {
                                                backgroundImage: `url("${item.placeholderUrl}")`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }
                                            : undefined
                                    }
                                />
                            )}
                            {isBroken && (
                                <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-900" />
                            )}
                            {/* Readability scrim — only under the expanded panel,
                                where there is text long enough to need it. */}
                            <div
                                className={cn(
                                    'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 motion-reduce:transition-none',
                                    isActive ? 'opacity-100' : 'opacity-0',
                                )}
                            />
                        </div>

                        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8">
                            <div
                                className={cn(
                                    'flex flex-col gap-2 transition-all duration-500 motion-reduce:transition-none',
                                    isActive
                                        ? 'translate-y-0 opacity-100 delay-200'
                                        : 'pointer-events-none translate-y-12 opacity-0',
                                )}
                            >
                                {item.subtitle && (
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-md md:px-3 md:text-xs">
                                            {item.subtitle}
                                        </span>
                                    </div>
                                )}

                                <h3 className="text-2xl font-black uppercase leading-none text-white md:text-5xl">
                                    {item.title}
                                </h3>

                                <span className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80 md:mt-4 md:text-sm">
                                    {actionLabel}
                                    <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
                                </span>
                            </div>

                            {/* Collapsed label. `aria-hidden` because the button
                                already carries the same words as its accessible
                                name — a screen reader would otherwise hear the
                                city twice per panel. */}
                            <div
                                aria-hidden="true"
                                className={cn(
                                    'pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 transition-all duration-500 md:bottom-8 motion-reduce:transition-none',
                                    isActive ? 'scale-50 opacity-0' : 'opacity-100 delay-500',
                                )}
                            >
                                <span className="hidden whitespace-nowrap text-xl font-bold uppercase tracking-widest text-white [writing-mode:vertical-rl] md:block">
                                    {item.title}
                                </span>
                                <span className="block max-w-[3.5rem] truncate text-center text-[11px] font-bold uppercase text-white md:hidden">
                                    {item.title}
                                </span>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default ElasticGallery;
