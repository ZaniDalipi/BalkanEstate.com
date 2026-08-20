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

/** Delivery widths for a panel. The largest covers an expanded panel at 2x. */
const PANEL_WIDTHS = [320, 480, 640, 960, 1280, 1600];

/**
 * An expanded panel is about half the 1152px container on desktop and the full
 * width of the screen on mobile. Collapsed panels are far narrower, so this
 * over-serves them slightly — the alternative is re-requesting a larger file
 * every time a visitor expands one.
 */
const PANEL_SIZES = '(min-width: 768px) 50vw, 100vw';

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
                imageUrl: optimizeCloudinaryUrl(city.imageUrl, { width: 960, quality: 'auto' }) || city.imageUrl,
                imageSrcSet: cloudinarySrcSet(city.imageUrl, PANEL_WIDTHS, { quality: 'auto' }) || undefined,
                imageSizes: PANEL_SIZES,
                placeholderUrl: optimizeCloudinaryUrl(city.imageUrl, { width: 40, quality: 'auto:eco' }) || undefined,
                alt: t('home:cityGallery.imageAlt', 'Property in {{city}}, {{country}}', {
                    city: city.city,
                    country: city.country,
                }),
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
     *  dropping the visitor on one and making them switch. */
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
                />
            )}
        </section>
    );
};

export default CityShowcaseSection;
