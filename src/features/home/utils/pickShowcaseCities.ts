import type { ShowcaseCity } from '../api/cityShowcaseApi';

/**
 * Chooses which curated cities the gallery shows this visit.
 *
 * Every active city an admin has curated is a candidate, and the pick is
 * random per page load — the same behaviour the hero's popular-city chips had,
 * so a returning visitor meets a different part of the region each time rather
 * than the same six cities forever.
 *
 * Randomness alone would happily draw six Albanian cities, so country
 * diversity comes first: one city per country, then whatever is left over.
 * That is what keeps the gallery reading as "the Balkans" rather than
 * "wherever we happen to have the most listings".
 *
 * Pure: the source of randomness is injected, so a test can pin it.
 */
export function pickShowcaseCities(
    cities: readonly ShowcaseCity[],
    count: number,
    random: () => number = Math.random,
): ShowcaseCity[] {
    if (count <= 0) return [];

    const shuffled = shuffle(cities, random);
    const picked: ShowcaseCity[] = [];
    const seenCountries = new Set<string>();

    // Pass 1 — one city per country, in shuffled order.
    for (const city of shuffled) {
        if (picked.length >= count) break;
        const country = city.country.toLowerCase();
        if (seenCountries.has(country)) continue;
        seenCountries.add(country);
        picked.push(city);
    }

    // Pass 2 — fill any remaining slots, second city per country and so on.
    if (picked.length < count) {
        const takenIds = new Set(picked.map(city => city.id));
        for (const city of shuffled) {
            if (picked.length >= count) break;
            if (takenIds.has(city.id)) continue;
            picked.push(city);
        }
    }

    return picked;
}

/** Fisher–Yates on a copy — the input array belongs to the query cache. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
