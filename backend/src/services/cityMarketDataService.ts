import { GoogleGenerativeAI } from '@google/generative-ai';
import { escapeRegex } from '../utils/escapeRegex';
import CityMarketData, { ICityMarketData } from '../models/CityMarketData';
import Property from '../models/Property';
import { FlattenMaps } from 'mongoose';
import { apiLogger } from '../utils/logger';

// Type for lean documents (plain objects without Mongoose methods)
export type CityMarketDataLean = FlattenMaps<ICityMarketData> & { _id: string };

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
const CITY_RESEARCH_PRICES: Record<string, number> = {
  Prishtina: 980, Prizren: 670, Peja: 610, Gjakova: 580,
  Ferizaj: 555, Mitrovica: 540, Gjilan: 560,
  Tirana: 1200, Durres: 950, Vlore: 980, Sarande: 1100,
  Shkoder: 700, Fier: 670, Berat: 640, Elbasan: 645, Korce: 660,
  Skopje: 1100, Ohrid: 900, Bitola: 700, Tetovo: 680,
  Kumanovo: 670, Veles: 620, Strumica: 635, Kavadarci: 605,
  Belgrade: 2200, 'Novi Sad': 1650, Nis: 850, Kragujevac: 780,
  Subotica: 750, Zrenjanin: 700, Pancevo: 750, Cacak: 680,
  Valjevo: 660, Smederevo: 700,
  Sarajevo: 1700, 'Banja Luka': 1100, Mostar: 1000, Tuzla: 850,
  Zenica: 800, Trebinje: 850, Bijeljina: 750, Brcko: 760,
  Zagreb: 2900, Split: 3800, Dubrovnik: 5500, Rijeka: 2100,
  Osijek: 1300, Zadar: 2800, Pula: 2600, Sibenik: 2400,
  Varazdin: 1500, 'Slavonski Brod': 1100,
  Podgorica: 1450, Budva: 3200, Kotor: 3000, Niksic: 850,
  'Herceg Novi': 2200, Bar: 1800, Ulcinj: 1600, Tivat: 2800,
  Athens: 2400, Thessaloniki: 1600, Patras: 1100, Heraklion: 1700,
  Volos: 1000, Larissa: 900, Ioannina: 950, Kavala: 1000,
  Chania: 2000, Rhodes: 2200,
  Sofia: 1700, Plovdiv: 1100, Varna: 1200, Burgas: 1000,
  'Stara Zagora': 750, Pleven: 700, Ruse: 750, Sliven: 645, Dobrich: 675,
  Bucharest: 1900, 'Cluj-Napoca': 2200, Timisoara: 1400, Brasov: 1500,
  Iasi: 1100, Constanta: 1100, Galati: 850, Craiova: 900,
  Ploiesti: 950, Oradea: 1050,
};

const COUNTRY_FALLBACK_RESEARCH: Record<string, number> = {
  Kosovo: 650, Albania: 850, 'North Macedonia': 750, Serbia: 900,
  'Bosnia and Herzegovina': 850, Croatia: 2000, Montenegro: 1400,
  Greece: 1400, Bulgaria: 900, Romania: 1100,
};

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

Guidelines for avgPricePerSqm (for-sale prices only, NOT rental):
- Albania (Tirana): €800-1,400/sqm; coastal (Sarande, Vlore): €700-1,200/sqm
- Serbia (Belgrade): €1,500-2,500/sqm; smaller Serbian cities: €600-1,200/sqm
- Montenegro coastal (Budva, Kotor): €2,000-4,000/sqm; Podgorica: €1,000-1,800/sqm
- Croatia coastal (Split, Dubrovnik area): €3,000-5,000/sqm; Zagreb: €2,000-3,500/sqm
- Bosnia (Sarajevo): €1,200-2,000/sqm; smaller cities: €600-1,200/sqm
- North Macedonia (Skopje): €1,000-1,800/sqm; smaller cities: €500-900/sqm
- Bulgaria (Sofia): €1,200-2,000/sqm; coastal: €800-1,500/sqm
- Romania (Bucharest): €1,500-2,500/sqm; other cities: €800-1,500/sqm
- Kosovo (Pristina): €700-1,200/sqm
- Greece: coastal/islands €2,000-5,000/sqm; mainland cities €1,000-2,000/sqm
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

          // Merge: Gemini provides market-wide metrics; calculated provides live listing stats.
          // avgPricePerSqm always comes from Gemini (market reference).
          // listingAvgPricePerSqm comes from active platform listings (when enough exist).
          const marketData: Partial<ICityMarketData> = {
            city: cityInfo.city,
            country: cityInfo.country,
            countryCode: cityInfo.countryCode,
            ...(geminiCityData || {}),
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
    await CityMarketData.create({
      ...fallback,
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
export async function getFeaturedCities(limit: number = 12): Promise<CityMarketDataLean[]> {
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

    // Enrich each city with live stats from the Property collection
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        const liveStats = await getLiveCityStats(city.city, city.country);
        return {
          ...city,
          listingsCount: liveStats.listingsCount,
          soldLastMonth: liveStats.soldLastMonth,
          ...(liveStats.listingAvgPricePerSqm !== undefined
            ? { listingAvgPricePerSqm: liveStats.listingAvgPricePerSqm }
            : {}),
        };
      })
    );

    return enrichedCities;
  } catch (error) {
    apiLogger.error('Error fetching featured cities:', error);
    return [];
  }
}

/**
 * Get city recommendations by country with live listing counts
 */
export async function getCitiesByCountry(country: string): Promise<CityMarketDataLean[]> {
  try {
    const cities = await CityMarketData.find({ country })
      .sort({ demandScore: -1, avgPricePerSqm: 1 })
      .lean<CityMarketDataLean[]>();

    // Enrich each city with live stats from the Property collection
    const enrichedCities = await Promise.all(
      cities.map(async (city) => {
        const liveStats = await getLiveCityStats(city.city, city.country);
        return {
          ...city,
          listingsCount: liveStats.listingsCount,
          soldLastMonth: liveStats.soldLastMonth,
          ...(liveStats.listingAvgPricePerSqm !== undefined
            ? { listingAvgPricePerSqm: liveStats.listingAvgPricePerSqm }
            : {}),
        };
      })
    );

    return enrichedCities;
  } catch (error) {
    apiLogger.error(`Error fetching cities for ${country}:`, error);
    return [];
  }
}

/**
 * Get market data for a specific city with live listing counts
 */
export async function getCityMarketData(city: string, country: string): Promise<CityMarketDataLean | null> {
  try {
    const data = await CityMarketData.findOne({ city, country }).lean<CityMarketDataLean>();

    if (!data) {
      return null;
    }

    // Enrich with live stats
    const liveStats = await getLiveCityStats(city, country);
    return {
      ...data,
      listingsCount: liveStats.listingsCount,
      soldLastMonth: liveStats.soldLastMonth,
      ...(liveStats.listingAvgPricePerSqm !== undefined
        ? { listingAvgPricePerSqm: liveStats.listingAvgPricePerSqm }
        : {}),
    };
  } catch (error) {
    apiLogger.error(`Error fetching market data for ${city}:`, error);
    return null;
  }
}
