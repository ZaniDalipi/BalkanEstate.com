import React, { useCallback, useMemo, useState } from 'react';
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

/** A button offered on the expanded panel. */
export interface ElasticGalleryAction {
    id: string;
    label: string;
    onSelect: (item: ElasticGalleryItem) => void;
    /** `primary` is solid, `secondary` is glass over the photo. */
    variant?: 'primary' | 'secondary';
}

interface ElasticGalleryProps {
    items: ElasticGalleryItem[];
    /** Buttons rendered on whichever panel is expanded. */
    actions: ElasticGalleryAction[];
    /** Accessible name for the group, e.g. "Explore cities". */
    label: string;
    className?: string;
}

/**
 * The photo has to cover the panel, and `index.html` ships an unlayered
 * `img { height: auto }`. Tailwind v4 emits its utilities inside
 * `@layer utilities`, and any unlayered rule beats a layered one no matter how
 * specific the layered one is — so `h-full object-cover` loses that fight and
 * the photo renders at its natural height with the panel showing through
 * underneath. An inline style outranks both, which is why the sizing lives
 * here instead of in the class list.
 */
const COVER_STYLE: React.CSSProperties = {
    height: '100%',
    width: '100%',
    objectFit: 'cover',
    maxWidth: 'none',
};

/** White text over an unknown photo needs its own contrast, not the photo's. */
const TEXT_SHADOW = '[text-shadow:0_2px_10px_rgba(0,0,0,0.65)]';

/**
 * Accordion gallery: the active panel expands to take four times the width of
 * its siblings, the rest collapse into labelled slivers.
 *
 * Presentational by design — no data fetching, no routing, no translation
 * lookups. It renders the items it is handed and reports which action was
 * pressed on which item.
 *
 * Interaction model:
 *
 * - hover, focus, or a tap on a panel → expand it. Nothing navigates.
 * - the buttons on the expanded panel → the only things that act.
 *
 * Keeping expansion and action on separate controls is what makes this work on
 * a touchscreen: a tap can reveal a panel without also committing to it, and
 * there is no "was this the first or second tap" state to get wrong.
 *
 * Each panel is a plain element with a full-bleed button behind its content,
 * rather than being a button itself — a button cannot legally contain the
 * action buttons, and nesting them breaks keyboard and screen-reader
 * behaviour long before it breaks the markup.
 */
export function ElasticGallery({ items, actions, label, className }: ElasticGalleryProps) {
    const [requestedId, setRequestedId] = useState<string | null>(null);
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
                'mx-auto flex h-[460px] w-full max-w-6xl flex-col gap-2 md:h-[560px] md:flex-row md:gap-4',
                className,
            )}
        >
            {items.map(item => {
                const isActive = item.id === activeId;
                const isBroken = brokenIds.has(item.id);
                const expand = () => setRequestedId(item.id);
                // Touch has no hover, but a touchstart still dispatches
                // `pointerenter` with `pointerType: 'touch'` on whatever
                // panel the finger lands on. Left unfiltered, every scroll
                // gesture that starts (or passes through, on some browsers)
                // a different panel re-expands it, so the gallery keeps
                // reshuffling under the visitor's thumb while they are just
                // trying to scroll past it. Only a real hover — mouse or pen
                // — should drive expansion; touch already has its own
                // expand path via the tap/focus handlers on the button below.
                const handlePointerEnter = (e: React.PointerEvent) => {
                    if (e.pointerType === 'mouse' || e.pointerType === 'pen') expand();
                };

                return (
                    <div
                        key={item.id}
                        onPointerEnter={handlePointerEnter}
                        className={cn(
                            'relative overflow-hidden rounded-2xl bg-neutral-900',
                            // Only the flex basis animates; the dimming is an
                            // overlay's opacity, which composites just as cheaply.
                            'transition-[flex-grow] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none',
                            isActive ? 'flex-[4]' : 'flex-[1]',
                        )}
                    >
                        {!isBroken ? (
                            <img
                                src={item.imageUrl}
                                srcSet={item.imageSrcSet || undefined}
                                sizes={item.imageSizes || undefined}
                                alt={item.alt}
                                loading="lazy"
                                decoding="async"
                                onError={() => markBroken(item.id)}
                                className={cn(
                                    'absolute inset-0 transition-transform duration-1000 motion-reduce:transition-none',
                                    isActive ? 'scale-100' : 'scale-110',
                                )}
                                style={
                                    item.placeholderUrl
                                        ? {
                                            ...COVER_STYLE,
                                            backgroundImage: `url("${item.placeholderUrl}")`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }
                                        : COVER_STYLE
                                }
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
                        )}

                        {/*
                          * Dimming is an overlay rather than a `brightness`
                          * filter on the panel: a filter applies to the whole
                          * subtree, so it dimmed the city name along with the
                          * photo and left the collapsed labels grey on grey.
                          */}
                        <div
                            className={cn(
                                'absolute inset-0 bg-black transition-opacity duration-700 motion-reduce:transition-none',
                                isActive ? 'opacity-0' : 'opacity-45',
                            )}
                        />

                        {/* Readability scrim under the labels. Present on every
                            panel — the collapsed ones carry text too. */}
                        <div
                            className={cn(
                                'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-[height] duration-700 motion-reduce:transition-none',
                                isActive ? 'h-2/3' : 'h-1/2',
                            )}
                        />

                        {/*
                          * The expand control: a full-bleed button behind the
                          * content. Focus expands too, so a keyboard user sees
                          * the panel they have landed on, and the action
                          * buttons that then become reachable belong to it.
                          */}
                        <button
                            type="button"
                            onClick={expand}
                            onFocus={expand}
                            aria-current={isActive}
                            aria-label={item.subtitle ? `${item.title}, ${item.subtitle}` : item.title}
                            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        />

                        {/* Content sits above the expand control but lets
                            pointer events through to it, except on the
                            buttons, which are the only things that act. */}
                        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-4 md:p-6">
                            <div
                                className={cn(
                                    'flex flex-col gap-2 transition-all duration-500 motion-reduce:transition-none',
                                    isActive ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-8 opacity-0',
                                )}
                            >
                                {item.subtitle && (
                                    <span className={cn(
                                        'w-fit rounded-full border border-white/40 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md md:px-3 md:text-xs',
                                        TEXT_SHADOW,
                                    )}>
                                        {item.subtitle}
                                    </span>
                                )}

                                <h3 className={cn(
                                    'text-2xl font-black uppercase leading-none text-white md:text-4xl lg:text-5xl',
                                    TEXT_SHADOW,
                                )}>
                                    {item.title}
                                </h3>

                                <div className="mt-2 flex flex-wrap gap-2 md:mt-3">
                                    {actions.map(action => (
                                        <button
                                            key={action.id}
                                            type="button"
                                            // Collapsed panels keep their buttons
                                            // mounted but out of reach, so a panel
                                            // collapsing under the pointer cannot
                                            // strand focus on a removed element.
                                            tabIndex={isActive ? 0 : -1}
                                            aria-hidden={!isActive}
                                            onFocus={expand}
                                            onClick={() => action.onSelect(item)}
                                            className={cn(
                                                'pointer-events-auto rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors md:text-sm',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                                                isActive ? '' : 'pointer-events-none',
                                                action.variant === 'secondary'
                                                    ? 'border border-white/50 bg-white/15 text-white backdrop-blur-md hover:bg-white/25'
                                                    : 'bg-white text-slate-900 hover:bg-white/90',
                                            )}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Collapsed label. `aria-hidden` because the expand
                                button already carries the same words as its
                                accessible name — a screen reader would
                                otherwise hear the city twice per panel. */}
                            <div
                                aria-hidden="true"
                                className={cn(
                                    'absolute inset-x-0 bottom-4 flex justify-center transition-opacity duration-500 md:bottom-6 motion-reduce:transition-none',
                                    isActive ? 'opacity-0' : 'opacity-100 delay-300',
                                )}
                            >
                                <span className={cn(
                                    'hidden whitespace-nowrap text-xl font-bold uppercase tracking-widest text-white [writing-mode:vertical-rl] md:block',
                                    TEXT_SHADOW,
                                )}>
                                    {item.title}
                                </span>
                                <span className={cn(
                                    'block whitespace-nowrap text-xs font-bold uppercase tracking-widest text-white md:hidden',
                                    TEXT_SHADOW,
                                )}>
                                    {item.title}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ElasticGallery;
