/**
 * The cities whose photographs are seeded into the image CDN.
 *
 * Mirrors the `CITIES` table in `backend/src/scripts/seedCityImages.ts`, which
 * is what actually uploads them. A destination that has no photo of its own
 * borrows one of these, so the admin needs the list to offer a choice — and a
 * name that is not in this table resolves to a CDN 404 and leaves the
 * card on its gradient placeholder.
 *
 * `src/tests/seededCities.test.ts` parses the backend table and fails if the
 * two ever disagree, so this cannot silently drift.
 */
export interface SeededCity {
  city: string;
  country: string;
}

export const SEEDED_CITY_IMAGES: readonly SeededCity[] = [
    // Kosovo
    { city: 'Prishtina', country: 'Kosovo' },
    { city: 'Prizren', country: 'Kosovo' },
    { city: 'Peja', country: 'Kosovo' },
    { city: 'Gjakova', country: 'Kosovo' },
    { city: 'Ferizaj', country: 'Kosovo' },
    { city: 'Mitrovica', country: 'Kosovo' },
    { city: 'Gjilan', country: 'Kosovo' },
    // Albania
    { city: 'Tirana', country: 'Albania' },
    { city: 'Durres', country: 'Albania' },
    { city: 'Vlore', country: 'Albania' },
    { city: 'Sarande', country: 'Albania' },
    { city: 'Shkoder', country: 'Albania' },
    { city: 'Fier', country: 'Albania' },
    { city: 'Berat', country: 'Albania' },
    { city: 'Elbasan', country: 'Albania' },
    { city: 'Korce', country: 'Albania' },
    // North Macedonia
    { city: 'Skopje', country: 'North Macedonia' },
    { city: 'Ohrid', country: 'North Macedonia' },
    { city: 'Bitola', country: 'North Macedonia' },
    { city: 'Tetovo', country: 'North Macedonia' },
    { city: 'Kumanovo', country: 'North Macedonia' },
    { city: 'Veles', country: 'North Macedonia' },
    { city: 'Strumica', country: 'North Macedonia' },
    { city: 'Kavadarci', country: 'North Macedonia' },
    // Serbia
    { city: 'Belgrade', country: 'Serbia' },
    { city: 'Novi Sad', country: 'Serbia' },
    { city: 'Nis', country: 'Serbia' },
    { city: 'Kragujevac', country: 'Serbia' },
    { city: 'Subotica', country: 'Serbia' },
    { city: 'Zrenjanin', country: 'Serbia' },
    { city: 'Pancevo', country: 'Serbia' },
    { city: 'Cacak', country: 'Serbia' },
    { city: 'Valjevo', country: 'Serbia' },
    { city: 'Smederevo', country: 'Serbia' },
    // Bosnia and Herzegovina
    { city: 'Sarajevo', country: 'Bosnia and Herzegovina' },
    { city: 'Banja Luka', country: 'Bosnia and Herzegovina' },
    { city: 'Mostar', country: 'Bosnia and Herzegovina' },
    { city: 'Tuzla', country: 'Bosnia and Herzegovina' },
    { city: 'Zenica', country: 'Bosnia and Herzegovina' },
    { city: 'Trebinje', country: 'Bosnia and Herzegovina' },
    { city: 'Bijeljina', country: 'Bosnia and Herzegovina' },
    { city: 'Brcko', country: 'Bosnia and Herzegovina' },
    // Croatia
    { city: 'Zagreb', country: 'Croatia' },
    { city: 'Split', country: 'Croatia' },
    { city: 'Dubrovnik', country: 'Croatia' },
    { city: 'Rijeka', country: 'Croatia' },
    { city: 'Osijek', country: 'Croatia' },
    { city: 'Zadar', country: 'Croatia' },
    { city: 'Pula', country: 'Croatia' },
    { city: 'Sibenik', country: 'Croatia' },
    { city: 'Varazdin', country: 'Croatia' },
    { city: 'Slavonski Brod', country: 'Croatia' },
    // Montenegro
    { city: 'Podgorica', country: 'Montenegro' },
    { city: 'Budva', country: 'Montenegro' },
    { city: 'Kotor', country: 'Montenegro' },
    { city: 'Niksic', country: 'Montenegro' },
    { city: 'Herceg Novi', country: 'Montenegro' },
    { city: 'Bar', country: 'Montenegro' },
    { city: 'Ulcinj', country: 'Montenegro' },
    { city: 'Tivat', country: 'Montenegro' },
    // Greece
    { city: 'Athens', country: 'Greece' },
    { city: 'Thessaloniki', country: 'Greece' },
    { city: 'Patras', country: 'Greece' },
    { city: 'Heraklion', country: 'Greece' },
    { city: 'Volos', country: 'Greece' },
    { city: 'Larissa', country: 'Greece' },
    { city: 'Ioannina', country: 'Greece' },
    { city: 'Kavala', country: 'Greece' },
    { city: 'Chania', country: 'Greece' },
    { city: 'Rhodes', country: 'Greece' },
    // Bulgaria
    { city: 'Sofia', country: 'Bulgaria' },
    { city: 'Plovdiv', country: 'Bulgaria' },
    { city: 'Varna', country: 'Bulgaria' },
    { city: 'Burgas', country: 'Bulgaria' },
    { city: 'Stara Zagora', country: 'Bulgaria' },
    { city: 'Pleven', country: 'Bulgaria' },
    { city: 'Ruse', country: 'Bulgaria' },
    { city: 'Sliven', country: 'Bulgaria' },
    { city: 'Dobrich', country: 'Bulgaria' },
    // Romania
    { city: 'Bucharest', country: 'Romania' },
    { city: 'Cluj-Napoca', country: 'Romania' },
    { city: 'Timisoara', country: 'Romania' },
    { city: 'Brasov', country: 'Romania' },
    { city: 'Iasi', country: 'Romania' },
    { city: 'Constanta', country: 'Romania' },
    { city: 'Galati', country: 'Romania' },
    { city: 'Craiova', country: 'Romania' },
    { city: 'Ploiesti', country: 'Romania' },
    { city: 'Oradea', country: 'Romania' },
];

/** Seeded cities for one country, in seed order. */
export function seededCitiesFor(country: string): readonly SeededCity[] {
  return SEEDED_CITY_IMAGES.filter(c => c.country === country);
}

/** Every country that has at least one seeded photo, in seed order. */
export const SEEDED_COUNTRIES: readonly string[] = Array.from(
  new Set(SEEDED_CITY_IMAGES.map(c => c.country)),
);
