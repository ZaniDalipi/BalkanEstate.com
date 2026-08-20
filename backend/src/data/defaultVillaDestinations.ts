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
  { name: 'Mostar',        query: 'Mostar',    country: 'Bosnia and Herzegovina', imageCity: 'Mostar',    imageCountry: 'Bosnia and Herzegovina', lat: 43.3438, lng: 17.8078, zoom: 13 },
  { name: 'Jahorina',      query: 'Jahorina',  country: 'Bosnia and Herzegovina', imageCity: 'Sarajevo',  imageCountry: 'Bosnia and Herzegovina', lat: 43.7333, lng: 18.5667, zoom: 12 },
  { name: 'Hvar',          query: 'Hvar',      country: 'Croatia',                imageCity: 'Split',     imageCountry: 'Croatia',                lat: 43.1729, lng: 16.4413, zoom: 12 },
  { name: 'Zadar',         query: 'Zadar',     country: 'Croatia',                imageCity: 'Zadar',     imageCountry: 'Croatia',                lat: 44.1194, lng: 15.2314, zoom: 12 },
  { name: 'Šibenik',       query: 'Šibenik',   country: 'Croatia',                imageCity: 'Sibenik',   imageCountry: 'Croatia',                lat: 43.7350, lng: 15.8952, zoom: 12 },
  { name: 'Rovinj',        query: 'Rovinj',    country: 'Croatia',                imageCity: 'Pula',      imageCountry: 'Croatia',                lat: 45.0811, lng: 13.6387, zoom: 13 },
  { name: 'Herceg Novi',   query: 'Herceg Novi', country: 'Montenegro',           imageCity: 'Herceg Novi', imageCountry: 'Montenegro',           lat: 42.4531, lng: 18.5375, zoom: 13 },
  { name: 'Tivat',         query: 'Tivat',     country: 'Montenegro',             imageCity: 'Tivat',     imageCountry: 'Montenegro',             lat: 42.4300, lng: 18.6969, zoom: 13 },
  { name: 'Durmitor',      query: 'Žabljak',   country: 'Montenegro',             imageCity: 'Niksic',    imageCountry: 'Montenegro',             lat: 43.1547, lng: 19.1236, zoom: 11 },
  { name: 'Sarandë',       query: 'Sarandë',   country: 'Albania',                imageCity: 'Sarande',   imageCountry: 'Albania',                lat: 39.8756, lng: 20.0053, zoom: 12 },
  { name: 'Dhërmi',        query: 'Dhërmi',    country: 'Albania',                imageCity: 'Vlore',     imageCountry: 'Albania',                lat: 40.1508, lng: 19.6392, zoom: 13 },
  { name: 'Durrës',        query: 'Durrës',    country: 'Albania',                imageCity: 'Durres',    imageCountry: 'Albania',                lat: 41.3231, lng: 19.4414, zoom: 12 },
  { name: 'Mavrovo',       query: 'Mavrovo',   country: 'North Macedonia',        imageCity: 'Tetovo',    imageCountry: 'North Macedonia',        lat: 41.6833, lng: 20.7500, zoom: 11 },
  { name: 'Zlatibor',      query: 'Zlatibor',  country: 'Serbia',                 imageCity: 'Cacak',     imageCountry: 'Serbia',                 lat: 43.7289, lng: 19.6994, zoom: 11 },
  { name: 'Fruška Gora',   query: 'Fruška Gora', country: 'Serbia',               imageCity: 'Novi Sad',  imageCountry: 'Serbia',                 lat: 45.1500, lng: 19.7000, zoom: 11 },
  { name: 'Halkidiki',     query: 'Halkidiki', country: 'Greece',                 imageCity: 'Thessaloniki', imageCountry: 'Greece',              lat: 40.2000, lng: 23.4000, zoom: 10 },
  { name: 'Chania, Crete', query: 'Chania',    country: 'Greece',                 imageCity: 'Chania',    imageCountry: 'Greece',                 lat: 35.5138, lng: 24.0180, zoom: 11 },
  { name: 'Rhodes',        query: 'Rhodes',    country: 'Greece',                 imageCity: 'Rhodes',    imageCountry: 'Greece',                 lat: 36.4349, lng: 28.2176, zoom: 11 },
  { name: 'Varna',         query: 'Varna',     country: 'Bulgaria',               imageCity: 'Varna',     imageCountry: 'Bulgaria',               lat: 43.2141, lng: 27.9147, zoom: 12 },
  { name: 'Sozopol',       query: 'Sozopol',   country: 'Bulgaria',               imageCity: 'Burgas',    imageCountry: 'Bulgaria',               lat: 42.4181, lng: 27.6953, zoom: 13 },
  { name: 'Bansko',        query: 'Bansko',    country: 'Bulgaria',               imageCity: 'Sofia',     imageCountry: 'Bulgaria',               lat: 41.8386, lng: 23.4886, zoom: 12 },
  { name: 'Brașov',        query: 'Brașov',    country: 'Romania',                imageCity: 'Brasov',    imageCountry: 'Romania',                lat: 45.6427, lng: 25.5887, zoom: 12 },
  { name: 'Constanța',     query: 'Constanța', country: 'Romania',                imageCity: 'Constanta', imageCountry: 'Romania',                lat: 44.1733, lng: 28.6383, zoom: 12 },
];
