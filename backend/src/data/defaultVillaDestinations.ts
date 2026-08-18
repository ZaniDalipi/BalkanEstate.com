/**
 * The villa destinations the home-page corridor ships with.
 *
 * Single source for both the seed script and the admin "import built-in
 * destinations" action, so the two can never drift. Mirrors
 * `src/features/home/data/villaDestinations.ts` on the frontend, which is the
 * fallback the corridor uses until these exist in the database.
 *
 * `imageCity`/`imageCountry` point at a seeded Cloudinary city photo
 * (`city-{country}-{city}`). Several entries are regions rather than seeded
 * cities, so they borrow the nearest city that has a photo — a Ferizaj picture
 * standing in for Jezerc is approximate on purpose, and is exactly what an
 * admin is expected to replace.
 */
export interface DefaultVillaDestination {
  name: string;
  query: string;
  country: string;
  imageCity: string;
  imageCountry: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const DEFAULT_VILLA_DESTINATIONS: readonly DefaultVillaDestination[] = [
  { name: 'Jezerc',        query: 'Jezerc',    country: 'Kosovo',                 imageCity: 'Ferizaj',   imageCountry: 'Kosovo',                 lat: 42.3100, lng: 21.0500, zoom: 12 },
  { name: 'Brezovica',     query: 'Brezovica', country: 'Kosovo',                 imageCity: 'Prizren',   imageCountry: 'Kosovo',                 lat: 42.1736, lng: 20.9394, zoom: 12 },
  { name: 'Rugova',        query: 'Rugova',    country: 'Kosovo',                 imageCity: 'Peja',      imageCountry: 'Kosovo',                 lat: 42.6500, lng: 20.1500, zoom: 12 },
  { name: 'Prevallë',      query: 'Prevallë',  country: 'Kosovo',                 imageCity: 'Prizren',   imageCountry: 'Kosovo',                 lat: 42.1900, lng: 20.8700, zoom: 12 },
  { name: 'Batllava',      query: 'Batllava',  country: 'Kosovo',                 imageCity: 'Prishtina', imageCountry: 'Kosovo',                 lat: 42.7833, lng: 21.2833, zoom: 12 },
  { name: 'Bay of Kotor',  query: 'Kotor',     country: 'Montenegro',             imageCity: 'Kotor',     imageCountry: 'Montenegro',             lat: 42.4247, lng: 18.7712, zoom: 12 },
  { name: 'Budva Riviera', query: 'Budva',     country: 'Montenegro',             imageCity: 'Budva',     imageCountry: 'Montenegro',             lat: 42.2864, lng: 18.8400, zoom: 12 },
  { name: 'Ulcinj',        query: 'Ulcinj',    country: 'Montenegro',             imageCity: 'Ulcinj',    imageCountry: 'Montenegro',             lat: 41.9294, lng: 19.2244, zoom: 12 },
  { name: 'Dubrovnik',     query: 'Dubrovnik', country: 'Croatia',                imageCity: 'Dubrovnik', imageCountry: 'Croatia',                lat: 42.6507, lng: 18.0944, zoom: 13 },
  { name: 'Split',         query: 'Split',     country: 'Croatia',                imageCity: 'Split',     imageCountry: 'Croatia',                lat: 43.5081, lng: 16.4402, zoom: 12 },
  { name: 'Lake Ohrid',    query: 'Ohrid',     country: 'North Macedonia',        imageCity: 'Ohrid',     imageCountry: 'North Macedonia',        lat: 41.1172, lng: 20.8016, zoom: 11 },
  { name: 'Ksamil',        query: 'Ksamil',    country: 'Albania',                imageCity: 'Sarande',   imageCountry: 'Albania',                lat: 39.7667, lng: 20.0016, zoom: 13 },
  { name: 'Vlorë',         query: 'Vlorë',     country: 'Albania',                imageCity: 'Vlore',     imageCountry: 'Albania',                lat: 40.4667, lng: 19.4833, zoom: 12 },
  { name: 'Trebinje',      query: 'Trebinje',  country: 'Bosnia and Herzegovina', imageCity: 'Trebinje',  imageCountry: 'Bosnia and Herzegovina', lat: 42.7111, lng: 18.3436, zoom: 12 },
];
