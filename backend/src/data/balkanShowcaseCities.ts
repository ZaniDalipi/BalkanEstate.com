/**
 * The Balkan cities this app treats as well-known enough to have a real,
 * findable photo — 89 cities across the same 10 countries `BALKAN_COUNTRIES`
 * (constants/countries.ts) already treats as canonical.
 *
 * Shared source for:
 * - `scripts/seedCityImages.ts`, which fetches a Wikipedia/Commons photo for
 *   each and uploads it to the `city-{country}-{city}` Cloudinary library;
 * - `services/cityShowcaseImportService.ts`, which offers these as candidates
 *   for the home-page gallery even on a fresh database with no
 *   `CityMarketData` rows yet — the point being that "Import cities from
 *   database" produces real cities on day one, not an empty list waiting on
 *   market data that may never get entered for a place that just needs to
 *   look good in a gallery.
 *
 * One list, not three: city name spellings and the country they belong to
 * have to agree everywhere a city is looked up by name, or a photo seeded
 * under one spelling silently never matches a lookup under another.
 */

export interface BalkanShowcaseCity {
  city: string;
  country: string;
  /** Wikipedia article title, when it differs from `city` (diacritics, disambiguation). */
  wikiAlt?: string;
}

export const BALKAN_SHOWCASE_CITIES: readonly BalkanShowcaseCity[] = [
  // Kosovo
  { city: 'Prishtina', country: 'Kosovo', wikiAlt: 'Pristina' },
  { city: 'Prizren', country: 'Kosovo' },
  { city: 'Peja', country: 'Kosovo' },
  { city: 'Gjakova', country: 'Kosovo' },
  { city: 'Ferizaj', country: 'Kosovo' },
  { city: 'Mitrovica', country: 'Kosovo', wikiAlt: 'Mitrovicë' },
  { city: 'Gjilan', country: 'Kosovo' },
  // Albania
  { city: 'Tirana', country: 'Albania' },
  { city: 'Durres', country: 'Albania', wikiAlt: 'Durrës' },
  { city: 'Vlore', country: 'Albania', wikiAlt: 'Vlorë' },
  { city: 'Sarande', country: 'Albania', wikiAlt: 'Sarandë' },
  { city: 'Shkoder', country: 'Albania', wikiAlt: 'Shkodër' },
  { city: 'Fier', country: 'Albania' },
  { city: 'Berat', country: 'Albania' },
  { city: 'Elbasan', country: 'Albania' },
  { city: 'Korce', country: 'Albania', wikiAlt: 'Korçë' },
  // North Macedonia
  { city: 'Skopje', country: 'North Macedonia' },
  { city: 'Ohrid', country: 'North Macedonia' },
  { city: 'Bitola', country: 'North Macedonia' },
  { city: 'Tetovo', country: 'North Macedonia' },
  { city: 'Kumanovo', country: 'North Macedonia' },
  { city: 'Veles', country: 'North Macedonia', wikiAlt: 'Veles, North Macedonia' },
  { city: 'Strumica', country: 'North Macedonia' },
  { city: 'Kavadarci', country: 'North Macedonia' },
  // Serbia
  { city: 'Belgrade', country: 'Serbia' },
  { city: 'Novi Sad', country: 'Serbia' },
  { city: 'Nis', country: 'Serbia', wikiAlt: 'Niš' },
  { city: 'Kragujevac', country: 'Serbia' },
  { city: 'Subotica', country: 'Serbia' },
  { city: 'Zrenjanin', country: 'Serbia' },
  { city: 'Pancevo', country: 'Serbia', wikiAlt: 'Pančevo' },
  { city: 'Cacak', country: 'Serbia', wikiAlt: 'Čačak' },
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
  { city: 'Brcko', country: 'Bosnia and Herzegovina', wikiAlt: 'Brčko' },
  // Croatia
  { city: 'Zagreb', country: 'Croatia' },
  { city: 'Split', country: 'Croatia' },
  { city: 'Dubrovnik', country: 'Croatia' },
  { city: 'Rijeka', country: 'Croatia' },
  { city: 'Osijek', country: 'Croatia' },
  { city: 'Zadar', country: 'Croatia' },
  { city: 'Pula', country: 'Croatia' },
  { city: 'Sibenik', country: 'Croatia', wikiAlt: 'Šibenik' },
  { city: 'Varazdin', country: 'Croatia', wikiAlt: 'Varaždin' },
  { city: 'Slavonski Brod', country: 'Croatia' },
  // Montenegro
  { city: 'Podgorica', country: 'Montenegro' },
  { city: 'Budva', country: 'Montenegro' },
  { city: 'Kotor', country: 'Montenegro' },
  { city: 'Niksic', country: 'Montenegro', wikiAlt: 'Nikšić' },
  { city: 'Herceg Novi', country: 'Montenegro' },
  { city: 'Bar', country: 'Montenegro', wikiAlt: 'Bar, Montenegro' },
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
  { city: 'Rhodes', country: 'Greece', wikiAlt: 'Rhodes (city)' },
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
  { city: 'Timisoara', country: 'Romania', wikiAlt: 'Timișoara' },
  { city: 'Brasov', country: 'Romania', wikiAlt: 'Brașov' },
  { city: 'Iasi', country: 'Romania', wikiAlt: 'Iași' },
  { city: 'Constanta', country: 'Romania', wikiAlt: 'Constanța' },
  { city: 'Galati', country: 'Romania', wikiAlt: 'Galați' },
  { city: 'Craiova', country: 'Romania' },
  { city: 'Ploiesti', country: 'Romania', wikiAlt: 'Ploiești' },
  { city: 'Oradea', country: 'Romania' },
];
