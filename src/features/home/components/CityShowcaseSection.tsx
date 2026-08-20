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
    <div className="mx-auto flex h-[460px] w-full max-w-6xl flex-col gap-2 px-4 md:h-[560px] md:flex-row md:gap-4">
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

    const items = useMemo<ElasticGalleryItem[]>(
        () =>
            cities.slice(0, CITY_SHOWCASE_MAX_PANELS).map(city => ({
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
        [cities, t],
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
            const city = cities.find(c => c.id === item.id);
            if (!city) return;
            onNavigate(view, `${path}?q=${encodeURIComponent(city.searchQuery)}`);
        },
        [cities, onNavigate],
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

    // The section sits directly under the hero, so its top padding is small:
    // the gallery is the first thing below the fold and should not need a
    // scroll of empty white to reach.
    return (
        <section className="bg-white pb-12 pt-2 sm:pb-16 sm:pt-4">
            <div className="mx-auto mb-5 max-w-6xl px-4">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {t('home:cityGallery.title', 'Explore Balkan Cities')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    {t('home:cityGallery.subtitle', 'Hand-picked cities across the region. Open one to browse what is for sale or for rent there.')}
                </p>
            </div>

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
