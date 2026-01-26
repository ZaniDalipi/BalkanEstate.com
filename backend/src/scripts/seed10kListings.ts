import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import User from '../models/User';

dotenv.config();

// All Balkan countries with major cities
const BALKAN_LOCATIONS = [
  // Albania
  { city: 'Tirana', country: 'Albania', lat: 41.3275, lng: 19.8187 },
  { city: 'Durrës', country: 'Albania', lat: 41.3246, lng: 19.4565 },
  { city: 'Vlorë', country: 'Albania', lat: 40.4667, lng: 19.4833 },
  { city: 'Shkodër', country: 'Albania', lat: 42.0693, lng: 19.5126 },
  { city: 'Sarandë', country: 'Albania', lat: 39.8661, lng: 20.0050 },

  // Bosnia & Herzegovina
  { city: 'Sarajevo', country: 'Bosnia', lat: 43.8563, lng: 18.4131 },
  { city: 'Banja Luka', country: 'Bosnia', lat: 44.7722, lng: 17.1910 },
  { city: 'Mostar', country: 'Bosnia', lat: 43.3438, lng: 17.8078 },
  { city: 'Tuzla', country: 'Bosnia', lat: 44.5384, lng: 18.6763 },

  // Bulgaria
  { city: 'Sofia', country: 'Bulgaria', lat: 42.6977, lng: 23.3219 },
  { city: 'Plovdiv', country: 'Bulgaria', lat: 42.1354, lng: 24.7453 },
  { city: 'Varna', country: 'Bulgaria', lat: 43.2141, lng: 27.9147 },
  { city: 'Burgas', country: 'Bulgaria', lat: 42.5048, lng: 27.4626 },
  { city: 'Sunny Beach', country: 'Bulgaria', lat: 42.6953, lng: 27.7105 },

  // Croatia
  { city: 'Zagreb', country: 'Croatia', lat: 45.8150, lng: 15.9819 },
  { city: 'Split', country: 'Croatia', lat: 43.5081, lng: 16.4402 },
  { city: 'Dubrovnik', country: 'Croatia', lat: 42.6507, lng: 18.0944 },
  { city: 'Rijeka', country: 'Croatia', lat: 45.3271, lng: 14.4422 },
  { city: 'Zadar', country: 'Croatia', lat: 44.1194, lng: 15.2314 },

  // Greece
  { city: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { city: 'Thessaloniki', country: 'Greece', lat: 40.6401, lng: 22.9444 },
  { city: 'Patras', country: 'Greece', lat: 38.2466, lng: 21.7346 },
  { city: 'Heraklion', country: 'Greece', lat: 35.3387, lng: 25.1442 },
  { city: 'Rhodes', country: 'Greece', lat: 36.4349, lng: 28.2176 },

  // Kosovo
  { city: 'Pristina', country: 'Kosovo', lat: 42.6629, lng: 21.1655 },
  { city: 'Prizren', country: 'Kosovo', lat: 42.2139, lng: 20.7397 },
  { city: 'Peja', country: 'Kosovo', lat: 42.6592, lng: 20.2887 },
  { city: 'Ferizaj', country: 'Kosovo', lat: 42.3702, lng: 21.1553 },

  // Montenegro
  { city: 'Podgorica', country: 'Montenegro', lat: 42.4304, lng: 19.2594 },
  { city: 'Budva', country: 'Montenegro', lat: 42.2914, lng: 18.8400 },
  { city: 'Kotor', country: 'Montenegro', lat: 42.4247, lng: 18.7712 },
  { city: 'Bar', country: 'Montenegro', lat: 42.0903, lng: 19.1000 },
  { city: 'Herceg Novi', country: 'Montenegro', lat: 42.4531, lng: 18.5375 },

  // North Macedonia
  { city: 'Skopje', country: 'North Macedonia', lat: 41.9981, lng: 21.4254 },
  { city: 'Bitola', country: 'North Macedonia', lat: 41.0297, lng: 21.3292 },
  { city: 'Ohrid', country: 'North Macedonia', lat: 41.1231, lng: 20.8016 },
  { city: 'Tetovo', country: 'North Macedonia', lat: 42.0069, lng: 20.9715 },

  // Romania
  { city: 'Bucharest', country: 'Romania', lat: 44.4268, lng: 26.1025 },
  { city: 'Cluj-Napoca', country: 'Romania', lat: 46.7712, lng: 23.6236 },
  { city: 'Timișoara', country: 'Romania', lat: 45.7489, lng: 21.2087 },
  { city: 'Constanța', country: 'Romania', lat: 44.1598, lng: 28.6348 },
  { city: 'Brașov', country: 'Romania', lat: 45.6427, lng: 25.5887 },

  // Serbia
  { city: 'Belgrade', country: 'Serbia', lat: 44.8167, lng: 20.4667 },
  { city: 'Novi Sad', country: 'Serbia', lat: 45.2671, lng: 19.8335 },
  { city: 'Niš', country: 'Serbia', lat: 43.3209, lng: 21.8954 },
  { city: 'Kragujevac', country: 'Serbia', lat: 44.0125, lng: 20.9114 },
  { city: 'Subotica', country: 'Serbia', lat: 46.1000, lng: 19.6667 },

  // Slovenia
  { city: 'Ljubljana', country: 'Slovenia', lat: 46.0569, lng: 14.5058 },
  { city: 'Maribor', country: 'Slovenia', lat: 46.5547, lng: 15.6459 },
  { city: 'Celje', country: 'Slovenia', lat: 46.2361, lng: 15.2677 },
  { city: 'Kranj', country: 'Slovenia', lat: 46.2389, lng: 14.3556 },
  { city: 'Koper', country: 'Slovenia', lat: 45.5469, lng: 13.7294 },
];

const PROPERTY_TYPES: Array<'house' | 'apartment' | 'villa' | 'land' | 'commercial'> = [
  'apartment', 'apartment', 'apartment', // More apartments
  'house', 'house',
  'villa',
  'land',
  'commercial'
];

const STREET_NAMES = [
  'Main Street', 'Park Avenue', 'Lake View Drive', 'Mountain Road', 'City Center Boulevard',
  'Riverside Walk', 'Forest Lane', 'Garden Street', 'Valley Road', 'Sunset Boulevard',
  'Ocean Drive', 'Hill Street', 'Market Square', 'Old Town Road', 'New Development',
  'Central Avenue', 'Beach Road', 'Harbor View', 'Castle Street', 'Royal Gardens'
];

const FEATURES = [
  'Hardwood floors', 'Granite countertops', 'Stainless steel appliances', 'Walk-in closet',
  'Large windows', 'Modern design', 'Energy efficient', 'Smart home ready', 'High ceilings',
  'Open floor plan', 'Natural light', 'Updated kitchen', 'Renovated bathroom', 'Fireplace',
  'Built-in wardrobes', 'Home office', 'Laundry room', 'Pantry', 'Wine cellar'
];

const MATERIALS = ['Brick', 'Concrete', 'Wood', 'Steel', 'Glass', 'Stone', 'Marble', 'Ceramic'];

const AMENITIES = [
  'Swimming pool', 'Gym', 'Parking', 'Garden', 'Balcony', 'Terrace', 'Storage',
  'Security system', 'Central heating', 'Air conditioning', 'Sauna', 'Jacuzzi',
  'Tennis court', 'Playground', '24/7 security', 'Concierge', 'EV charging'
];

// High-quality Unsplash images for properties
const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(propertyType: string, country: string): number {
  // Price ranges vary by country and property type
  const countryMultiplier: Record<string, number> = {
    'Slovenia': 2.5,
    'Croatia': 2.0,
    'Greece': 1.8,
    'Montenegro': 1.5,
    'Serbia': 1.0,
    'Bulgaria': 0.9,
    'Romania': 1.0,
    'Bosnia': 0.8,
    'Albania': 0.7,
    'Kosovo': 0.6,
    'North Macedonia': 0.7,
  };

  const typeMultiplier: Record<string, number> = {
    'villa': 2.5,
    'house': 1.5,
    'apartment': 1.0,
    'commercial': 2.0,
    'land': 0.5,
  };

  const basePrice = getRandomInt(40000, 300000);
  const multiplier = (countryMultiplier[country] || 1) * (typeMultiplier[propertyType] || 1);
  return Math.round((basePrice * multiplier) / 1000) * 1000;
}

function generateProperty(sellerId: any, index: number): any {
  const location = getRandomElement(BALKAN_LOCATIONS);
  const propertyType = getRandomElement(PROPERTY_TYPES);
  const address = `${getRandomInt(1, 999)} ${getRandomElement(STREET_NAMES)}`;

  // Add random offset to coordinates (within ~3km)
  const latOffset = (Math.random() - 0.5) * 0.06;
  const lngOffset = (Math.random() - 0.5) * 0.06;

  const beds = propertyType === 'land' || propertyType === 'commercial' ? 0 : getRandomInt(1, 6);
  const baths = propertyType === 'land' ? 0 : getRandomInt(1, 4);
  const sqft = propertyType === 'land' ? getRandomInt(500, 10000) : getRandomInt(40, 400);
  const yearBuilt = propertyType === 'land' ? null : getRandomInt(1960, 2024);

  const isSold = Math.random() < 0.15; // 15% sold
  const isPromoted = !isSold && Math.random() < 0.08; // 8% promoted

  const titles: Record<string, string[]> = {
    'apartment': ['Modern Apartment', 'Cozy Flat', 'Luxury Apartment', 'City Center Apartment', 'Penthouse Suite'],
    'house': ['Family Home', 'Spacious House', 'Detached House', 'Modern House', 'Charming Home'],
    'villa': ['Luxury Villa', 'Seaside Villa', 'Mountain Villa', 'Exclusive Villa', 'Private Estate'],
    'land': ['Building Plot', 'Development Land', 'Agricultural Land', 'Prime Location Plot'],
    'commercial': ['Office Space', 'Retail Unit', 'Commercial Property', 'Business Premises'],
  };

  const property: any = {
    sellerId,
    createdByName: 'Demo Agent',
    createdByEmail: 'demo@balkanestate.com',
    title: `${getRandomElement(titles[propertyType] || ['Property'])} in ${location.city}`,
    status: isSold ? 'sold' : 'active',
    price: getRandomPrice(propertyType, location.country),
    address,
    city: location.city,
    country: location.country,
    beds,
    baths,
    livingRooms: propertyType === 'land' || propertyType === 'commercial' ? 0 : getRandomInt(1, 3),
    sqft,
    yearBuilt,
    parking: getRandomInt(0, 3),
    description: `Beautiful ${propertyType} located in ${location.city}, ${location.country}. This property offers ${beds} bedrooms and ${baths} bathrooms with ${sqft}m² of living space. Perfect location with excellent amenities nearby.`,
    specialFeatures: getRandomElements(FEATURES, getRandomInt(2, 5)),
    materials: getRandomElements(MATERIALS, getRandomInt(1, 3)),
    amenities: getRandomElements(AMENITIES, getRandomInt(2, 6)),
    imageUrl: getRandomElement(PROPERTY_IMAGES),
    images: getRandomElements(PROPERTY_IMAGES, getRandomInt(2, 6)).map(url => ({ url, tag: 'interior' })),
    lat: location.lat + latOffset,
    lng: location.lng + lngOffset,
    propertyType,
    lastRenewed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
    createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Last 6 months
    views: getRandomInt(10, 2000),
    saves: getRandomInt(0, 100),
    inquiries: getRandomInt(0, 30),
    isPromoted,
    promotionTier: isPromoted ? getRandomElement(['featured', 'highlight', 'premium']) : undefined,
    promotionEndDate: isPromoted ? new Date(Date.now() + getRandomInt(7, 30) * 24 * 60 * 60 * 1000) : undefined,
    hasBalcony: Math.random() > 0.4,
    hasGarden: Math.random() > 0.6,
    hasElevator: propertyType === 'apartment' && Math.random() > 0.3,
    hasSecurity: Math.random() > 0.5,
    hasAirConditioning: Math.random() > 0.4,
    hasPool: (propertyType === 'villa' || propertyType === 'house') && Math.random() > 0.8,
    petsAllowed: Math.random() > 0.4,
    distanceToCenter: Math.round(Math.random() * 15 * 10) / 10,
    distanceToSea: location.country === 'Croatia' || location.country === 'Montenegro' || location.country === 'Greece' || location.country === 'Albania'
      ? Math.round(Math.random() * 30 * 10) / 10
      : Math.round(Math.random() * 300 * 10) / 10,
    distanceToSchool: Math.round(Math.random() * 3 * 10) / 10,
    distanceToHospital: Math.round(Math.random() * 8 * 10) / 10,
  };

  if (isSold) {
    property.soldAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
  }

  if (propertyType === 'apartment') {
    property.floorNumber = getRandomInt(0, 20);
    property.totalFloors = property.floorNumber + getRandomInt(1, 15);
  }

  return property;
}

async function seed10kListings() {
  const TOTAL_LISTINGS = 10000;
  const BATCH_SIZE = 500;

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find or create a demo user
    let demoUser = await User.findOne({ email: 'demo@balkanestate.com' });

    if (!demoUser) {
      console.log('📝 Creating demo user...');
      demoUser = await User.create({
        name: 'Demo Agent',
        email: 'demo@balkanestate.com',
        password: 'demo123456',
        role: 'agent',
        isEmailVerified: true,
        agencyName: 'BalkanEstate Demo Agency',
      });
      console.log('✅ Demo user created');
    }

    // Check current count
    const existingCount = await Property.countDocuments();
    console.log(`📊 Current properties in database: ${existingCount}`);

    console.log(`\n🚀 Starting to seed ${TOTAL_LISTINGS} properties...`);
    console.log(`📦 Batch size: ${BATCH_SIZE}`);
    console.log(`📍 Locations: ${BALKAN_LOCATIONS.length} cities across 11 countries\n`);

    const startTime = Date.now();
    let totalCreated = 0;

    for (let batch = 0; batch < TOTAL_LISTINGS / BATCH_SIZE; batch++) {
      const properties = [];
      const batchStart = batch * BATCH_SIZE;

      for (let i = 0; i < BATCH_SIZE; i++) {
        properties.push(generateProperty(demoUser._id, batchStart + i));
      }

      await Property.insertMany(properties, { ordered: false });
      totalCreated += properties.length;

      const progress = ((totalCreated / TOTAL_LISTINGS) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (totalCreated / parseFloat(elapsed)).toFixed(0);

      console.log(`  ✅ Batch ${batch + 1}/${TOTAL_LISTINGS / BATCH_SIZE} complete | ${totalCreated}/${TOTAL_LISTINGS} (${progress}%) | ${rate} props/sec`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalCount = await Property.countDocuments();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 SUCCESS! Seeded ${totalCreated} properties in ${totalTime}s`);
    console.log(`📊 Total properties in database: ${finalCount}`);
    console.log(`⚡ Average rate: ${(totalCreated / parseFloat(totalTime)).toFixed(0)} properties/second`);
    console.log(`${'='.repeat(60)}\n`);

    // Show distribution
    const countryStats = await Property.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('📍 Properties by country:');
    countryStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count.toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ Error seeding properties:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run
seed10kListings();
