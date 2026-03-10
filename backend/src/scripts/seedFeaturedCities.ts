import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import CityMarketData from '../models/CityMarketData';

const FEATURED_CITIES = [
  // Kosovo
  { city: 'Prishtina', country: 'Kosovo', countryCode: 'XK', neighborhoods: ['Sunny Hill', 'Dragodan', 'Arberia'] },
  { city: 'Prizren', country: 'Kosovo', countryCode: 'XK', neighborhoods: ['Old Town', 'Marash', 'Tusuz'] },
  { city: 'Peja', country: 'Kosovo', countryCode: 'XK', neighborhoods: ['Center', 'Kapeshnica', 'Dardania'] },

  // Albania
  { city: 'Tirana', country: 'Albania', countryCode: 'AL', neighborhoods: ['Blloku', 'Lake Park', 'New Bazaar'] },
  { city: 'Durres', country: 'Albania', countryCode: 'AL', neighborhoods: ['Beach Area', 'City Center', 'Plazh'] },
  { city: 'Vlore', country: 'Albania', countryCode: 'AL', neighborhoods: ['Lungomare', 'Center', 'New Vlore'] },
  { city: 'Sarande', country: 'Albania', countryCode: 'AL', neighborhoods: ['Center', 'Waterfront', 'Limion'] },

  // North Macedonia
  { city: 'Skopje', country: 'North Macedonia', countryCode: 'MK', neighborhoods: ['Centar', 'Aerodrom', 'Karpos'] },
  { city: 'Ohrid', country: 'North Macedonia', countryCode: 'MK', neighborhoods: ['Old Town', 'Lagadin', 'Center'] },
  { city: 'Bitola', country: 'North Macedonia', countryCode: 'MK', neighborhoods: ['Center', 'Stari Bezisten', 'Bair'] },

  // Serbia
  { city: 'Belgrade', country: 'Serbia', countryCode: 'RS', neighborhoods: ['Savski Venac', 'Vracar', 'Novi Beograd'] },
  { city: 'Novi Sad', country: 'Serbia', countryCode: 'RS', neighborhoods: ['Stari Grad', 'Liman', 'Petrovaradin'] },
  { city: 'Nis', country: 'Serbia', countryCode: 'RS', neighborhoods: ['Center', 'Medijana', 'Palilula'] },
  { city: 'Kragujevac', country: 'Serbia', countryCode: 'RS', neighborhoods: ['Center', 'Aerodrom', 'Erdoglija'] },

  // Bosnia and Herzegovina
  { city: 'Sarajevo', country: 'Bosnia and Herzegovina', countryCode: 'BA', neighborhoods: ['Bascarsija', 'Marijin Dvor', 'Grbavica'] },
  { city: 'Banja Luka', country: 'Bosnia and Herzegovina', countryCode: 'BA', neighborhoods: ['Center', 'Borik', 'Mejdan'] },
  { city: 'Mostar', country: 'Bosnia and Herzegovina', countryCode: 'BA', neighborhoods: ['Old Bridge', 'Center', 'Rondo'] },

  // Croatia
  { city: 'Zagreb', country: 'Croatia', countryCode: 'HR', neighborhoods: ['Centar', 'Novi Zagreb', 'Dubrava'] },
  { city: 'Split', country: 'Croatia', countryCode: 'HR', neighborhoods: ['Diocletian Palace', 'Bacvice', 'Meje'] },
  { city: 'Dubrovnik', country: 'Croatia', countryCode: 'HR', neighborhoods: ['Old Town', 'Lapad', 'Gruz'] },
  { city: 'Rijeka', country: 'Croatia', countryCode: 'HR', neighborhoods: ['Center', 'Trsat', 'Pecine'] },

  // Montenegro
  { city: 'Podgorica', country: 'Montenegro', countryCode: 'ME', neighborhoods: ['Center', 'Nova Varos', 'Stara Varos'] },
  { city: 'Budva', country: 'Montenegro', countryCode: 'ME', neighborhoods: ['Old Town', 'Becici', 'Slovenska'] },
  { city: 'Kotor', country: 'Montenegro', countryCode: 'ME', neighborhoods: ['Old Town', 'Dobrota', 'Muo'] },

  // Greece
  { city: 'Athens', country: 'Greece', countryCode: 'GR', neighborhoods: ['Plaka', 'Kolonaki', 'Glyfada'] },
  { city: 'Thessaloniki', country: 'Greece', countryCode: 'GR', neighborhoods: ['Ladadika', 'Ano Poli', 'Kalamaria'] },
  { city: 'Patras', country: 'Greece', countryCode: 'GR', neighborhoods: ['Center', 'Rio', 'Psila Alonia'] },
  { city: 'Heraklion', country: 'Greece', countryCode: 'GR', neighborhoods: ['Center', 'Ammoudara', 'Nea Alikarnassos'] },

  // Bulgaria
  { city: 'Sofia', country: 'Bulgaria', countryCode: 'BG', neighborhoods: ['Center', 'Lozenets', 'Studentski Grad'] },
  { city: 'Plovdiv', country: 'Bulgaria', countryCode: 'BG', neighborhoods: ['Old Town', 'Center', 'Trakiya'] },
  { city: 'Varna', country: 'Bulgaria', countryCode: 'BG', neighborhoods: ['Sea Garden', 'Center', 'Chaika'] },
  { city: 'Burgas', country: 'Bulgaria', countryCode: 'BG', neighborhoods: ['Center', 'Lazur', 'Slaveykov'] },

  // Romania
  { city: 'Bucharest', country: 'Romania', countryCode: 'RO', neighborhoods: ['Old Town', 'Dorobanti', 'Herastrau'] },
  { city: 'Cluj-Napoca', country: 'Romania', countryCode: 'RO', neighborhoods: ['Center', 'Marasti', 'Gheorgheni'] },
  { city: 'Timisoara', country: 'Romania', countryCode: 'RO', neighborhoods: ['Center', 'Fabric', 'Lipovei'] },
  { city: 'Brasov', country: 'Romania', countryCode: 'RO', neighborhoods: ['Old Town', 'Schei', 'Astra'] },
];

// Reasonable market data defaults per country
const COUNTRY_DEFAULTS: Record<string, { avgPrice: number; median: number; growth: number; demand: number; yield: number; invest: number; trend: 'rising' | 'stable' | 'declining' }> = {
  'Kosovo':                     { avgPrice: 1200, median: 85000,  growth: 8,   demand: 72, yield: 5.5, invest: 70, trend: 'rising' },
  'Albania':                    { avgPrice: 1100, median: 78000,  growth: 10,  demand: 75, yield: 6.0, invest: 74, trend: 'rising' },
  'North Macedonia':            { avgPrice: 1050, median: 72000,  growth: 5,   demand: 60, yield: 5.0, invest: 62, trend: 'stable' },
  'Serbia':                     { avgPrice: 1600, median: 110000, growth: 6,   demand: 68, yield: 4.5, invest: 66, trend: 'rising' },
  'Bosnia and Herzegovina':     { avgPrice: 1150, median: 80000,  growth: 4,   demand: 55, yield: 5.2, invest: 58, trend: 'stable' },
  'Croatia':                    { avgPrice: 2500, median: 180000, growth: 7,   demand: 80, yield: 4.0, invest: 72, trend: 'rising' },
  'Montenegro':                 { avgPrice: 2200, median: 160000, growth: 9,   demand: 78, yield: 5.0, invest: 75, trend: 'rising' },
  'Greece':                     { avgPrice: 2000, median: 150000, growth: 5,   demand: 70, yield: 4.2, invest: 68, trend: 'stable' },
  'Bulgaria':                   { avgPrice: 1300, median: 90000,  growth: 8,   demand: 65, yield: 5.5, invest: 70, trend: 'rising' },
  'Romania':                    { avgPrice: 1500, median: 105000, growth: 7,   demand: 70, yield: 5.0, invest: 72, trend: 'rising' },
};

async function seedFeaturedCities() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/balkan_estate';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < FEATURED_CITIES.length; i++) {
      const cityInfo = FEATURED_CITIES[i];
      const existing = await CityMarketData.findOne({ city: cityInfo.city, country: cityInfo.country });

      if (existing) {
        // Ensure it's marked as featured
        if (!existing.featured) {
          existing.featured = true;
          existing.displayOrder = i;
          await existing.save();
          console.log(`Updated ${cityInfo.city}, ${cityInfo.country} -> featured=true`);
        }
        skipped++;
        continue;
      }

      const defaults = COUNTRY_DEFAULTS[cityInfo.country] || COUNTRY_DEFAULTS['Kosovo'];

      await CityMarketData.create({
        city: cityInfo.city,
        country: cityInfo.country,
        countryCode: cityInfo.countryCode,
        avgPricePerSqm: defaults.avgPrice,
        medianPrice: defaults.median,
        priceGrowthYoY: defaults.growth,
        priceGrowthMoM: +(defaults.growth / 12).toFixed(1),
        averageDaysOnMarket: 45,
        listingsCount: 0,
        soldLastMonth: 0,
        demandScore: defaults.demand,
        rentalYield: defaults.yield,
        investmentScore: defaults.invest,
        topNeighborhoods: cityInfo.neighborhoods,
        marketTrend: defaults.trend,
        highlights: [
          `Growing real estate market in ${cityInfo.city}`,
          `Popular destination in ${cityInfo.country}`,
        ],
        lastUpdated: new Date(),
        dataSource: 'manual',
        featured: true,
        displayOrder: i,
      });

      console.log(`Created ${cityInfo.city}, ${cityInfo.country}`);
      created++;
    }

    console.log(`\nDone! Created: ${created}, Skipped (already exist): ${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedFeaturedCities();
