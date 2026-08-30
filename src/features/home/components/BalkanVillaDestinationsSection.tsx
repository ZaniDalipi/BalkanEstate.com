import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ImageStreamHero } from '@/components/ui/image-stream-hero';
import { useIsMobile } from '@/src/hooks/useIsMobile';
import {
    VILLA_DESTINATIONS,
    buildVillaDestinationPath,
    type VillaDestination,
} from '../data/villaDestinations';
import { getVillaDestinations } from '../api/villaDestinationApi';
import { villaDestinationKeys } from '@/src/shared/query/queryKeys';
import { useDestinationImages } from '../hooks/useDestinationImages';

/**
 * How many destination chips the phone fallback row shows before the "see all"
 * link takes over. Twelve fills about three rows — enough to feel like a
 * shortcut, short enough not to bury the rest of the page.
 */
const MOBILE_CHIP_LIMIT = 12;

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
    const isMobile = useIsMobile();
    // Below `lg` is the app's touch band — the villas page draws the same
    // line. A tablet is a touch device, so it takes the touch geometry.
    const isTouch = useIsMobile(1024);
    const isTablet = isTouch && !isMobile;

    // Admin-curated destinations. `getVillaDestinations` already returns []
    // for an error or an unseeded database, so a failure degrades to the
    // built-in list rather than an empty corridor.
    const { data: curated } = useQuery({
        // Centralised key (Claude.md), and the same root the admin invalidates
        // after an edit — so a curated change reaches the home page rather
        // than waiting for this cache entry to go stale on its own.
        queryKey: villaDestinationKeys.public(),
        queryFn: () => getVillaDestinations(),
        staleTime: 10 * 60 * 1000,
        retry: 1,
    });

    /*
     * Guard the corridor against an empty list — it would render an animated
     * ribbon of nothing rather than degrading to no section at all — and
     * shuffle what is left.
     *
     * The shuffle matters because of how the corridor walks the list. Each
     * card slot advances by the number of slots every time it wraps, so the
     * places arrive strictly in list order: with a couple of hundred
     * destinations, the ones near the end would not surface until the visitor
     * had watched the whole thing cycle through. Shuffling once per mount
     * means every place has the same chance of being among the first cards on
     * screen, and the section looks different on each visit.
     *
     * Order is the only thing that changes. The corridor's guarantee that no
     * two cards show the same place at once depends on the *indices* being
     * distinct, not on what sits at each index, so it survives untouched.
     */
    const destinations = useMemo(() => {
        const source = curated && curated.length > 0 ? curated : VILLA_DESTINATIONS;
        const list = source.filter(d => d.query.trim().length > 0);
        // Fisher-Yates on a copy; the source arrays are shared and frozen by
        // convention, and mutating the query cache would be a nasty surprise.
        const shuffled = [...list];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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

    /*
     * Whoever the picture actually belongs to.
     *
     * The two sources are credited differently because they are different
     * libraries: a curated photo carries the photographer's name from the
     * stock import, and everything else is still on the seeded city
     * photograph, which came from Wikimedia — the same credit the city pages
     * already show. A destination with a photo but no recorded photographer
     * was uploaded by an admin, so it is their own picture and needs no
     * credit at all.
     */
    const creditFor = useCallback(
        (dest: VillaDestination): string | undefined => {
            // Printed verbatim. It is a whole credit line, either pasted into
            // the admin from wherever the photo came from or written by the
            // import, and reformatting someone's attribution is not ours to
            // do. It is also why it is not translated: a name and a source are
            // the same in every language.
            if (dest.imageUrl) return dest.imageCredit || undefined;
            return dest.imageCity
                ? t('villas:destinationsHero.photoWikimedia', '© Wikimedia Commons')
                : undefined;
        },
        [t],
    );

    const images = useDestinationImages(destinations, labelFor, captionFor, creditFor);

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

    // Fewer cards per rail means each consecutive one has to grow more to
    // cover the same depth range, which opens visible gaps between them —
    // the default 9 read as a dense, edge-to-edge wall on a narrow phone
    // screen where there's little width to spread the ribbon across.
    //
    // On mobile the geometry is also pushed bigger and closer (larger
    // birth/exit heights, a nearer axis) so cards read as legible tiles
    // instead of a thin strip — a phone screen has far less width for the
    // ribbon to occupy than a desktop viewport does.
    // Bigger cards on a phone, without tearing the ribbon.
    //
    // The obvious move — drop to four cards so each gets more room — makes it
    // worse: with the same depth range to cover, consecutive cards have to
    // grow ~1.96x instead of ~1.63x, and the gap that opens between them is
    // wide enough to see straight through the middle of the corridor.
    //
    // Raising the birth and exit sizes together is what actually works. Seven
    // cards running from 18cqw to 118 gives a step ratio of ~1.31 — tighter
    // than the original 1.63, so the ribbon is *more* solid — while every card
    // is far larger: the outer ones fill the height of the band instead of
    // floating in the middle of it with empty space above and below.
    //
    // The birth size is the part that decides whether this is usable with a
    // finger. It sets the smallest card in the corridor, and at 6cqw that card
    // was ~23px wide — a target nobody can hit. At 18cqw nothing in the
    // ribbon is under about 50x70px, so every card on screen is tappable
    // rather than just the outer few.
    //
    // A tablet needs its own middle setting. It was falling through to the
    // desktop geometry, which assumes a mouse and a wide viewport: on an 820px
    // screen that produced cards as small as 14x20px — smaller than the phone
    // ever was — on a device that is driven by touch.
    const cards = isMobile ? 7 : isTouch ? 7 : 8;
    const path = isMobile
        // `railBirth` is left at its default. Widening it was an attempt to
        // stop the newest card being buried, and measurement said no: the
        // newest card stayed at 13% exposed and the one behind it dropped from
        // 100% to 47%. The newest card is occluded by the next card on its own
        // rail, which is what makes the ribbon solid in the first place, so it
        // is not something to design away — it is a card that has only just
        // appeared, and it is fully exposed a second later.
        ? { cardRadius: 0.9, birthHeight: 23, exitHeight: 134, railExit: 42 }
        : isTablet
            ? { cardRadius: 0.9, birthHeight: 14, exitHeight: 90, railExit: 40 }
            : { cardRadius: 0.9, exitHeight: 50 };

    return (
        <section className="bg-white">
            <ImageStreamHero
                images={images}
                onImageSelect={handleImageSelect}
                cards={cards}
                // Slow enough to read a card's name and reach for it before it
                // leaves; the pointer pause does the rest.
                //
                // Slower still on touch. A cursor is already hovering the card
                // it is about to click, so the corridor freezes before the
                // click; a finger has to travel to the screen, and whatever
                // the card was under when the aim started has moved on by the
                // time it lands. Cutting the speed by a third shrinks that
                // drift proportionally.
                speed={isTouch ? 52 : 34}
                path={path}
                axis={isMobile ? 53 : 55}
                // A shorter box on mobile means the (unchanged) title/subtitle
                // padding leaves less unused margin around the bigger cards —
                // at 500px the corridor read as a thin band with dead space
                // above and below it.
                // Taller than the corridor strictly needs, because hovering a
                // card lifts it toward the viewer and it grows well past its
                // resting size — at 540px the raised card was being sliced off
                // top and bottom by the edge of the box.
                className="h-[520px] w-full sm:h-[720px]"
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
                pointer devices the cards are the whole interface.

                Capped, and each chip is a 44px target. Listing every
                destination was fine at fourteen; at sixty it became a wall of
                small taps taller than the corridor it belongs to, which is
                nobody's idea of a shortcut. The rest of the places are still
                reachable — they come round on the cards, and the villas page
                itself has a full destination row. */}
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 px-4 pb-8 pt-4 sm:hidden">
                {destinations.slice(0, MOBILE_CHIP_LIMIT).map(dest => (
                    <button
                        key={dest.id}
                        type="button"
                        onClick={() => openDestination(dest)}
                        className="min-h-[44px] touch-manipulation rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-[13px] font-medium text-neutral-600 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-villa-gold)]"
                    >
                        {t(`villas:destinations.${dest.id}`, dest.fallback)}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onNavigate('villas', '/villas')}
                    className="min-h-[44px] touch-manipulation rounded-full border border-[var(--color-villa-gold)]/40 bg-[var(--color-villa-gold)]/10 px-4 py-2.5 text-[13px] font-semibold text-[var(--color-villa-gold-deep)] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-villa-gold)]"
                >
                    {t('villas:destinationsHero.seeAll', 'See all')}
                </button>
            </div>
        </section>
    );
};

export default BalkanVillaDestinationsSection;
