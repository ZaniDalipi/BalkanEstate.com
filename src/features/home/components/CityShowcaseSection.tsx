import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ElasticGallery,
    type ElasticGalleryAction,
    type ElasticGalleryItem,
} from '@/src/components/ui/elastic-gallery';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';
import { CITY_SHOWCASE_MAX_PANELS } from '@/src/shared/constants/app.constants';
import { useImageBudget } from '@/src/shared/hooks/useImageBudget';
import { useShowcaseCities } from '../hooks/useShowcaseCities';
import { pickShowcaseCities } from '../utils/pickShowcaseCities';

/**
 * Delivery widths for a panel. The small end exists for collapsed slivers, the
 * large end for an expanded panel on a retina desktop.
 *
 * `lite` drops the top of the ladder entirely: on a metered or 3G connection
 * the difference between a 960px and a 1600px panel photo is invisible under
 * the gallery's own dark scrim and costs the visitor a second of waiting.
 */
const PANEL_WIDTHS = [240, 320, 480, 640, 960, 1280, 1600];
const PANEL_WIDTHS_LITE = [240, 320, 480, 640, 960];

/**
 * What an *expanded* panel actually measures: roughly half the 1152px container
 * on desktop, the full width of the screen on mobile.
 */
const PANEL_SIZES = '(min-width: 768px) 50vw, 100vw';

/**
 * What a *collapsed* panel measures. Deliberately smaller than the panel's true
 * CSS width on mobile, where a sliver is full-width but only ~44px tall: the
 * photo is cover-cropped to that strip and sits under a 45%-opacity black
 * overlay, so a candidate chosen for a third of the width is indistinguishable
 * from the honest one and is a quarter of the bytes. Five of the six panels
 * start collapsed, so this is most of what a phone downloads before the
 * visitor has touched anything.
 */
const COLLAPSED_PANEL_SIZES = '(min-width: 768px) 15vw, 30vw';

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
                // The same shimmer the panels themselves use while their photos
                // load, so the section has one loading language from empty
                // frame to finished photo rather than a pulse that becomes a
                // sweep halfway through.
                className={`image-shimmer image-shimmer-light rounded-2xl ${index === 0 ? 'flex-[4]' : 'flex-[1]'}`}
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
    const budget = useImageBudget();

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

    const items = useMemo<ElasticGalleryItem[]>(() => {
        const isLite = budget === 'lite';
        const widths = isLite ? PANEL_WIDTHS_LITE : PANEL_WIDTHS;
        // `auto` lets Cloudinary pick per image; `auto:eco` tells it to bias
        // that choice towards the smaller file, which is the trade a saver-mode
        // or 3G visitor has already asked for.
        const quality = isLite ? ('auto:eco' as const) : ('auto' as const);

        return shown.map(city => ({
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
            //
            // The `src` is the fallback for a browser that ignores `srcSet`,
            // so it names the middle of the ladder rather than the top: on the
            // phones that matter here it is the widest file the panel could
            // ever need, and on a desktop `srcSet` overrides it anyway.
            imageUrl:
                optimizeCloudinaryUrl(city.imageUrl, { width: 640, quality, crop: 'limit' }) || city.imageUrl,
            imageSrcSet: cloudinarySrcSet(city.imageUrl, widths, { quality, crop: 'limit' }) || undefined,
            imageSizes: PANEL_SIZES,
            collapsedImageSizes: COLLAPSED_PANEL_SIZES,
            // ~1KB, and blurred by the CDN rather than by a filter on the
            // client: `e_blur` is baked into the file the browser caches, so
            // the phone paints a smooth backdrop without spending a frame
            // blurring a 40px image up to panel size itself.
            placeholderUrl:
                optimizeCloudinaryUrl(city.imageUrl, { width: 40, quality: 'auto:eco', blur: 400 }) || undefined,
            alt: t('home:cityGallery.imageAlt', 'Property in {{city}}, {{country}}', {
                city: city.city,
                country: city.country,
            }),
            credit: city.imageCredit,
        }));
    }, [budget, shown, t]);

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
                />
            )}
        </section>
    );
};

export default CityShowcaseSection;
