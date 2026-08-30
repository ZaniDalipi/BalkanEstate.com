import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BusinessListing from '../models/BusinessListing';
import User from '../models/User';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SeedBusinessListings');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';

const sampleBusinesses = [
  // === BUSINESSES ===
  {
    listingType: 'business',
    name: 'Balkan Build Construction',
    description: 'Full-service construction company specializing in residential and commercial buildings across the Balkans. Over 20 years of experience delivering high-quality projects on time and within budget.',
    category: 'construction',
    services: ['New Construction', 'Commercial Buildings', 'Renovations', 'Project Management', 'Architectural Consulting'],
    contactPhone: '+389 70 123 456',
    contactEmail: 'info@balkanbuild.mk',
    website: 'https://balkanbuild.mk',
    address: 'Bul. Partizanski Odredi 17',
    city: 'Skopje',
    country: 'North Macedonia',
    logoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop',
    isVerified: true,
    views: 342,
    socialMedia: { facebook: 'https://facebook.com/balkanbuild', instagram: 'https://instagram.com/balkanbuild' },
    businessHours: { monday: '08:00 - 17:00', tuesday: '08:00 - 17:00', wednesday: '08:00 - 17:00', thursday: '08:00 - 17:00', friday: '08:00 - 15:00', saturday: '09:00 - 13:00' },
  },
  {
    listingType: 'business',
    name: 'ProClean Services',
    description: 'Professional cleaning services for homes, offices, and construction sites. We use eco-friendly products and guarantee spotless results every time.',
    category: 'cleaning',
    services: ['Deep Cleaning', 'Office Cleaning', 'Post-Construction Cleanup', 'Window Cleaning', 'Carpet Cleaning', 'Regular Maintenance'],
    contactPhone: '+381 63 987 654',
    contactEmail: 'office@proclean.rs',
    website: 'https://proclean.rs',
    address: 'Kneza Milosa 55',
    city: 'Belgrade',
    country: 'Serbia',
    logoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
    isVerified: true,
    views: 218,
    socialMedia: { instagram: 'https://instagram.com/proclean.rs' },
    businessHours: { monday: '07:00 - 20:00', tuesday: '07:00 - 20:00', wednesday: '07:00 - 20:00', thursday: '07:00 - 20:00', friday: '07:00 - 20:00', saturday: '08:00 - 16:00', sunday: '09:00 - 14:00' },
  },
  {
    listingType: 'business',
    name: 'MoveIt Relocations',
    description: 'Reliable moving and relocation services throughout Southeast Europe. From small apartment moves to full office relocations, we handle it all with care.',
    category: 'moving',
    services: ['Local Moving', 'International Relocation', 'Packing Services', 'Furniture Assembly', 'Storage Solutions'],
    contactPhone: '+385 91 234 567',
    contactEmail: 'info@moveit.hr',
    address: 'Savska cesta 88',
    city: 'Zagreb',
    country: 'Croatia',
    logoUrl: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=400&fit=crop',
    isVerified: false,
    views: 156,
    businessHours: { monday: '06:00 - 18:00', tuesday: '06:00 - 18:00', wednesday: '06:00 - 18:00', thursday: '06:00 - 18:00', friday: '06:00 - 18:00', saturday: '07:00 - 15:00' },
  },
  {
    listingType: 'business',
    name: 'Adriatic Interiors',
    description: 'Award-winning interior design studio creating stunning living and commercial spaces inspired by Mediterranean and modern aesthetics.',
    category: 'interior_design',
    services: ['Residential Design', 'Commercial Interiors', 'Space Planning', '3D Visualization', 'Furniture Selection', 'Color Consultation'],
    contactPhone: '+382 67 456 789',
    contactEmail: 'studio@adriaticinteriors.me',
    website: 'https://adriaticinteriors.me',
    address: 'Stari Grad bb',
    city: 'Podgorica',
    country: 'Montenegro',
    logoUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop',
    isVerified: true,
    views: 489,
    socialMedia: { facebook: 'https://facebook.com/adriaticinteriors', instagram: 'https://instagram.com/adriaticinteriors', linkedin: 'https://linkedin.com/company/adriaticinteriors' },
    businessHours: { monday: '09:00 - 18:00', tuesday: '09:00 - 18:00', wednesday: '09:00 - 18:00', thursday: '09:00 - 18:00', friday: '09:00 - 16:00' },
  },
  {
    listingType: 'business',
    name: 'SecureHome Albania',
    description: 'Complete home and business security solutions including alarm systems, CCTV installation, smart locks, and 24/7 monitoring services.',
    category: 'security',
    services: ['Alarm Systems', 'CCTV Installation', 'Smart Locks', '24/7 Monitoring', 'Access Control', 'Fire Detection'],
    contactPhone: '+355 69 876 543',
    contactEmail: 'info@securehome.al',
    website: 'https://securehome.al',
    address: 'Rruga Durresi 45',
    city: 'Tirana',
    country: 'Albania',
    logoUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop',
    isVerified: true,
    views: 267,
    socialMedia: { facebook: 'https://facebook.com/securehomeal' },
    businessHours: { monday: '08:00 - 20:00', tuesday: '08:00 - 20:00', wednesday: '08:00 - 20:00', thursday: '08:00 - 20:00', friday: '08:00 - 20:00', saturday: '09:00 - 17:00', sunday: '10:00 - 14:00' },
  },
  {
    listingType: 'business',
    name: 'GreenScape Landscaping',
    description: 'Transform your outdoor spaces with our expert landscaping services. Garden design, lawn care, irrigation systems, and seasonal maintenance.',
    category: 'landscaping',
    services: ['Garden Design', 'Lawn Care', 'Irrigation Systems', 'Tree Trimming', 'Outdoor Lighting', 'Seasonal Planting'],
    contactPhone: '+359 88 111 222',
    contactEmail: 'hello@greenscape.bg',
    website: 'https://greenscape.bg',
    address: 'ul. Vitosha 120',
    city: 'Sofia',
    country: 'Bulgaria',
    logoUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
    isVerified: false,
    views: 134,
    socialMedia: { instagram: 'https://instagram.com/greenscape.bg' },
    businessHours: { monday: '07:00 - 17:00', tuesday: '07:00 - 17:00', wednesday: '07:00 - 17:00', thursday: '07:00 - 17:00', friday: '07:00 - 15:00', saturday: '08:00 - 13:00' },
  },
  {
    listingType: 'business',
    name: 'Elektro Plus',
    description: 'Licensed electrical contractors providing residential and commercial electrical services. Certified for solar panel installations and smart home wiring.',
    category: 'electrical',
    services: ['Electrical Wiring', 'Solar Panels', 'Smart Home Setup', 'Lighting Design', 'Electrical Inspections', 'Emergency Repairs'],
    contactPhone: '+389 71 555 888',
    contactEmail: 'contact@elektroplus.mk',
    address: 'ul. 11 Oktomvri 25',
    city: 'Bitola',
    country: 'North Macedonia',
    logoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
    isVerified: true,
    views: 198,
    businessHours: { monday: '08:00 - 16:00', tuesday: '08:00 - 16:00', wednesday: '08:00 - 16:00', thursday: '08:00 - 16:00', friday: '08:00 - 14:00' },
  },
  {
    listingType: 'business',
    name: 'AquaFlow Plumbing',
    description: 'Expert plumbing services for installations, repairs, and maintenance. Specializing in modern bathroom and kitchen plumbing with warranty on all work.',
    category: 'plumbing',
    services: ['Pipe Installation', 'Leak Repair', 'Bathroom Plumbing', 'Kitchen Plumbing', 'Drain Cleaning', 'Water Heater Installation'],
    contactPhone: '+381 64 333 444',
    contactEmail: 'service@aquaflow.rs',
    address: 'Bulevar Oslobodjenja 77',
    city: 'Novi Sad',
    country: 'Serbia',
    logoUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop',
    isVerified: false,
    views: 87,
    businessHours: { monday: '07:00 - 19:00', tuesday: '07:00 - 19:00', wednesday: '07:00 - 19:00', thursday: '07:00 - 19:00', friday: '07:00 - 19:00', saturday: '08:00 - 14:00' },
  },
  {
    listingType: 'business',
    name: 'TopRoof Solutions',
    description: 'Professional roofing contractor with expertise in new installations, repairs, and waterproofing. We work with all types of roofing materials.',
    category: 'roofing',
    services: ['Roof Installation', 'Roof Repair', 'Waterproofing', 'Gutter Installation', 'Insulation', 'Roof Inspection'],
    contactPhone: '+385 98 765 432',
    contactEmail: 'info@toproof.hr',
    website: 'https://toproof.hr',
    city: 'Split',
    country: 'Croatia',
    logoUrl: 'https://images.unsplash.com/photo-1632823471565-1ecdf5c6d7b6?w=400&h=400&fit=crop',
    isVerified: true,
    views: 312,
    socialMedia: { facebook: 'https://facebook.com/toproof.hr' },
    businessHours: { monday: '07:00 - 16:00', tuesday: '07:00 - 16:00', wednesday: '07:00 - 16:00', thursday: '07:00 - 16:00', friday: '07:00 - 14:00' },
  },

  // === INDIVIDUALS ===
  {
    listingType: 'individual',
    name: 'Marko Petrovic',
    description: 'Independent renovation specialist with 15 years of experience. I handle everything from bathroom remodels to full apartment renovations. Quality craftsmanship guaranteed.',
    category: 'renovation',
    services: ['Bathroom Remodeling', 'Kitchen Renovation', 'Flooring', 'Tiling', 'Drywall'],
    contactPhone: '+381 65 111 222',
    contactEmail: 'marko.petrovic@gmail.com',
    city: 'Belgrade',
    country: 'Serbia',
    logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    isVerified: true,
    views: 423,
    businessHours: { monday: '08:00 - 18:00', tuesday: '08:00 - 18:00', wednesday: '08:00 - 18:00', thursday: '08:00 - 18:00', friday: '08:00 - 16:00', saturday: '09:00 - 14:00' },
  },
  {
    listingType: 'individual',
    name: 'Ana Kovacevic',
    description: 'Freelance architect and interior designer. I create beautiful, functional spaces for homes and small businesses. Fluent in English, Serbian, and German.',
    category: 'architecture',
    services: ['Architectural Design', 'Interior Planning', '3D Rendering', 'Building Permits', 'Construction Oversight'],
    contactPhone: '+382 68 234 567',
    contactEmail: 'ana.design@gmail.com',
    website: 'https://anakovacevic.me',
    city: 'Podgorica',
    country: 'Montenegro',
    logoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
    isVerified: true,
    views: 567,
    socialMedia: { instagram: 'https://instagram.com/ana.architecture', linkedin: 'https://linkedin.com/in/anakovacevic' },
    businessHours: { monday: '09:00 - 17:00', tuesday: '09:00 - 17:00', wednesday: '09:00 - 17:00', thursday: '09:00 - 17:00', friday: '09:00 - 15:00' },
  },
  {
    listingType: 'individual',
    name: 'Dragan Ilic',
    description: 'Master painter with over 20 years of experience. Specializing in interior and exterior painting, decorative finishes, and wallpaper installation.',
    category: 'painting',
    services: ['Interior Painting', 'Exterior Painting', 'Decorative Finishes', 'Wallpaper Installation', 'Color Consulting'],
    contactPhone: '+389 72 345 678',
    contactEmail: 'dragan.painter@gmail.com',
    city: 'Skopje',
    country: 'North Macedonia',
    logoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    isVerified: false,
    views: 145,
    businessHours: { monday: '07:00 - 17:00', tuesday: '07:00 - 17:00', wednesday: '07:00 - 17:00', thursday: '07:00 - 17:00', friday: '07:00 - 15:00' },
  },
  {
    listingType: 'individual',
    name: 'Elena Dimitrova',
    description: 'Certified home inspector providing thorough property inspections for buyers and sellers. Detailed reports with photos delivered within 24 hours.',
    category: 'home_inspection',
    services: ['Pre-Purchase Inspection', 'Pre-Sale Inspection', 'Structural Assessment', 'Moisture Detection', 'Energy Audit'],
    contactPhone: '+359 87 654 321',
    contactEmail: 'elena.inspector@gmail.com',
    city: 'Sofia',
    country: 'Bulgaria',
    logoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    isVerified: true,
    views: 289,
    socialMedia: { linkedin: 'https://linkedin.com/in/elenadimitrova' },
    businessHours: { monday: '08:00 - 18:00', tuesday: '08:00 - 18:00', wednesday: '08:00 - 18:00', thursday: '08:00 - 18:00', friday: '08:00 - 16:00', saturday: '09:00 - 13:00' },
  },
  {
    listingType: 'individual',
    name: 'Stefan Nikolic',
    description: 'Independent HVAC technician offering installation, repair, and maintenance of heating, ventilation, and air conditioning systems for residential properties.',
    category: 'hvac',
    services: ['AC Installation', 'Heating Systems', 'Ventilation', 'Annual Maintenance', 'Emergency Repairs'],
    contactPhone: '+381 66 789 012',
    city: 'Nis',
    country: 'Serbia',
    logoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    isVerified: false,
    views: 98,
    businessHours: { monday: '07:00 - 19:00', tuesday: '07:00 - 19:00', wednesday: '07:00 - 19:00', thursday: '07:00 - 19:00', friday: '07:00 - 17:00', saturday: '08:00 - 14:00' },
  },
  {
    listingType: 'individual',
    name: 'Ivana Horvat',
    description: 'Real estate lawyer specializing in property transactions, contracts, and dispute resolution. 10+ years of experience in Balkan real estate law.',
    category: 'real_estate_law',
    services: ['Property Contracts', 'Title Search', 'Due Diligence', 'Dispute Resolution', 'Foreign Buyer Assistance'],
    contactPhone: '+385 91 456 789',
    contactEmail: 'ivana.horvat@law.hr',
    website: 'https://horvat-law.hr',
    address: 'Palmotićeva 12',
    city: 'Zagreb',
    country: 'Croatia',
    logoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    isVerified: true,
    views: 634,
    socialMedia: { linkedin: 'https://linkedin.com/in/ivanahorvat' },
    businessHours: { monday: '09:00 - 17:00', tuesday: '09:00 - 17:00', wednesday: '09:00 - 17:00', thursday: '09:00 - 17:00', friday: '09:00 - 15:00' },
  },
  {
    listingType: 'individual',
    name: 'Nikola Jovanovic',
    description: 'Experienced furniture craftsman creating custom pieces from solid wood. Kitchens, wardrobes, shelving, and bespoke furniture designed to your specifications.',
    category: 'furniture',
    services: ['Custom Kitchens', 'Built-in Wardrobes', 'Shelving Systems', 'Dining Tables', 'Restoration'],
    contactPhone: '+381 63 222 333',
    contactEmail: 'nikola.wood@gmail.com',
    city: 'Kragujevac',
    country: 'Serbia',
    logoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    isVerified: false,
    views: 176,
    socialMedia: { instagram: 'https://instagram.com/nikola.woodcraft' },
    businessHours: { monday: '08:00 - 16:00', tuesday: '08:00 - 16:00', wednesday: '08:00 - 16:00', thursday: '08:00 - 16:00', friday: '08:00 - 14:00' },
  },
  {
    listingType: 'individual',
    name: 'Maja Stojanovic',
    description: 'Professional pest control specialist. Safe and effective treatments for all types of pests. Licensed and insured with environmentally-friendly solutions.',
    category: 'pest_control',
    services: ['Insect Control', 'Rodent Control', 'Termite Treatment', 'Preventive Treatments', 'Commercial Pest Control'],
    contactPhone: '+389 75 888 999',
    city: 'Ohrid',
    country: 'North Macedonia',
    logoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    isVerified: false,
    views: 67,
    businessHours: { monday: '08:00 - 17:00', tuesday: '08:00 - 17:00', wednesday: '08:00 - 17:00', thursday: '08:00 - 17:00', friday: '08:00 - 15:00' },
  },
];

async function seedBusinessListings() {
  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    log.info('Connected to MongoDB');

    // Find or create a seed owner user
    const seedEmail = 'seed-business-owner@balkanestateai.com';
    let owner = await User.findOne({ email: seedEmail });

    if (!owner) {
      owner = await User.create({
        email: seedEmail,
        password: 'password123',
        name: 'Seed Business Owner',
        phone: '+389 70 000 000',
        role: 'user',
        provider: 'local',
        isEmailVerified: true,
        city: 'Skopje',
        country: 'North Macedonia',
      });
      log.info('Created seed owner user');
    }

    // Clear previously seeded listings (by owner)
    const deleteResult = await BusinessListing.deleteMany({ owner: owner._id });
    log.info(`Removed ${deleteResult.deletedCount} previously seeded listings`);

    // Insert all listings
    const listingsWithOwner = sampleBusinesses.map(listing => ({
      ...listing,
      owner: owner!._id,
      isActive: true,
    }));

    const inserted = await BusinessListing.insertMany(listingsWithOwner);
    log.info(`\n✅ ${inserted.length} business listings seeded successfully!\n`);

    const businesses = inserted.filter((l: any) => l.listingType === 'business');
    const individuals = inserted.filter((l: any) => l.listingType === 'individual');

    log.info(`=== Businesses (${businesses.length}) ===`);
    businesses.forEach((l: any) => {
      log.info(`  ✓ ${l.name} - ${l.category} (${l.city}, ${l.country})${l.isVerified ? ' [VERIFIED]' : ''}`);
    });

    log.info(`\n=== Individuals (${individuals.length}) ===`);
    individuals.forEach((l: any) => {
      log.info(`  ✓ ${l.name} - ${l.category} (${l.city}, ${l.country})${l.isVerified ? ' [VERIFIED]' : ''}`);
    });

    log.info(`\nTotal: ${inserted.length} listings (${businesses.length} businesses, ${individuals.length} individuals)`);

    process.exit(0);
  } catch (error) {
    log.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedBusinessListings();
