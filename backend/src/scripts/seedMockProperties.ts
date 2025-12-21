import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import User from '../models/User';

dotenv.config();

// Serbian cities with coordinates
const CITIES = [
  { name: 'Belgrade', country: 'Serbia', lat: 44.8167, lng: 20.4667 },
  { name: 'Novi Sad', country: 'Serbia', lat: 45.2671, lng: 19.8335 },
  { name: 'Niš', country: 'Serbia', lat: 43.3209, lng: 21.8954 },
  { name: 'Kragujevac', country: 'Serbia', lat: 44.0125, lng: 20.9114 },
  { name: 'Subotica', country: 'Serbia', lat: 46.1000, lng: 19.6667 },
];

const PROPERTY_TYPES: Array<'house' | 'apartment' | 'villa' | 'other'> = ['house', 'apartment', 'villa', 'other'];

const ADDRESSES = [
  'Main Street', 'Park Avenue', 'Lake View Drive', 'Mountain Road', 'City Center Boulevard',
  'Riverside Walk', 'Forest Lane', 'Garden Street', 'Valley Road', 'Sunset Boulevard'
];

const FEATURES = [
  'Hardwood floors', 'Granite countertops', 'Stainless steel appliances', 'Walk-in closet',
  'Large windows', 'Modern design', 'Energy efficient', 'Smart home ready', 'High ceilings',
  'Open floor plan', 'Natural light', 'Updated kitchen', 'Renovated bathroom'
];

const MATERIALS = [
  'Brick', 'Concrete', 'Wood', 'Steel', 'Glass', 'Stone', 'Marble'
];

const AMENITIES = [
  'Swimming pool', 'Gym', 'Parking', 'Garden', 'Balcony', 'Terrace', 'Storage',
  'Security system', 'Central heating', 'Air conditioning'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(): number {
  // Prices range from 30,000 to 500,000 EUR
  const base = getRandomInt(30000, 500000);
  // Round to nearest 1000
  return Math.round(base / 1000) * 1000;
}

function generateMockProperty(user: any, isSold: boolean = false): any {
  const city = getRandomElement(CITIES);
  const propertyType: 'house' | 'apartment' | 'villa' | 'other' = getRandomElement(PROPERTY_TYPES);
  const address = `${getRandomInt(1, 999)} ${getRandomElement(ADDRESSES)}`;

  // Add slight random offset to coordinates (within ~5km)
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;

  const beds = getRandomInt(1, 5);
  const baths = getRandomInt(1, 3);
  const sqft = getRandomInt(500, 3000);
  const yearBuilt = getRandomInt(1980, 2023);

  const property: any = {
    sellerId: user._id,
    createdByName: user.name,
    createdByEmail: user.email,
    title: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} in ${city.name}`,
    status: isSold ? 'sold' : 'active',
    price: getRandomPrice(),
    address,
    city: city.name,
    country: city.country,
    beds,
    baths,
    livingRooms: getRandomInt(1, 2),
    sqft,
    yearBuilt,
    parking: getRandomInt(0, 3),
    description: `Beautiful ${propertyType} with ${beds} bedrooms and ${baths} bathrooms. Located in ${city.name} with excellent access to amenities. Perfect for families or investors.`,
    specialFeatures: getRandomElements(FEATURES, getRandomInt(3, 6)),
    materials: getRandomElements(MATERIALS, getRandomInt(2, 4)),
    amenities: getRandomElements(AMENITIES, getRandomInt(3, 7)),
    imageUrl: `https://images.unsplash.com/photo-${getRandomInt(1500000000000, 1700000000000)}?w=800&h=600&fit=crop`,
    images: [],
    lat: city.lat + latOffset,
    lng: city.lng + lngOffset,
    propertyType,
    lastRenewed: new Date(),
    views: getRandomInt(0, 500),
    saves: getRandomInt(0, 50),
    inquiries: getRandomInt(0, 20),
    isPromoted: Math.random() > 0.9, // 10% chance of being promoted
    hasBalcony: Math.random() > 0.5,
    hasGarden: Math.random() > 0.6,
    hasElevator: propertyType === 'apartment' && Math.random() > 0.4,
    hasSecurity: Math.random() > 0.5,
    hasAirConditioning: Math.random() > 0.6,
    hasPool: propertyType === 'villa' && Math.random() > 0.7,
    petsAllowed: Math.random() > 0.5,
    distanceToCenter: Math.round(Math.random() * 20 * 10) / 10, // 0-20km
    distanceToSea: Math.round(Math.random() * 200 * 10) / 10, // 0-200km
    distanceToSchool: Math.round(Math.random() * 5 * 10) / 10, // 0-5km
    distanceToHospital: Math.round(Math.random() * 10 * 10) / 10, // 0-10km
  };

  // If sold, add soldAt date (random date within last 2 years)
  if (isSold) {
    const now = Date.now();
    const twoYearsAgo = now - (2 * 365 * 24 * 60 * 60 * 1000);
    const randomTimestamp = twoYearsAgo + Math.random() * (now - twoYearsAgo);
    property.soldAt = new Date(randomTimestamp);
  }

  if (propertyType === 'apartment') {
    property.floorNumber = getRandomInt(0, 15);
    property.totalFloors = property.floorNumber + getRandomInt(1, 10);
  }

  return property;
}

async function seedMockProperties() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all agent users
    const agents = await User.find({ role: 'agent' });
    console.log(`📊 Found ${agents.length} agents`);

    if (agents.length === 0) {
      console.log('⚠️  No agents found. Please create some agent users first.');
      return;
    }

    // Optional: Clear existing properties (comment out if you want to keep existing)
    // await Property.deleteMany({});
    // console.log('🗑️  Cleared existing properties');

    let totalCreated = 0;
    const propertiesPerAgent = 100;

    for (const agent of agents) {
      console.log(`\n👤 Creating properties for agent: ${agent.name}`);

      // Generate 70% active and 30% sold properties
      const activePropCount = Math.floor(propertiesPerAgent * 0.7); // 70 active
      const soldPropCount = propertiesPerAgent - activePropCount; // 30 sold

      const properties = [];

      // Create active properties
      for (let i = 0; i < activePropCount; i++) {
        properties.push(generateMockProperty(agent, false));
      }

      // Create sold properties
      for (let i = 0; i < soldPropCount; i++) {
        properties.push(generateMockProperty(agent, true));
      }

      // Insert all properties for this agent
      const result = await Property.insertMany(properties);
      totalCreated += result.length;

      console.log(`  ✅ Created ${result.length} properties (${activePropCount} active, ${soldPropCount} sold)`);
    }

    console.log(`\n🎉 Successfully seeded ${totalCreated} mock properties!`);
    console.log(`📊 Properties per agent: ${propertiesPerAgent}`);
    console.log(`📊 Total agents: ${agents.length}`);

  } catch (error) {
    console.error('❌ Error seeding mock properties:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedMockProperties();
