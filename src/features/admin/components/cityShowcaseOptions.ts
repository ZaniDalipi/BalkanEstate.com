import { getCountryCityNames, normalizePlaceName } from '@/shared/geo';
import type { CityDirectoryEntry } from '../api/adminApi';

export interface CityPickerOptions {
    /** Names a curator may still pick, sorted for display. */
    available: string[];
    /** Names left out because another panel already uses them, sorted for display. */
    taken: string[];
}

interface BuildCityPickerOptionsInput {
    /** The country whose cities are being offered. Empty → nothing to offer. */
    country: string;
    /**
     * Names already on record that are not in the canonical list — the city
     * directory plus the gallery's own rows. Offered after the canonical names
     * so an existing panel spelled its own way stays selectable.
     */
    known: readonly CityDirectoryEntry[];
    /** Cities other panels already use. Excluded from `available`. */
    used: readonly CityDirectoryEntry[];
    /** The name this form is editing — always offered, even against its own row. */
    current: string;
}

/**
 * The city names a curator may pick for one gallery panel.
 *
 * Two rules, and they are the whole point of this function:
 *
 * 1. The canonical country/city list is the source — the same list the
 *    create-listing form offers a seller — so every city a listing can be
 *    filed under can also be a gallery panel. Names only the database knows
 *    (imported panels, cities typed by hand in an earlier release) are merged
 *    in after it, deduplicated against it by normalised name, so the canonical
 *    spelling wins whenever the two agree.
 *
 * 2. A city another panel already uses is not offered again. The gallery keys
 *    a panel by city and country, so a second "Tirana" is not a second panel,
 *    it is a duplicate that competes with the first for the same slot. The
 *    name being edited is exempt: reopening a saved panel must still show its
 *    own city.
 *
 * Pure and total: no country, or a country with nothing on record, yields
 * empty lists rather than an error, and the field stays free-text behind it so
 * a city nobody has entered yet can still be typed.
 */
export function buildCityPickerOptions({
    country,
    known,
    used,
    current,
}: BuildCityPickerOptionsInput): CityPickerOptions {
    if (!country.trim()) return { available: [], taken: [] };

    const countryKey = normalizePlaceName(country);
    const currentKey = normalizePlaceName(current);

    const usedKeys = new Set(
        used
            .filter(entry => normalizePlaceName(entry.country) === countryKey)
            .map(entry => normalizePlaceName(entry.city))
            .filter(key => key.length > 0 && key !== currentKey),
    );

    const candidates = [
        ...getCountryCityNames(country),
        ...known
            .filter(entry => normalizePlaceName(entry.country) === countryKey)
            .map(entry => entry.city.trim())
            .filter(name => name.length > 0),
    ];

    const seen = new Set<string>();
    const available: string[] = [];
    const taken: string[] = [];

    for (const name of candidates) {
        const key = normalizePlaceName(name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        (usedKeys.has(key) ? taken : available).push(name);
    }

    const byName = (a: string, b: string) => a.localeCompare(b);
    return { available: available.sort(byName), taken: taken.sort(byName) };
}
