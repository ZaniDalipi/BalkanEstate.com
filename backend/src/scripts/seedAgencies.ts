import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agency from '../models/Agency';
import User from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';

const sampleAgencies = [
  {
    name: 'Belgrade Premium Properties',
    slug: 'belgrade-premium-properties',
    description: 'Leading real estate agency in Belgrade, specializing in luxury apartments and commercial properties in the heart of Serbia.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200',
    email: 'info@belgradepremium.rs',
    phone: '+381 11 1234567',
    website: 'www.belgradepremium.rs',
    address: 'Knez Mihailova 42',
    city: 'Belgrade',
    country: 'Serbia',
    zipCode: '11000',
    lat: 44.8176,
    lng: 20.4568,
    totalProperties: 145,
    totalAgents: 12,
    yearsInBusiness: 15,
    isFeatured: true,
    adRotationOrder: 1,
    specialties: ['Luxury Apartments', 'Commercial Properties', 'Investment Opportunities'],
    certifications: ['Real Estate Association of Serbia', 'European Property Standards'],
  },
  {
    name: 'Zagreb Elite Estates',
    slug: 'zagreb-elite-estates',
    description: 'Premium real estate services in Croatia\'s capital. Experts in residential and vacation properties along the Adriatic coast.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200',
    email: 'contact@zagrebelite.hr',
    phone: '+385 1 2345678',
    website: 'www.zagrebelite.hr',
    address: 'Ilica 123',
    city: 'Zagreb',
    country: 'Croatia',
    zipCode: '10000',
    lat: 45.8150,
    lng: 15.9819,
    totalProperties: 98,
    totalAgents: 8,
    yearsInBusiness: 10,
    isFeatured: true,
    adRotationOrder: 2,
    specialties: ['Coastal Properties', 'Vacation Homes', 'Urban Apartments'],
    certifications: ['Croatian Chamber of Commerce', 'EU Real Estate Standards'],
  },
  {
    name: 'Sofia Property Group',
    slug: 'sofia-property-group',
    description: 'Bulgaria\'s most trusted real estate agency. Specializing in residential, commercial, and ski resort properties.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200',
    email: 'hello@sofiapropertygroup.bg',
    phone: '+359 2 9876543',
    website: 'www.sofiapropertygroup.bg',
    address: 'Vitosha Boulevard 89',
    city: 'Sofia',
    country: 'Bulgaria',
    zipCode: '1000',
    lat: 42.6977,
    lng: 23.3219,
    totalProperties: 167,
    totalAgents: 15,
    yearsInBusiness: 12,
    isFeatured: true,
    adRotationOrder: 3,
    specialties: ['Ski Properties', 'City Apartments', 'Investment Properties'],
    certifications: ['Bulgarian Real Estate Chamber', 'ISO 9001'],
  },
  {
    name: 'Bucharest Luxury Homes',
    slug: 'bucharest-luxury-homes',
    description: 'Exclusive real estate agency in Bucharest offering premium properties in the most sought-after neighborhoods.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200',
    email: 'info@bucharestluxury.ro',
    phone: '+40 21 1234567',
    website: 'www.bucharestluxury.ro',
    address: 'Calea Victoriei 155',
    city: 'Bucharest',
    country: 'Romania',
    zipCode: '010073',
    lat: 44.4268,
    lng: 26.1025,
    totalProperties: 112,
    totalAgents: 10,
    yearsInBusiness: 8,
    isFeatured: true,
    adRotationOrder: 4,
    specialties: ['Luxury Villas', 'Historic Properties', 'Modern Apartments'],
    certifications: ['Romanian Real Estate Federation', 'European Quality Standards'],
  },
  {
    name: 'Tirana Property Solutions',
    slug: 'tirana-property-solutions',
    description: 'Albania\'s fastest growing real estate agency. Connecting buyers with the best properties in Tirana and coastal regions.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1467638992958-cfe2cd6e9a56?w=1200',
    email: 'contact@tiranaproperties.al',
    phone: '+355 4 2123456',
    website: 'www.tiranaproperties.al',
    address: 'Rruga e Kavajes 45',
    city: 'Tirana',
    country: 'Albania',
    zipCode: '1001',
    lat: 41.3275,
    lng: 19.8187,
    totalProperties: 89,
    totalAgents: 7,
    yearsInBusiness: 6,
    isFeatured: true,
    adRotationOrder: 5,
    specialties: ['New Developments', 'Coastal Properties', 'Commercial Spaces'],
    certifications: ['Albanian Real Estate Association'],
  },
  {
    name: 'Skopje Real Estate Partners',
    slug: 'skopje-real-estate-partners',
    description: 'Premier real estate agency in North Macedonia, offering comprehensive property services throughout Skopje and beyond.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200',
    email: 'info@skopjepartners.mk',
    phone: '+389 2 3123456',
    website: 'www.skopjepartners.mk',
    address: 'Macedonia Street 12',
    city: 'Skopje',
    country: 'North Macedonia',
    zipCode: '1000',
    lat: 41.9973,
    lng: 21.4280,
    totalProperties: 76,
    totalAgents: 6,
    yearsInBusiness: 7,
    isFeatured: false,
    adRotationOrder: 6,
    specialties: ['Residential Properties', 'Land Sales', 'Business Premises'],
    certifications: ['Macedonian Real Estate Chamber'],
  },
  {
    name: 'Pristina Urban Realty',
    slug: 'pristina-urban-realty',
    description: 'Leading real estate agency in Kosovo, specializing in modern apartments and commercial properties in Pristina.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=1200',
    email: 'hello@pristinaurban.com',
    phone: '+383 38 123456',
    website: 'www.pristinaurban.com',
    address: 'Mother Teresa Boulevard 55',
    city: 'Pristina',
    country: 'Kosovo',
    zipCode: '10000',
    lat: 42.6629,
    lng: 21.1655,
    totalProperties: 64,
    totalAgents: 5,
    yearsInBusiness: 5,
    isFeatured: false,
    adRotationOrder: 7,
    specialties: ['New Apartments', 'Office Spaces', 'Rental Properties'],
    certifications: ['Kosovo Real Estate Association'],
  },
  {
    name: 'Sarajevo Premier Estates',
    slug: 'sarajevo-premier-estates',
    description: 'Trusted real estate partner in Bosnia and Herzegovina, offering quality properties in Sarajevo and surrounding areas.',
    logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200',
    email: 'info@sarajevopremier.ba',
    phone: '+387 33 123456',
    website: 'www.sarajevopremier.ba',
    address: 'Ferhadija 25',
    city: 'Sarajevo',
    country: 'Bosnia and Herzegovina',
    zipCode: '71000',
    lat: 43.8564,
    lng: 18.4131,
    totalProperties: 81,
    totalAgents: 7,
    yearsInBusiness: 9,
    isFeatured: false,
    adRotationOrder: 8,
    specialties: ['Mountain Properties', 'City Apartments', 'Historic Buildings'],
    certifications: ['B&H Real Estate Association'],
  },
];

async function seedAgencies() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Only clear sample/seeded agencies (not user-created ones)
    // We identify seeded agencies by checking if they match our sample slugs
    const sampleSlugs = sampleAgencies.map(a => a.slug);
    console.log('Clearing previously seeded agencies...');
    const deleteResult = await Agency.deleteMany({ slug: { $in: sampleSlugs } });
    console.log(`Removed ${deleteResult.deletedCount} previously seeded agencies`);

    // Find or create owner users for each agency
    console.log('Creating agency owners...');
    const agenciesWithOwners = await Promise.all(
      sampleAgencies.map(async (agencyData, index) => {
        // Create or find an enterprise user for each agency
        const ownerEmail = `owner${index + 1}@${agencyData.email.split('@')[1]}`;

        let owner = await User.findOne({ email: ownerEmail });

        if (!owner) {
          owner = await User.create({
            email: ownerEmail,
            password: 'password123', // Will be hashed automatically
            name: `${agencyData.name} Owner`,
            phone: agencyData.phone,
            role: 'agent',
            provider: 'local',
            isEmailVerified: true,
            subscriptionPlan: 'enterprise',
            isSubscribed: true,
            isEnterpriseTier: true,
            city: agencyData.city,
            country: agencyData.country,
          });
        }

        // Generate unique invitation code for each agency
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const nameCode = agencyData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
        const invitationCode = `AGY-${nameCode}-${randomCode}`;

        return {
          ...agencyData,
          ownerId: owner._id,
          invitationCode, // Add unique invitation code
          agents: [], // Will be populated when agents join
        };
      })
    );

    // Insert agencies
    console.log('Inserting sample agencies...');
    const insertedAgencies = await Agency.insertMany(agenciesWithOwners);
    console.log(`✓ ${insertedAgencies.length} agencies inserted`);

    // Update owners with agency references
    console.log('Updating owner users with agency references...');
    for (let i = 0; i < insertedAgencies.length; i++) {
      const agency = insertedAgencies[i];
      await User.findByIdAndUpdate(agency.ownerId, {
        agencyId: agency._id,
        agencyName: agency.name,
      });
    }
    console.log('✓ Owner users updated');

    console.log('\n=== Newly Seeded Agencies ===');
    insertedAgencies.forEach((agency: any) => {
      console.log(`✓ ${agency.name} (${agency.city}, ${agency.country})`);
      console.log(`  Invitation Code: ${agency.invitationCode}`);
      console.log(`  URL: /agency-${agency.slug}`);
      console.log(`  Featured: ${agency.isFeatured ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Show ALL agencies in database (including user-created ones)
    console.log('\n=== ALL Agencies in Database ===');
    const allAgencies = await Agency.find({}).select('name invitationCode city country slug');
    allAgencies.forEach((agency: any, index: number) => {
      console.log(`${index + 1}. ${agency.name} (${agency.city}, ${agency.country})`);
      console.log(`   Code: ${agency.invitationCode || 'NO CODE'}`);
      console.log(`   Slug: ${agency.slug || 'NO SLUG'}`);
      console.log('');
    });

    console.log(`✅ Seeding completed! Total agencies: ${allAgencies.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedAgencies();
