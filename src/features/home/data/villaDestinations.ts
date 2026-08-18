/**
 * Balkan villa destinations showcased on the home page.
 *
 * `imageCity`/`imageCountry` name the city whose photo represents the
 * destination. Those photos already live in Cloudinary under the
 * `city-{country}-{city}` public id, seeded by
 * `backend/src/scripts/seedCityImages.ts` — so nothing here needs uploading.
 *
 * Several destinations are villa regions rather than seeded cities (Jezerc,
 * Brezovica, Rugova, Prevallë, Batllava, Ksamil). Those borrow the nearest
 * seeded city, which is honest for a regional card: the photo stands for the
 * area, and `query` still targets the destination itself.
 *
 * To give one of them its own photo later, append it to `CITIES` in
 * seedCityImages.ts and re-run the script — it fetches and uploads on its own.
 */

export interface VillaDestination {
    /** Stable id, also the i18n key suffix under `villas:destinations`. */
    id: string;
    /** English fallback shown when the locale has no translation yet. */
    fallback: string;
    /** Free-text location search sent to the villas page. */
    query: string;
    /** Country label shown under the name. */
    country: string;
    /** Seeded city supplying the Cloudinary photo. */
    imageCity: string;
    /** Country of `imageCity` — part of the Cloudinary public id. */
    imageCountry: string;
    /** Map focus when the villas page opens. */
    center: readonly [number, number];
    zoom: number;
}

export const VILLA_DESTINATIONS: readonly VillaDestination[] = [
    // ── Kosovo — the villa belt around Ferizaj, the Sharr range and Rugova ──
    {
        id: 'jezerc',
        fallback: 'Jezerc',
        query: 'Jezerc',
        country: 'Kosovo',
        imageCity: 'Ferizaj',
        imageCountry: 'Kosovo',
        center: [42.3100, 21.0500],
        zoom: 12,
    },
    {
        id: 'brezovica',
        fallback: 'Brezovica',
        query: 'Brezovica',
        country: 'Kosovo',
        imageCity: 'Prizren',
        imageCountry: 'Kosovo',
        center: [42.1736, 20.9394],
        zoom: 12,
    },
    {
        id: 'rugova',
        fallback: 'Rugova',
        query: 'Rugova',
        country: 'Kosovo',
        imageCity: 'Peja',
        imageCountry: 'Kosovo',
        center: [42.6500, 20.1500],
        zoom: 12,
    },
    {
        id: 'prevalla',
        fallback: 'Prevallë',
        query: 'Prevallë',
        country: 'Kosovo',
        imageCity: 'Prizren',
        imageCountry: 'Kosovo',
        center: [42.1900, 20.8700],
        zoom: 12,
    },
    {
        id: 'batllava',
        fallback: 'Batllava',
        query: 'Batllava',
        country: 'Kosovo',
        imageCity: 'Prishtina',
        imageCountry: 'Kosovo',
        center: [42.7833, 21.2833],
        zoom: 12,
    },
    // ── Montenegro ──
    {
        id: 'kotorBay',
        fallback: 'Bay of Kotor',
        query: 'Kotor',
        country: 'Montenegro',
        imageCity: 'Kotor',
        imageCountry: 'Montenegro',
        center: [42.4247, 18.7712],
        zoom: 12,
    },
    {
        id: 'budvaRiviera',
        fallback: 'Budva Riviera',
        query: 'Budva',
        country: 'Montenegro',
        imageCity: 'Budva',
        imageCountry: 'Montenegro',
        center: [42.2864, 18.8400],
        zoom: 12,
    },
    {
        id: 'ulcinj',
        fallback: 'Ulcinj',
        query: 'Ulcinj',
        country: 'Montenegro',
        imageCity: 'Ulcinj',
        imageCountry: 'Montenegro',
        center: [41.9294, 19.2244],
        zoom: 12,
    },
    // ── Croatia ──
    {
        id: 'dubrovnik',
        fallback: 'Dubrovnik',
        query: 'Dubrovnik',
        country: 'Croatia',
        imageCity: 'Dubrovnik',
        imageCountry: 'Croatia',
        center: [42.6507, 18.0944],
        zoom: 13,
    },
    {
        id: 'split',
        fallback: 'Split',
        query: 'Split',
        country: 'Croatia',
        imageCity: 'Split',
        imageCountry: 'Croatia',
        center: [43.5081, 16.4402],
        zoom: 12,
    },
    // ── North Macedonia ──
    {
        id: 'lakeOhrid',
        fallback: 'Lake Ohrid',
        query: 'Ohrid',
        country: 'North Macedonia',
        imageCity: 'Ohrid',
        imageCountry: 'North Macedonia',
        center: [41.1172, 20.8016],
        zoom: 11,
    },
    // ── Albania ──
    {
        id: 'ksamil',
        fallback: 'Ksamil',
        query: 'Ksamil',
        country: 'Albania',
        imageCity: 'Sarande',
        imageCountry: 'Albania',
        center: [39.7667, 20.0016],
        zoom: 13,
    },
    {
        id: 'vlore',
        fallback: 'Vlorë',
        query: 'Vlorë',
        country: 'Albania',
        imageCity: 'Vlore',
        imageCountry: 'Albania',
        center: [40.4667, 19.4833],
        zoom: 12,
    },
    // ── Bosnia and Herzegovina ──
    {
        id: 'trebinje',
        fallback: 'Trebinje',
        query: 'Trebinje',
        country: 'Bosnia and Herzegovina',
        imageCity: 'Trebinje',
        imageCountry: 'Bosnia and Herzegovina',
        center: [42.7111, 18.3436],
        zoom: 12,
    },
];

/**
 * Deep link into the villas page for a destination. The villas page validates
 * every one of these before using it, so a hand-edited URL can't move the map
 * somewhere absurd.
 */
export function buildVillaDestinationPath(dest: VillaDestination): string {
    const params = new URLSearchParams({
        destination: dest.query,
        lat: String(dest.center[0]),
        lng: String(dest.center[1]),
        zoom: String(dest.zoom),
    });
    return `/villas?${params.toString()}`;
}
