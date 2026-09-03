import { GoogleGenerativeAI } from '@google/generative-ai';
import { escapeRegex } from '../utils/escapeRegex';
import CityMarketData, { ICityMarketData } from '../models/CityMarketData';
import Property from '../models/Property';
import { FlattenMaps } from 'mongoose';
import { apiLogger } from '../utils/logger';
import { fetchLiveCityPrice, getOfficialSourceInfo } from './officialPriceDataService';
import { resolveCityPhotos, placeKey, ResolvedCityPhoto, CityPhotoSource } from './cityPhotoService';

// Type for lean documents (plain objects without Mongoose methods)
export type CityMarketDataLean = FlattenMaps<ICityMarketData> & { _id: string };

/**
 * A city as the API returns it: the stored row plus the *resolved* photo, whose
 * source may be another collection entirely (`city-gallery`,
 * `villa-destination`) and so cannot reuse the document's narrower field.
 */
export type CityMarketDataResponse = Omit<CityMarketDataLean, 'imageSource'> & {
  imageSource?: CityPhotoSource;
  imageCredit?: string;
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '');

interface CityDataFromGemini {
  city: string;
  country: string;
  countryCode: string;
  avgPricePerSqm: number;
  medianPrice: number;
  priceGrowthYoY: number;
  averageDaysOnMarket: number;
  demandScore: number;
  rentalYield: number;
  investmentScore: number;
  topNeighborhoods: string[];
  marketTrend: 'rising' | 'stable' | 'declining';
  highlights: string[];
}

/**
 * Selected cities to feature across all Balkan countries
 * Chosen based on population, economic importance, and tourism
 */
const FEATURED_CITIES = [
  // Kosovo - 7 cities
  { city: 'Prishtina', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Prizren', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Peja', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Gjakova', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Ferizaj', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Mitrovica', country: 'Kosovo', countryCode: 'XK' },
  { city: 'Gjilan', country: 'Kosovo', countryCode: 'XK' },

  // Albania - 9 cities
  { city: 'Tirana', country: 'Albania', countryCode: 'AL' },
  { city: 'Durres', country: 'Albania', countryCode: 'AL' },
  { city: 'Vlore', country: 'Albania', countryCode: 'AL' },
  { city: 'Sarande', country: 'Albania', countryCode: 'AL' },
  { city: 'Shkoder', country: 'Albania', countryCode: 'AL' },
  { city: 'Fier', country: 'Albania', countryCode: 'AL' },
  { city: 'Berat', country: 'Albania', countryCode: 'AL' },
  { city: 'Elbasan', country: 'Albania', countryCode: 'AL' },
  { city: 'Korce', country: 'Albania', countryCode: 'AL' },

  // North Macedonia - 8 cities
  { city: 'Skopje', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Ohrid', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Bitola', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Tetovo', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Kumanovo', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Veles', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Strumica', country: 'North Macedonia', countryCode: 'MK' },
  { city: 'Kavadarci', country: 'North Macedonia', countryCode: 'MK' },

  // Serbia - 10 cities
  { city: 'Belgrade', country: 'Serbia', countryCode: 'RS' },
  { city: 'Novi Sad', country: 'Serbia', countryCode: 'RS' },
  { city: 'Nis', country: 'Serbia', countryCode: 'RS' },
  { city: 'Kragujevac', country: 'Serbia', countryCode: 'RS' },
  { city: 'Subotica', country: 'Serbia', countryCode: 'RS' },
  { city: 'Zrenjanin', country: 'Serbia', countryCode: 'RS' },
  { city: 'Pancevo', country: 'Serbia', countryCode: 'RS' },
  { city: 'Cacak', country: 'Serbia', countryCode: 'RS' },
  { city: 'Valjevo', country: 'Serbia', countryCode: 'RS' },
  { city: 'Smederevo', country: 'Serbia', countryCode: 'RS' },

  // Bosnia and Herzegovina - 8 cities
  { city: 'Sarajevo', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Banja Luka', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Mostar', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Tuzla', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Zenica', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Trebinje', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Bijeljina', country: 'Bosnia and Herzegovina', countryCode: 'BA' },
  { city: 'Brcko', country: 'Bosnia and Herzegovina', countryCode: 'BA' },

  // Croatia - 10 cities
  { city: 'Zagreb', country: 'Croatia', countryCode: 'HR' },
  { city: 'Split', country: 'Croatia', countryCode: 'HR' },
  { city: 'Dubrovnik', country: 'Croatia', countryCode: 'HR' },
  { city: 'Rijeka', country: 'Croatia', countryCode: 'HR' },
  { city: 'Osijek', country: 'Croatia', countryCode: 'HR' },
  { city: 'Zadar', country: 'Croatia', countryCode: 'HR' },
  { city: 'Pula', country: 'Croatia', countryCode: 'HR' },
  { city: 'Sibenik', country: 'Croatia', countryCode: 'HR' },
  { city: 'Varazdin', country: 'Croatia', countryCode: 'HR' },
  { city: 'Slavonski Brod', country: 'Croatia', countryCode: 'HR' },

  // Montenegro - 8 cities
  { city: 'Podgorica', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Budva', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Kotor', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Niksic', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Herceg Novi', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Bar', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Ulcinj', country: 'Montenegro', countryCode: 'ME' },
  { city: 'Tivat', country: 'Montenegro', countryCode: 'ME' },

  // Greece - 10 cities
  { city: 'Athens', country: 'Greece', countryCode: 'GR' },
  { city: 'Thessaloniki', country: 'Greece', countryCode: 'GR' },
  { city: 'Patras', country: 'Greece', countryCode: 'GR' },
  { city: 'Heraklion', country: 'Greece', countryCode: 'GR' },
  { city: 'Volos', country: 'Greece', countryCode: 'GR' },
  { city: 'Larissa', country: 'Greece', countryCode: 'GR' },
  { city: 'Ioannina', country: 'Greece', countryCode: 'GR' },
  { city: 'Kavala', country: 'Greece', countryCode: 'GR' },
  { city: 'Chania', country: 'Greece', countryCode: 'GR' },
  { city: 'Rhodes', country: 'Greece', countryCode: 'GR' },

  // Bulgaria - 9 cities
  { city: 'Sofia', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Plovdiv', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Varna', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Burgas', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Stara Zagora', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Pleven', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Ruse', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Sliven', country: 'Bulgaria', countryCode: 'BG' },
  { city: 'Dobrich', country: 'Bulgaria', countryCode: 'BG' },

  // Romania - 10 cities
  { city: 'Bucharest', country: 'Romania', countryCode: 'RO' },
  { city: 'Cluj-Napoca', country: 'Romania', countryCode: 'RO' },
  { city: 'Timisoara', country: 'Romania', countryCode: 'RO' },
  { city: 'Brasov', country: 'Romania', countryCode: 'RO' },
  { city: 'Iasi', country: 'Romania', countryCode: 'RO' },
  { city: 'Constanta', country: 'Romania', countryCode: 'RO' },
  { city: 'Galati', country: 'Romania', countryCode: 'RO' },
  { city: 'Craiova', country: 'Romania', countryCode: 'RO' },
  { city: 'Ploiesti', country: 'Romania', countryCode: 'RO' },
  { city: 'Oradea', country: 'Romania', countryCode: 'RO' },
];

/**
 * City metadata for realistic fallback data generation
 */
const CITY_METADATA: Record<string, {
  type: 'capital' | 'coastal' | 'tourist' | 'industrial' | 'regional';
  tier: 1 | 2 | 3; // 1 = major, 2 = medium, 3 = smaller
  neighborhoods: string[];
}> = {
  // Kosovo
  'Prishtina': { type: 'capital', tier: 2, neighborhoods: ['Sunny Hill', 'Dragodan', 'Arberia'] },
  'Prizren': { type: 'tourist', tier: 3, neighborhoods: ['Old Town', 'Marash', 'Tusus'] },
  'Peja': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Vitomirica', 'Karagaq'] },
  'Gjakova': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Çarshia e Madhe', 'Hadum'] },
  'Ferizaj': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Municipalities', 'Kaçanik Road'] },
  'Mitrovica': { type: 'regional', tier: 3, neighborhoods: ['North Mitrovica', 'South Mitrovica', 'Bosniak Quarter'] },
  'Gjilan': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Gjilani i Ri', 'Shurdhan'] },

  // Albania
  'Tirana': { type: 'capital', tier: 1, neighborhoods: ['Blloku', 'Lake Park', 'New Bazaar'] },
  'Durres': { type: 'coastal', tier: 2, neighborhoods: ['Plazh', 'Currila', 'Port Area'] },
  'Vlore': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Radhima', 'Lungomare'] },
  'Sarande': { type: 'tourist', tier: 3, neighborhoods: ['Ksamil', 'Center', 'Lukove'] },
  'Shkoder': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Rus', 'Bahçallek'] },
  'Fier': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Apollonia', 'Seman'] },
  'Berat': { type: 'tourist', tier: 3, neighborhoods: ['Mangalem', 'Gorica', 'Kala'] },
  'Elbasan': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Qyteti Studenti', 'Labinot'] },
  'Korce': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Varoshi', 'Drililas'] },

  // North Macedonia
  'Skopje': { type: 'capital', tier: 1, neighborhoods: ['Centar', 'Aerodrom', 'Karpos'] },
  'Ohrid': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Lagadin', 'Sveti Stefan'] },
  'Bitola': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Magnolia', 'Bukovo'] },
  'Tetovo': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Kamenjane', 'Zelino'] },
  'Kumanovo': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Prolece', 'Stari Grad'] },
  'Veles': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Isar', 'Malo Konjari'] },
  'Strumica': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Banica', 'Kuklis'] },
  'Kavadarci': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Kavadarci North', 'Vatasha'] },

  // Serbia
  'Belgrade': { type: 'capital', tier: 1, neighborhoods: ['Savski Venac', 'Vracar', 'Novi Beograd'] },
  'Novi Sad': { type: 'regional', tier: 2, neighborhoods: ['Centar', 'Liman', 'Petrovaradin'] },
  'Nis': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Medijana', 'Palilula'] },
  'Kragujevac': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Aerodrom', 'Stanovo'] },
  'Subotica': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Palic', 'Aleksandrovo'] },
  'Zrenjanin': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Bagljas', 'Mikicevic'] },
  'Pancevo': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Vojlovica', 'Omoljica'] },
  'Cacak': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Ljubic', 'Konjevici'] },
  'Valjevo': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Petnica', 'Beloševac'] },
  'Smederevo': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Radinac', 'Kolari'] },

  // Bosnia and Herzegovina
  'Sarajevo': { type: 'capital', tier: 1, neighborhoods: ['Bascarsija', 'Marijin Dvor', 'Grbavica'] },
  'Banja Luka': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Borik', 'Mejdan'] },
  'Mostar': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Spanish Square', 'Rondo'] },
  'Tuzla': { type: 'industrial', tier: 2, neighborhoods: ['Center', 'Stupine', 'Lamela'] },
  'Zenica': { type: 'industrial', tier: 2, neighborhoods: ['Center', 'Radakovo', 'Crkvice'] },
  'Trebinje': { type: 'tourist', tier: 3, neighborhoods: ['Center', 'Luka', 'Zasad'] },
  'Bijeljina': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Amajlije', 'Patkovaca'] },
  'Brcko': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Brcko District', 'Arizona'] },

  // Croatia
  'Zagreb': { type: 'capital', tier: 1, neighborhoods: ['Centar', 'Novi Zagreb', 'Dubrava'] },
  'Split': { type: 'coastal', tier: 1, neighborhoods: ['Diocletian Palace', 'Bacvice', 'Meje'] },
  'Dubrovnik': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Lapad', 'Pile'] },
  'Rijeka': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Trsat', 'Pehlin'] },
  'Osijek': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Gornji Grad', 'Retfala'] },
  'Zadar': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Borik', 'Bili Brig'] },
  'Pula': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Veruda', 'Vidikovac'] },
  'Sibenik': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Crnica', 'Vidici'] },
  'Varazdin': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Biškupec', 'Jalkovec'] },
  'Slavonski Brod': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Brodsko Brdo', 'Korija'] },

  // Montenegro
  'Podgorica': { type: 'capital', tier: 2, neighborhoods: ['Center', 'Nova Varos', 'Stara Varos'] },
  'Budva': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Becici', 'Sveti Stefan'] },
  'Kotor': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Dobrota', 'Prcanj'] },
  'Niksic': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Gornja Varos', 'Mioce'] },
  'Herceg Novi': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Igalo', 'Njivice'] },
  'Bar': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Port Area', 'Sutomore'] },
  'Ulcinj': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Velika Plaza', 'Ada'] },
  'Tivat': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Porto Montenegro', 'Donja Lastva'] },

  // Greece
  'Athens': { type: 'capital', tier: 1, neighborhoods: ['Plaka', 'Kolonaki', 'Glyfada'] },
  'Thessaloniki': { type: 'regional', tier: 1, neighborhoods: ['Center', 'Kalamaria', 'Nea Krini'] },
  'Patras': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Rio', 'Psila Alonia'] },
  'Heraklion': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Nea Alikarnassos', 'Agia Marina'] },
  'Volos': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Nea Ionia', 'Agria'] },
  'Larissa': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Mezourlo', 'Nea Smyrni'] },
  'Ioannina': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Perama', 'Anatoli'] },
  'Kavala': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Kalamitsa', 'Tosca'] },
  'Chania': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Halepa', 'Nea Hora'] },
  'Rhodes': { type: 'tourist', tier: 2, neighborhoods: ['Old Town', 'Ixia', 'Ialyssos'] },

  // Bulgaria
  'Sofia': { type: 'capital', tier: 1, neighborhoods: ['Center', 'Lozenets', 'Studentski Grad'] },
  'Plovdiv': { type: 'regional', tier: 2, neighborhoods: ['Old Town', 'Kapana', 'Trakia'] },
  'Varna': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Sea Garden', 'Asparuhovo'] },
  'Burgas': { type: 'coastal', tier: 2, neighborhoods: ['Center', 'Lazur', 'Sea Garden'] },
  'Stara Zagora': { type: 'industrial', tier: 2, neighborhoods: ['Center', 'Zheleznicharski', 'Ayazmoto'] },
  'Pleven': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Kaylaka', 'Storgozia'] },
  'Ruse': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Druzhba', 'Zdravets'] },
  'Sliven': { type: 'industrial', tier: 3, neighborhoods: ['Center', 'Industrialna', 'Kvartala'] },
  'Dobrich': { type: 'regional', tier: 3, neighborhoods: ['Center', 'Balkanski', 'Dobrotitsa'] },

  // Romania
  'Bucharest': { type: 'capital', tier: 1, neighborhoods: ['Old Town', 'Dorobanti', 'Herastrau'] },
  'Cluj-Napoca': { type: 'regional', tier: 1, neighborhoods: ['Center', 'Marasti', 'Gheorgheni'] },
  'Timisoara': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Fabric', 'Iosefin'] },
  'Brasov': { type: 'tourist', tier: 2, neighborhoods: ['Historic Center', 'Schei', 'Tractorul'] },
  'Iasi': { type: 'regional', tier: 1, neighborhoods: ['Center', 'Tatarasi', 'Pacurari'] },
  'Constanta': { type: 'coastal', tier: 2, neighborhoods: ['Old Town', 'Mamaia', 'Tomis'] },
  'Galati': { type: 'industrial', tier: 2, neighborhoods: ['Center', 'Micro 17', 'Tiglina'] },
  'Craiova': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Craiovita', 'Rovine'] },
  'Ploiesti': { type: 'industrial', tier: 2, neighborhoods: ['Center', 'Mihai Bravu', 'Nord'] },
  'Oradea': { type: 'regional', tier: 2, neighborhoods: ['Center', 'Nufarul', 'Iosia'] },
};

/**
 * Research-based city prices (EUR/m²) from BIS, national stats offices, market reports.
 * These override the tier/type calculation to ensure realistic values.
 */
/**
 * Research-based prices (EUR/m²) verified against BIS, national stats offices,
 * Global Property Guide, Investropa, Numbeo — 2025 data.
 */
const CITY_RESEARCH_PRICES: Record<string, number> = {
  Prishtina: 1600, Prizren: 850, Peja: 750, Gjakova: 700,
  Ferizaj: 660, Mitrovica: 640, Gjilan: 680,
  Tirana: 2400, Durres: 1400, Vlore: 1500, Sarande: 1700,
  Shkoder: 950, Fier: 800, Berat: 750, Elbasan: 780, Korce: 800,
  Skopje: 1700, Ohrid: 1100, Bitola: 850, Tetovo: 800,
  Kumanovo: 780, Veles: 730, Strumica: 750, Kavadarci: 720,
  Belgrade: 2500, 'Novi Sad': 1750, Nis: 1000, Kragujevac: 900,
  Subotica: 880, Zrenjanin: 820, Pancevo: 880, Cacak: 790,
  Valjevo: 770, Smederevo: 820,
  Sarajevo: 1350, 'Banja Luka': 1150, Mostar: 1100, Tuzla: 950,
  Zenica: 900, Trebinje: 980, Bijeljina: 870, Brcko: 880,
  Zagreb: 3200, Split: 5200, Dubrovnik: 4200, Rijeka: 2500,
  Osijek: 1500, Zadar: 3200, Pula: 3000, Sibenik: 2800,
  Varazdin: 1700, 'Slavonski Brod': 1200,
  Podgorica: 2150, Budva: 3500, Kotor: 3300, Niksic: 1000,
  'Herceg Novi': 2500, Bar: 2100, Ulcinj: 1900, Tivat: 3200,
  Athens: 2500, Thessaloniki: 2200, Patras: 1400, Heraklion: 2000,
  Volos: 1200, Larissa: 1100, Ioannina: 1150, Kavala: 1200,
  Chania: 2400, Rhodes: 2600,
  Sofia: 2000, Plovdiv: 1400, Varna: 1500, Burgas: 1200,
  'Stara Zagora': 850, Pleven: 800, Ruse: 900, Sliven: 750, Dobrich: 780,
  Bucharest: 2100, 'Cluj-Napoca': 3200, Timisoara: 1700, Brasov: 1800,
  Iasi: 1400, Constanta: 1300, Galati: 1000, Craiova: 1050,
  Ploiesti: 1100, Oradea: 1250,
};

const COUNTRY_FALLBACK_RESEARCH: Record<string, number> = {
  Kosovo: 750, Albania: 1100, 'North Macedonia': 950, Serbia: 1100,
  'Bosnia and Herzegovina': 1000, Croatia: 2400, Montenegro: 1800,
  Greece: 1700, Bulgaria: 1100, Romania: 1300,
};

/**
 * Authoritative city average price: BIS live (3s timeout) → static research → country fallback.
 * This is the single source of truth for avgPricePerSqm across all city market data.
 */
async function getAuthoritativePrice(city: string, country: string): Promise<{
  avgPricePerSqm: number;
  officialSourceName: string;
  officialSourceUrl: string;
}> {
  const staticPrice = CITY_RESEARCH_PRICES[city] ?? COUNTRY_FALLBACK_RESEARCH[country] ?? 900;
  const sourceInfo = getOfficialSourceInfo(country);

  try {
    const live = await fetchLiveCityPrice(city, country);
    if (live && live.pricePerSqm > 0) {
      return {
        avgPricePerSqm: live.pricePerSqm,
        officialSourceName: live.sourceName,
        officialSourceUrl: live.sourceUrl,
      };
    }
  } catch {
    // fall through
  }

  return {
    avgPricePerSqm: staticPrice,
    officialSourceName: sourceInfo.name,
    officialSourceUrl: sourceInfo.bisSeriesId
      ? `https://fred.stlouisfed.org/series/${sourceInfo.bisSeriesId}`
      : sourceInfo.url,
  };
}

/**
 * Generate realistic fallback data when Gemini API is unavailable
 */
function generateFallbackCityData(cityInfo: { city: string; country: string; countryCode: string }): CityDataFromGemini {
  const metadata = CITY_METADATA[cityInfo.city] || { type: 'regional', tier: 3, neighborhoods: ['Center', 'Downtown', 'Suburb'] };

  // Use research-based price as the primary source
  const basePrice = CITY_RESEARCH_PRICES[cityInfo.city]
    ?? COUNTRY_FALLBACK_RESEARCH[cityInfo.country]
    ?? 900;

  const avgPricePerSqm = basePrice;
  const medianPrice = avgPricePerSqm * 70; // 70sqm apartment

  // Growth rates based on type
  let growth = 6; // Default stable
  if (metadata.type === 'coastal' || metadata.type === 'tourist') growth = 10;
  else if (metadata.type === 'capital' && metadata.tier === 1) growth = 12;
  else if (metadata.type === 'industrial') growth = 3;
  const priceGrowthYoY = growth + Math.round((Math.random() - 0.5) * 4);

  // Days on market (lower for better markets)
  const averageDaysOnMarket = metadata.tier === 1 ? 35 : metadata.tier === 2 ? 45 : 55;

  // Demand score
  const demandScore = Math.min(100, Math.max(60,
    (metadata.tier === 1 ? 85 : metadata.tier === 2 ? 75 : 65) + Math.round((Math.random() - 0.5) * 10)
  ));

  // Rental yield (higher for tourist/coastal)
  let rentalYield = 5.0;
  if (metadata.type === 'coastal' || metadata.type === 'tourist') rentalYield = 6.5;
  else if (metadata.type === 'capital') rentalYield = 4.5;
  rentalYield += (Math.random() - 0.5) * 1;
  rentalYield = Math.round(rentalYield * 10) / 10;

  // Investment score
  const investmentScore = Math.min(100, Math.max(55,
    Math.round((demandScore + priceGrowthYoY * 3 + rentalYield * 8) / 2)
  ));

  // Market trend
  let marketTrend: 'rising' | 'stable' | 'declining' = 'stable';
  if (priceGrowthYoY > 8) marketTrend = 'rising';
  else if (priceGrowthYoY < 3) marketTrend = 'declining';

  // Highlights based on city characteristics
  const highlights: string[] = [];
  if (metadata.type === 'capital') {
    highlights.push('Strong economic hub with diverse job market');
    highlights.push('Consistent demand from domestic and international buyers');
    highlights.push('Well-developed infrastructure and amenities');
  } else if (metadata.type === 'coastal' || metadata.type === 'tourist') {
    highlights.push('High tourism season drives rental income');
    highlights.push('Popular with international property investors');
    highlights.push('Strong short-term rental market potential');
  } else if (metadata.type === 'industrial') {
    highlights.push('Affordable entry point for investors');
    highlights.push('Growing industrial sector supports demand');
    highlights.push('Lower cost of living attracts young families');
  } else {
    highlights.push('Balanced market with steady appreciation');
    highlights.push('Good value compared to larger cities');
    highlights.push('Local demand from regional development');
  }

  return {
    city: cityInfo.city,
    country: cityInfo.country,
    countryCode: cityInfo.countryCode,
    avgPricePerSqm,
    medianPrice,
    priceGrowthYoY,
    averageDaysOnMarket,
    demandScore,
    rentalYield,
    investmentScore,
    topNeighborhoods: metadata.neighborhoods,
    marketTrend,
    highlights,
  };
}

/**
 * Fetch market data from Gemini for a batch of cities
 * Uses a single API call to process multiple cities efficiently
 * @param officialData - Optional map of "city,country" to official price data for use as anchors
 */
async function fetchCityDataFromGemini(
  cities: Array<{ city: string; country: string; countryCode: string }>,
  officialData?: Record<string, { avgPricePerSqm: number; source: string }>,
): Promise<CityDataFromGemini[]> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    apiLogger.warn('⚠️ Gemini API key not configured. Using fallback data generation.');
    return cities.map(generateFallbackCityData);
  }

  const citiesList = cities.map(c => `${c.city}, ${c.country}`).join('; ');

  // Build official data anchoring note if available
  const officialAnchors = officialData
    ? Object.entries(officialData)
        .map(([key, d]) => {
          const [city] = key.split(',');
          return `Official cadastre data shows avg price of €${d.avgPricePerSqm}/m² for ${city.trim()} (source: ${d.source}).`;
        })
        .join(' ')
    : '';

  const prompt = `You are a real estate market analyst. Provide current 2025 real estate SALE market data for these Balkan cities: ${citiesList}
${officialAnchors ? `\nIMPORTANT OFFICIAL DATA ANCHORS — use these as your primary price references:\n${officialAnchors}\n` : ''}
For each city, provide realistic market data based on general economic trends, tourism, and typical Balkan real estate patterns. Return ONLY valid JSON array format with this structure:

[
  {
    "city": "City Name",
    "country": "Country Name",
    "countryCode": "XX",
    "avgPricePerSqm": <number in EUR, for-sale properties only — NOT rental prices>,
    "medianPrice": <number in EUR for 70sqm apartment, for sale>,
    "priceGrowthYoY": <percentage, can be negative>,
    "averageDaysOnMarket": <number of days>,
    "demandScore": <0-100, higher = more demand>,
    "rentalYield": <percentage 3-8%>,
    "investmentScore": <0-100, investment potential>,
    "topNeighborhoods": ["Neighborhood1", "Neighborhood2", "Neighborhood3"],
    "marketTrend": "rising|stable|declining",
    "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"]
  }
]

Guidelines for avgPricePerSqm (for-sale prices only, NOT rental) — verified 2025 data:
- Albania: Tirana €2,200-2,600/sqm; Sarande €1,600-1,800/sqm; Vlore €1,400-1,600/sqm; Durres €1,300-1,500/sqm; smaller cities €700-1,000/sqm
- Serbia: Belgrade €2,300-2,700/sqm; Novi Sad €1,600-1,900/sqm; Nis €900-1,100/sqm; smaller cities €700-950/sqm
- Montenegro: Budva/Tivat/Kotor €3,000-3,800/sqm; Podgorica €2,000-2,300/sqm; Bar/Herceg Novi €2,000-2,600/sqm
- Croatia: Split €4,800-5,500/sqm; Dubrovnik €3,900-4,500/sqm; Zagreb/Zadar €3,000-3,400/sqm; Rijeka €2,300-2,700/sqm; smaller cities €1,100-1,800/sqm
- Bosnia: Sarajevo €1,250-1,450/sqm; Banja Luka €1,050-1,250/sqm; Mostar €1,000-1,200/sqm; smaller cities €800-1,000/sqm
- North Macedonia: Skopje €1,600-1,800/sqm; Ohrid €1,000-1,200/sqm; Bitola €800-900/sqm; smaller cities €700-800/sqm
- Bulgaria: Sofia €1,800-2,200/sqm; Varna €1,400-1,600/sqm; Plovdiv €1,300-1,500/sqm; coastal €1,100-1,300/sqm
- Romania: Cluj-Napoca €3,000-3,400/sqm; Bucharest €1,900-2,300/sqm; Brasov €1,700-1,900/sqm; smaller cities €1,000-1,500/sqm
- Kosovo: Prishtina €1,500-1,700/sqm; Prizren €800-900/sqm; smaller cities €600-750/sqm
- Greece: Athens €2,300-2,700/sqm; Rhodes/Chania €2,400-2,800/sqm; Thessaloniki €2,000-2,400/sqm; mainland cities €1,000-1,400/sqm
- Rising markets have 8-15% YoY growth
- Stable markets have 2-7% YoY growth
- Declining markets have -3% to 2% growth
- Return realistic neighborhood names for each city
- Highlights should mention key factors (tourism, economy, infrastructure, etc.)

Return only the JSON array, no other text.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Extract JSON from response (remove markdown code blocks if present)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Gemini response');
    }

    const data: CityDataFromGemini[] = JSON.parse(jsonMatch[0]);
    apiLogger.info(`✅ Fetched market data for ${data.length} cities from Gemini`);

    return data;
  } catch (error) {
    apiLogger.error('❌ Error fetching city data from Gemini:', error);
    apiLogger.warn('⚠️ Falling back to generated placeholder data for these cities');
    return cities.map(generateFallbackCityData);
  }
}

/**
 * Calculate market data from actual properties in the database
 * Used as fallback or supplement to Gemini data
 */
async function calculateMarketDataFromProperties(city: string, country: string): Promise<Partial<ICityMarketData> | null> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeProperties = await Property.find({
      city,
      country,
      status: 'active',
      listingType: 'sale',
    });

    const soldProperties = await Property.find({
      city,
      country,
      status: 'sold',
      updatedAt: { $gte: thirtyDaysAgo },
    });

    const listingsCount = activeProperties.length;
    const soldLastMonth = soldProperties.length;

    // Price per m² is based only on active (for-sale) listings.
    // sqft field stores m² (despite the name). Filter unrealistic values (below €300 or above €7,500/m²).
    const MIN_PRICE_PER_SQM = 300;
    const MAX_PRICE_PER_SQM = 7500;
    const validPricesPerSqm = activeProperties
      .map(p => p.price / (p.sqft || 80))
      .filter(v => v >= MIN_PRICE_PER_SQM && v <= MAX_PRICE_PER_SQM);

    const avgPricePerSqm = validPricesPerSqm.length >= 3
      ? validPricesPerSqm.reduce((a, b) => a + b, 0) / validPricesPerSqm.length
      : null;

    const activeDays = activeProperties
      .filter(p => p.createdAt)
      .map(p => Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    const averageDaysOnMarket = activeDays.length > 0
      ? activeDays.reduce((a, b) => a + b, 0) / activeDays.length
      : 45;

    return {
      ...(avgPricePerSqm !== null ? { listingAvgPricePerSqm: Math.round(avgPricePerSqm) } : {}),
      listingsCount,
      averageDaysOnMarket: Math.round(averageDaysOnMarket),
      soldLastMonth,
      dataSource: 'calculated',
    };
  } catch (error) {
    apiLogger.error(`Error calculating market data for ${city}:`, error);
    return null;
  }
}

/**
 * Get live city stats from the Property collection for a city.
 * Always current — does not depend on scheduled updates.
 * Returns listing counts AND the avg price per m² from active for-sale listings.
 */
async function getLiveCityStats(city: string, country: string): Promise<{
  listingsCount: number;
  soldLastMonth: number;
  listingAvgPricePerSqm?: number;
}> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cityRegex = { $regex: new RegExp(`^${escapeRegex(city)}$`, 'i') };
    const countryRegex = { $regex: new RegExp(`^${escapeRegex(country)}$`, 'i') };

    const [activeProperties, soldLastMonth] = await Promise.all([
      Property.find({ city: cityRegex, country: countryRegex, status: 'active', listingType: 'sale' }, { price: 1, sqft: 1 }).lean(),
      Property.countDocuments({ city: cityRegex, country: countryRegex, status: 'sold', updatedAt: { $gte: thirtyDaysAgo } }),
    ]);

    const listingsCount = activeProperties.length;

    const MIN_PRICE_PER_SQM = 300;
    const MAX_PRICE_PER_SQM = 7500;
    // sqft field stores m² (despite the name — frontend always displays it as m²)
    const validPrices = activeProperties
      .map((p: { price: number; sqft?: number }) => p.price / (p.sqft || 80))
      .filter((v: number) => v >= MIN_PRICE_PER_SQM && v <= MAX_PRICE_PER_SQM);

    const listingAvgPricePerSqm = validPrices.length >= 3
      ? Math.round(validPrices.reduce((a: number, b: number) => a + b, 0) / validPrices.length)
      : undefined;

    return { listingsCount, soldLastMonth, listingAvgPricePerSqm };
  } catch (error) {
    apiLogger.error(`Error getting live city stats for ${city}:`, error);
    return { listingsCount: 0, soldLastMonth: 0 };
  }
}


/**
 * Attach each city's resolved photo (admin override → City Gallery → Villa
 * Destination → auto-seeded) to rows on their way out of the API.
 *
 * Batched: one resolution pass for the whole list, not one per city.
 */
async function withResolvedPhotos(cities: CityMarketDataLean[]): Promise<CityMarketDataResponse[]> {
  if (cities.length === 0) return cities;

  let photos: Map<string, ResolvedCityPhoto>;
  try {
    photos = await resolveCityPhotos(cities.map(c => ({ city: c.city, country: c.country })));
  } catch (error) {
    // A photo is decoration; market data is the point. Serve the rows as-is
    // and let the frontend fall back to its own image chain.
    apiLogger.error('Failed to resolve city photos:', error);
    return cities;
  }

  return cities.map(city => {
    const photo = photos.get(placeKey(city.city, city.country));
    if (!photo) return city;
    return {
      ...city,
      imageUrl: photo.imageUrl,
      imageSource: photo.source,
      ...(photo.credit ? { imageCredit: photo.credit } : {}),
    };
  });
}

/**
 * Update market data for all featured cities
 * This should be called twice per month (biweekly)
 */
export async function updateAllCityMarketData(): Promise<void> {
  apiLogger.info('🔄 Starting biweekly market data update for all featured cities...');

  // Process cities in batches of 10 to avoid token limits
  const BATCH_SIZE = 10;
  let updatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < FEATURED_CITIES.length; i += BATCH_SIZE) {
    const batch = FEATURED_CITIES.slice(i, i + BATCH_SIZE);

    apiLogger.info(`📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(FEATURED_CITIES.length / BATCH_SIZE)}...`);

    try {
      const geminiData = await fetchCityDataFromGemini(batch);

      for (let j = 0; j < batch.length; j++) {
        const cityInfo = batch[j];
        const cityIndex = i + j; // Actual index in FEATURED_CITIES array

        try {
          const geminiCityData = geminiData.find(
            d => d.city === cityInfo.city && d.country === cityInfo.country
          );

          // Calculate actual market data from properties
          const calculatedData = await calculateMarketDataFromProperties(cityInfo.city, cityInfo.country);

          if (!geminiCityData && !calculatedData) {
            apiLogger.warn(`⚠️ No data available for ${cityInfo.city}, ${cityInfo.country}`);
            failedCount++;
            continue;
          }

          // Always override avgPricePerSqm with authoritative research/BIS data — never trust Gemini for prices
          const { avgPricePerSqm, officialSourceName, officialSourceUrl } =
            await getAuthoritativePrice(cityInfo.city, cityInfo.country);

          // Merge: Gemini provides market-wide metrics; calculated provides live listing stats.
          // avgPricePerSqm is always overridden by official/research price.
          // listingAvgPricePerSqm comes from active platform listings (when enough exist).
          const marketData: Partial<ICityMarketData> = {
            city: cityInfo.city,
            country: cityInfo.country,
            countryCode: cityInfo.countryCode,
            ...(geminiCityData || {}),
            avgPricePerSqm,
            officialSourceName,
            officialSourceUrl,
            ...(calculatedData ? {
              listingsCount: calculatedData.listingsCount,
              soldLastMonth: calculatedData.soldLastMonth,
              averageDaysOnMarket: calculatedData.averageDaysOnMarket,
              ...(calculatedData.listingAvgPricePerSqm
                ? { listingAvgPricePerSqm: calculatedData.listingAvgPricePerSqm }
                : {}),
            } : {}),
            lastUpdated: new Date(),
            featured: true,
            displayOrder: cityIndex,
            dataSource: geminiCityData ? 'gemini' : 'calculated',
          };

          await CityMarketData.findOneAndUpdate(
            { city: cityInfo.city, country: cityInfo.country },
            marketData,
            { upsert: true, new: true }
          );

          updatedCount++;
          apiLogger.info(`✅ Updated market data for ${cityInfo.city}, ${cityInfo.country}`);
        } catch (error) {
          apiLogger.error(`❌ Failed to update ${cityInfo.city}:`, error);
          failedCount++;
        }
      }

      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < FEATURED_CITIES.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    } catch (error) {
      apiLogger.error(`❌ Batch processing failed:`, error);
      failedCount += batch.length;
    }
  }

  apiLogger.info(`✅ Market data update complete: ${updatedCount} updated, ${failedCount} failed`);

  // Ensure all featured cities exist (fill gaps with fallback data)
  await ensureAllFeaturedCitiesExist();
}

/**
 * Ensure every city in FEATURED_CITIES exists in the DB.
 * Missing ones are seeded with fallback data so the landing page
 * always shows a diverse mix of countries.
 */
export async function ensureAllFeaturedCitiesExist(): Promise<void> {
  let seeded = 0;
  for (let i = 0; i < FEATURED_CITIES.length; i++) {
    const cityInfo = FEATURED_CITIES[i];
    const exists = await CityMarketData.findOne({ city: cityInfo.city, country: cityInfo.country });
    if (exists) continue;

    const fallback = generateFallbackCityData(cityInfo);
    const { avgPricePerSqm, officialSourceName, officialSourceUrl } =
      await getAuthoritativePrice(cityInfo.city, cityInfo.country);
    await CityMarketData.create({
      ...fallback,
      avgPricePerSqm,
      officialSourceName,
      officialSourceUrl,
      listingsCount: 0,
      soldLastMonth: 0,
      priceGrowthMoM: +(fallback.priceGrowthYoY / 12).toFixed(1),
      lastUpdated: new Date(),
      dataSource: 'manual',
      featured: true,
      displayOrder: i,
    });
    seeded++;
  }
  if (seeded > 0) {
    apiLogger.info(`🌱 Seeded ${seeded} missing featured cities with fallback data`);
  }
}

/**
 * Get featured city recommendations with live listing counts
 */
export async function getFeaturedCities(limit: number = 12): Promise<CityMarketDataResponse[]> {
  try {
    const cities = await CityMarketData.find({ featured: true })
      .sort({ displayOrder: 1 })
      .limit(limit)
      .lean<CityMarketDataLean[]>();

    // If the DB has fewer cities than the canonical list, seed missing ones in the
    // background so the next request gets the full set (self-healing, fire-and-forget).
    if (cities.length < FEATURED_CITIES.length) {
      ensureAllFeaturedCitiesExist().catch(err =>
        apiLogger.error('Background city seed failed:', err)
      );
    }

    // Enrich each city with live stats and override avgPricePerSqm with authoritative data
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        const [liveStats, priceData] = await Promise.all([
          getLiveCityStats(city.city, city.country),
          getAuthoritativePrice(city.city, city.country),
        ]);
        return {
          ...city,
          avgPricePerSqm: priceData.avgPricePerSqm,
          officialSourceName: priceData.officialSourceName,
          officialSourceUrl: priceData.officialSourceUrl,
          listingsCount: liveStats.listingsCount,
          soldLastMonth: liveStats.soldLastMonth,
          ...(liveStats.listingAvgPricePerSqm !== undefined
            ? { listingAvgPricePerSqm: liveStats.listingAvgPricePerSqm }
            : {}),
        };
      })
    );

    return await withResolvedPhotos(enrichedCities);
  } catch (error) {
    apiLogger.error('Error fetching featured cities:', error);
    return [];
  }
}

/**
 * Get city recommendations by country with live listing counts
 */
export async function getCitiesByCountry(country: string): Promise<CityMarketDataResponse[]> {
  try {
    const cities = await CityMarketData.find({ country })
      .sort({ demandScore: -1, avgPricePerSqm: 1 })
      .lean<CityMarketDataLean[]>();

    // Enrich each city with live stats and override avgPricePerSqm with authoritative data
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        const [liveStats, priceData] = await Promise.all([
          getLiveCityStats(city.city, city.country),
          getAuthoritativePrice(city.city, city.country),
        ]);
        return {
          ...city,
          avgPricePerSqm: priceData.avgPricePerSqm,
          officialSourceName: priceData.officialSourceName,
          officialSourceUrl: priceData.officialSourceUrl,
          listingsCount: liveStats.listingsCount,
          soldLastMonth: liveStats.soldLastMonth,
          ...(liveStats.listingAvgPricePerSqm !== undefined
            ? { listingAvgPricePerSqm: liveStats.listingAvgPricePerSqm }
            : {}),
        };
      })
    );

    return await withResolvedPhotos(enrichedCities);
  } catch (error) {
    apiLogger.error(`Error fetching cities for ${country}:`, error);
    return [];
  }
}

/**
 * Get market data for a specific city with live listing counts
 */
export async function getCityMarketData(city: string, country: string): Promise<CityMarketDataResponse | null> {
  try {
    const data = await CityMarketData.findOne({ city, country }).lean<CityMarketDataLean>();

    if (!data) {
      return null;
    }

    // Enrich with live stats and override avgPricePerSqm with authoritative data
    const [liveStats, priceData] = await Promise.all([
      getLiveCityStats(city, country),
      getAuthoritativePrice(city, country),
    ]);
    const enriched = {
      ...data,
      avgPricePerSqm: priceData.avgPricePerSqm,
      officialSourceName: priceData.officialSourceName,
      officialSourceUrl: priceData.officialSourceUrl,
      listingsCount: liveStats.listingsCount,
      soldLastMonth: liveStats.soldLastMonth,
      ...(liveStats.listingAvgPricePerSqm !== undefined
        ? { listingAvgPricePerSqm: liveStats.listingAvgPricePerSqm }
        : {}),
    };

    const [withPhoto] = await withResolvedPhotos([enriched]);
    return withPhoto;
  } catch (error) {
    apiLogger.error(`Error fetching market data for ${city}:`, error);
    return null;
  }
}
