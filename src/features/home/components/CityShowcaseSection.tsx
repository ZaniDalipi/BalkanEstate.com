import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ElasticGallery,
    type ElasticGalleryAction,
    type ElasticGalleryItem,
} from '@/src/components/ui/elastic-gallery';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';
import { CITY_SHOWCASE_MAX_PANELS } from '@/src/shared/constants/app.constants';
import { useShowcaseCities } from '../hooks/useShowcaseCities';
import { pickShowcaseCities } from '../utils/pickShowcaseCities';

/**
 * Delivery widths for a panel.
 *
 * The gallery is `max-w-6xl` (1152px) with five 16px gaps, so on a desktop wide
 * enough to fill it the expanded panel is ~476px and each collapsed sliver
 * ~119px. 960 therefore covers the expanded panel on a 2x display and nothing
 * needs more — the 1280 and 1600 candidates that used to be here were only ever
 * downloaded because `sizes` claimed every panel was half the viewport, and
 * they cost roughly three times the bytes of the file the panel actually paints.
 * The small end exists for the slivers, which pick from it.
 */
const PANEL_WIDTHS = [160, 240, 320, 480, 640, 960];

/**
 * The expanded panel: ~476px once the container is at its 1152px cap, a little
 * under half the viewport before that, and the full width of the screen below
 * `md`, where the panels stack instead of sitting side by side.
 */
const PANEL_SIZES = '(min-width: 1200px) 480px, (min-width: 768px) 45vw, 100vw';

/**
 * A collapsed sliver: a ninth of the track on desktop, which is what stops the
 * browser fetching a full-width photo for each of the five panels showing
 * nothing but a vertical city name.
 *
 * The mobile figure is deliberately half the width the sliver really occupies.
 * Stacked, a collapsed panel is the full width of the screen but only a ninth
 * of the gallery's height — a ~50px strip under a 45% black overlay with the
 * city name across it. Asking for the honest `100vw` there means a phone at 3x
 * downloading the largest candidate for all six panels; half that resolution is
 * indistinguishable through the overlay at that height and is what keeps the
 * mobile first paint down.
 */
const PANEL_SIZES_COLLAPSED = '(min-width: 1200px) 120px, (min-width: 768px) 12vw, 50vw';

interface CityShowcaseSectionProps {
    onNavigate: (view: string, path: string) => void;
}

const GallerySkeleton: React.FC = () => (
    // Same geometry as the real gallery, so the section does not jump height
    // when the panels arrive.
    <div className="mx-auto flex h-[460px] w-full max-w-6xl flex-col gap-2 md:h-[560px] md:flex-row md:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
            <div
                key={index}
                className={`animate-pulse rounded-2xl bg-slate-100 ${index === 0 ? 'flex-[4]' : 'flex-[1]'}`}
            />
        ))}
    </div>
);

/**
 * Home-page city gallery.
 *
 * Every panel comes from the `city-showcase` collection — the city name, the
 * photo and the search it runs are all admin-curated, and there is no built-in
 * list behind it. That is deliberate: two sources for one section is how a
 * change made in the admin ends up invisible on the home page. The consequence
 * is that an empty or failed load renders nothing at all, which is the honest
 * outcome — an empty gallery frame says less than no section.
 */
const CityShowcaseSection: React.FC<CityShowcaseSectionProps> = ({ onNavigate }) => {
    const { t } = useTranslation(['home']);
    const { cities, isLoading, isError } = useShowcaseCities();

    /*
     * A fresh draw per mount, not per render: the memo below would otherwise
     * reshuffle the panels on every parent re-render and the gallery would
     * reorder itself under the visitor's pointer. Holding the draw in a memo
     * keyed on the fetched list pins it for as long as that list is the same
     * one — a new visit, or a curated change, deals again.
     */
    const shown = useMemo(
        () => pickShowcaseCities(cities, CITY_SHOWCASE_MAX_PANELS),
        [cities],
    );

    const items = useMemo<ElasticGalleryItem[]>(
        () =>
            shown.map(city => ({
                id: city.id,
                title: city.city,
                subtitle: city.country,
                // Through the Cloudinary helpers, never the raw stored URL
                // (Claude.md). A non-Cloudinary URL falls through them
                // unchanged, so a manually entered photo still renders.
                //
                // `crop: 'limit'` rather than the helper's own `fill` default:
                // a panel photo narrower than the requested width would
                // otherwise be upscaled by the CDN to fill it, which is
                // exactly the blur this section has fought on the write side
                // (`cityImageService.ts`, `seedCityImages.ts`). `limit` only
                // ever scales down: a source already at 960px is delivered at
                // 960px, a smaller one is delivered at its own size — sharper
                // either way — and the `object-cover` on the panel still
                // fills the frame regardless of which it gets.
                imageUrl: optimizeCloudinaryUrl(city.imageUrl, { width: 960, quality: 'auto', crop: 'limit' }) || city.imageUrl,
                imageSrcSet: cloudinarySrcSet(city.imageUrl, PANEL_WIDTHS, { quality: 'auto', crop: 'limit' }) || undefined,
                imageSizes: PANEL_SIZES,
                imageSizesCollapsed: PANEL_SIZES_COLLAPSED,
                // Blurred, and smaller than it was. Painted across a whole
                // panel, an unblurred 40px thumbnail reads as a broken image
                // rather than as a photo arriving; blurring it makes the same
                // ~1KB look like a deliberate colour wash, so the wait — however
                // short it now is — stops looking like a failure.
                placeholderUrl: optimizeCloudinaryUrl(city.imageUrl, { width: 24, quality: 'auto:eco', blur: 400 }) || undefined,
                alt: t('home:cityGallery.imageAlt', 'Property in {{city}}, {{country}}', {
                    city: city.city,
                    country: city.country,
                }),
                credit: city.imageCredit,
            })),
        [shown, t],
    );

    /*
     * `searchQuery` rather than the display name: the two differ whenever an
     * admin labels a panel one way ("Coastal Montenegro") and searches another
     * ("Budva"). Only `q` is sent — both pages normalise a `country` param
     * against their own list of country keys, and a free-text country from the
     * admin that misses that list would filter every result away.
     */
    const openFor = useCallback(
        (item: ElasticGalleryItem, view: 'search' | 'rentals', path: string) => {
            const city = shown.find(c => c.id === item.id);
            if (!city) return;
            onNavigate(view, `${path}?q=${encodeURIComponent(city.searchQuery)}`);
        },
        [shown, onNavigate],
    );

    /** Buy and rent are separate pages, so the panel offers both rather than
     *  dropping the visitor on one and making them switch. Buy is also the
     *  panel's own click target (see `defaultActionId` below) — it is the
     *  larger side of the site and the one the hero opens on, so a visitor who
     *  clicks the photo rather than a button lands where the rest of the page
     *  already pointed them. Rent stays a button because that is its only way
     *  in. */
    const actions = useMemo<ElasticGalleryAction[]>(
        () => [
            {
                id: 'buy',
                label: t('home:cityGallery.buy', 'Buy'),
                onSelect: item => openFor(item, 'search', '/search'),
            },
            {
                id: 'rent',
                label: t('home:cityGallery.rent', 'Rent'),
                variant: 'secondary',
                onSelect: item => openFor(item, 'rentals', '/rent'),
            },
        ],
        [openFor, t],
    );

    // Nothing curated, or the list could not be loaded: no section. React Query
    // owns the retry, so a transient failure recovers without help from here.
    if (!isLoading && (isError || items.length === 0)) return null;

    /*
     * No heading of its own. The gallery is rendered inside the hero, right
     * under its buttons, and a second heading there would compete with the
     * hero's own. The group still carries an accessible name — see `label`
     * below — so it is announced without anything being drawn.
     */
    return (
        <section className="mt-6 sm:mt-8">
            {isLoading ? (
                <GallerySkeleton />
            ) : (
                <ElasticGallery
                    items={items}
                    label={t('home:cityGallery.title', 'Explore Balkan Cities')}
                    actions={actions}
                    defaultActionId="buy"
                    /* The gallery sits inside the hero, so these photos are the
                       first thing on the page and usually its largest paint.
                       Lazy loading them — the gallery's own default, right for a
                       gallery further down a page — held them behind layout and
                       behind every other request the page makes. */
                    priority
                />
            )}
        </section>
    );
};

export default CityShowcaseSection;
