import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ImageStreamHero } from '@/components/ui/image-stream-hero';
import {
    VILLA_DESTINATIONS,
    buildVillaDestinationPath,
    type VillaDestination,
} from '../data/villaDestinations';
import { getVillaDestinations } from '../api/villaDestinationApi';
import { useDestinationImages } from '../hooks/useDestinationImages';

interface BalkanVillaDestinationsSectionProps {
    onNavigate: (view: string, path: string) => void;
}

/**
 * Home-page hero showcasing Balkan villa destinations in a perspective
 * corridor. Both the moving cards and the chips below are real buttons —
 * either one opens that destination's luxury villas.
 *
 * Photos come from the Cloudinary city library already seeded by
 * `backend/src/scripts/seedCityImages.ts`; see `../data/villaDestinations.ts`
 * for how a region maps to the city that represents it.
 */
const BalkanVillaDestinationsSection: React.FC<BalkanVillaDestinationsSectionProps> = ({
    onNavigate,
}) => {
    const { t } = useTranslation(['villas', 'home']);

    // Admin-curated destinations. `getVillaDestinations` already returns []
    // for an error or an unseeded database, so a failure degrades to the
    // built-in list rather than an empty corridor.
    const { data: curated } = useQuery({
        queryKey: ['villaDestinations'],
        queryFn: ({ signal }) => getVillaDestinations(signal),
        staleTime: 10 * 60 * 1000,
        retry: 1,
    });

    // Guard the corridor against an empty list: it would render an animated
    // ribbon of nothing rather than degrading to no section at all.
    const destinations = useMemo(() => {
        const source = curated && curated.length > 0 ? curated : VILLA_DESTINATIONS;
        return source.filter(d => d.query.trim().length > 0);
    }, [curated]);

    const labelFor = useCallback(
        (dest: VillaDestination) =>
            t('villas:destinationsHero.cardLabel', 'Luxury villas in {{place}}, {{country}}', {
                place: t(`villas:destinations.${dest.id}`, dest.fallback),
                country: dest.country,
            }),
        [t],
    );

    const captionFor = useCallback(
        (dest: VillaDestination) => t(`villas:destinations.${dest.id}`, dest.fallback),
        [t],
    );

    const images = useDestinationImages(destinations, labelFor, captionFor);

    const openDestination = useCallback(
        (dest: VillaDestination | undefined) => {
            if (!dest) return;
            onNavigate('villas', buildVillaDestinationPath(dest));
        },
        [onNavigate],
    );

    const handleImageSelect = useCallback(
        (index: number) => openDestination(destinations[index]),
        [destinations, openDestination],
    );

    if (destinations.length === 0) return null;

    return (
        <section className="bg-white">
            <ImageStreamHero
                images={images}
                onImageSelect={handleImageSelect}
                cards={9}
                // Slow enough to read a card's name and reach for it before it
                // leaves; the pointer pause does the rest.
                speed={34}
                // Softer corners than the stock 0.4 — the cards carry a photo
                // and a label, so they read as cards rather than film frames.
                path={{ cardRadius: 0.9 }}
                axis={55}
                className="h-[440px] w-full sm:h-[520px]"
            >
                {/* Title top, supporting line bottom — the corridor owns the
                    middle band, so nothing else may sit there or it collides
                    with the ribbon. The chips live below the hero for that
                    reason. `pointer-events-none` keeps the cards clickable
                    through the gaps. */}
                <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-between py-8 text-center sm:py-10">
                    <div className="px-6">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                            {t('villas:destinationsHero.eyebrow', 'Across the Balkans')}
                        </p>
                        <h2 className="text-balance text-2xl font-medium tracking-tight text-neutral-900 sm:text-4xl">
                            {t('villas:destinationsHero.title1', 'Luxury villas,')}
                            <br />
                            <span style={{ color: 'var(--color-villa-gold-deep)' }}>
                                {t('villas:destinationsHero.title2', 'wherever you wander.')}
                            </span>
                        </h2>
                    </div>

                    <p className="max-w-md text-balance px-6 text-[13px] text-neutral-500">
                        {t(
                            'villas:destinationsHero.subtitle',
                            'From the Sharr mountains to the Adriatic. Pick a place and see the villas waiting there.',
                        )}
                    </p>
                </div>
            </ImageStreamHero>

            {/* The place names live on the cards themselves. This chip row is
                the touch fallback only: hover-to-pause doesn't exist on a
                phone, so tapping a moving card there is mostly luck. On
                pointer devices the cards are the whole interface. */}
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 px-4 pb-8 pt-4 sm:hidden">
                {destinations.map(dest => (
                    <button
                        key={dest.id}
                        type="button"
                        onClick={() => openDestination(dest)}
                        className="rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-villa-gold)]"
                    >
                        {t(`villas:destinations.${dest.id}`, dest.fallback)}
                    </button>
                ))}
            </div>
        </section>
    );
};

export default BalkanVillaDestinationsSection;
