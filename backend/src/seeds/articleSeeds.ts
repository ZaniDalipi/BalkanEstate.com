/**
 * Seed script for article ideas
 * Run with: npx ts-node src/seeds/articleSeeds.ts
 */

import mongoose from 'mongoose';
import Article from '../models/Article';
import dotenv from 'dotenv';

dotenv.config();

const ARTICLE_IDEAS = [
  // Buying Guides (10)
  { title: 'How to Buy Property in Montenegro as a Foreigner: A Step-by-Step Guide', excerpt: 'Navigate legal requirements, find the right properties, and avoid common pitfalls when buying real estate in Montenegro.', category: 'guide', country: 'Montenegro', countryCode: 'ME', tags: ['buying', 'foreigners', 'legal'] },
  { title: 'Albania\'s Property Market in 2026: What Foreign Buyers Need to Know', excerpt: 'Market analysis and insider tips for foreign investors looking to buy property in Albania\'s booming real estate sector.', category: 'market', country: 'Albania', countryCode: 'AL', tags: ['investing', 'market', 'foreigners'] },
  { title: 'Buying a House in Croatia: Legal Requirements, Taxes & Hidden Costs', excerpt: 'Complete guide to purchasing residential property in Croatia including legal procedures, taxes, and fees to budget for.', category: 'guide', country: 'Croatia', countryCode: 'HR', tags: ['buying', 'legal', 'taxes'] },
  { title: 'A Foreigner\'s Guide to Buying Real Estate in Greece', excerpt: 'Learn what it takes to buy property in Greece as a foreigner, including paperwork, costs, and investment opportunities.', category: 'guide', country: 'Greece', countryCode: 'GR', tags: ['buying', 'foreigners'] },
  { title: 'Serbia Property Investment Guide: Regulations, Returns & Risks', excerpt: 'Comprehensive investment guide for buying property in Serbia with analysis of returns, regulations, and potential risks.', category: 'investment', country: 'Serbia', countryCode: 'RS', tags: ['investing', 'legal', 'returns'] },
  { title: 'Buying Land in North Macedonia: What You Need to Know Before Signing', excerpt: 'Essential guide to purchasing land in North Macedonia, including legal checks, valuations, and negotiation strategies.', category: 'guide', country: 'North Macedonia', countryCode: 'MK', tags: ['land', 'buying', 'legal'] },
  { title: 'Bulgaria\'s Coastal Property Market: Opportunities Along the Black Sea', excerpt: 'Explore Bulgaria\'s thriving coastal real estate market with opportunities for beachfront properties and investment returns.', category: 'investment', country: 'Bulgaria', countryCode: 'BG', tags: ['coastal', 'investing', 'vacation'] },
  { title: 'Property Ownership Laws in Kosovo: A Guide for Diaspora Buyers', excerpt: 'Guide for Kosovo diaspora and foreign investors on property ownership laws, procedures, and investment opportunities.', category: 'guide', country: 'Kosovo', countryCode: 'XK', tags: ['legal', 'diaspora', 'investing'] },
  { title: 'Slovenia Real Estate for EU vs Non-EU Buyers: Key Differences', excerpt: 'Detailed comparison of property buying processes, regulations, and costs for EU and non-EU buyers in Slovenia.', category: 'guide', country: 'Slovenia', countryCode: 'SI', tags: ['eu', 'legal', 'foreigners'] },
  { title: 'Bosnia & Herzegovina: Navigating the Dual-Entity Property System', excerpt: 'Guide to buying property in Bosnia & Herzegovina\'s unique two-entity system with Federation and Serb Republic.', category: 'guide', country: 'Bosnia & Herzegovina', countryCode: 'BA', tags: ['legal', 'system', 'buying'] },

  // Investment & Market Analysis (10)
  { title: 'Top 5 Balkan Cities for Real Estate Investment in 2026', excerpt: 'Analysis of the hottest Balkan cities offering best investment returns, rental yields, and growth potential.', category: 'investment', tags: ['investing', 'cities', 'returns'] },
  { title: 'Rental Yield Comparison: Balkan Coastal Cities vs European Averages', excerpt: 'Compare rental yields in Balkan coastal destinations against major European cities to find best ROI.', category: 'investment', tags: ['rental', 'yields', 'comparison'] },
  { title: 'Why Montenegro Is the Balkans\' Fastest-Growing Property Market', excerpt: 'Analysis of Montenegro\'s rapid real estate growth, investment opportunities, and future market trends.', category: 'market', country: 'Montenegro', countryCode: 'ME', tags: ['market', 'growth', 'investing'] },
  { title: 'Tirana\'s Real Estate Boom: Bubble or Long-Term Growth?', excerpt: 'Deep dive into Tirana\'s explosive property market growth, with analysis of sustainability and investment viability.', category: 'market', country: 'Albania', countryCode: 'AL', tags: ['market', 'city', 'analysis'] },
  { title: 'Digital Nomad Hotspots in the Balkans: Where to Buy for Airbnb Returns', excerpt: 'Identify top Balkan cities attracting digital nomads and analyze Airbnb investment opportunities in each.', category: 'investment', tags: ['nomads', 'rental', 'airbnb'] },
  { title: 'How EU Accession Talks Are Affecting Property Prices in the Western Balkans', excerpt: 'Analysis of how EU integration prospects are reshaping real estate markets and property valuations across the region.', category: 'market', tags: ['eu', 'politics', 'market'] },
  { title: 'Comparing Property Prices: Balkans vs Western Europe (2026 Data)', excerpt: 'Comprehensive price comparison showing value proposition of Balkan property versus Western European markets.', category: 'market', tags: ['prices', 'comparison', 'value'] },
  { title: 'The Rise of Luxury Villas in the Balkans: Who\'s Buying and Where?', excerpt: 'Explore the booming luxury property segment in the Balkans, including buyer demographics and prime locations.', category: 'market', tags: ['luxury', 'villas', 'buyers'] },
  { title: 'Post-Pandemic Property Trends in Southeast Europe', excerpt: 'How remote work, migration patterns, and changing preferences are reshaping Southeast European real estate.', category: 'market', tags: ['trends', 'pandemic', 'demographics'] },
  { title: 'Agricultural Land Investment in the Balkans: An Untapped Opportunity?', excerpt: 'Explore agricultural land investment potential in the Balkans with analysis of returns and regulations.', category: 'investment', tags: ['land', 'agriculture', 'investment'] },

  // Lifestyle & Relocation (8)
  { title: 'Retiring in the Balkans: Best Countries for Affordable Waterfront Living', excerpt: 'Guide to retiring affordably in Balkan countries with focus on beautiful waterfront communities and cost of living.', category: 'lifestyle', tags: ['retirement', 'living', 'coastal'] },
  { title: 'Cost of Living Comparison: Balkan Countries for Expats (2026)', excerpt: 'Detailed breakdown of living costs across Balkan countries to help expats choose the best destination.', category: 'lifestyle', tags: ['expats', 'costs', 'comparison'] },
  { title: 'Moving to the Balkans: What Expats Wish They Knew Before Buying', excerpt: 'Practical advice from expats who moved to the Balkans, covering unexpected costs, culture, and property issues.', category: 'lifestyle', tags: ['expats', 'relocation', 'tips'] },
  { title: 'Best Balkan Beach Towns to Call Home', excerpt: 'Explore the most beautiful and livable beach towns in the Balkans for long-term residence or investment.', category: 'lifestyle', tags: ['beaches', 'towns', 'living'] },
  { title: 'Living in Belgrade vs Zagreb vs Athens: An Expat\'s Property Perspective', excerpt: 'Compare major Balkan and Mediterranean cities from an expat\'s viewpoint including cost, lifestyle, and property markets.', category: 'lifestyle', tags: ['cities', 'expats', 'comparison'] },
  { title: 'Why Remote Workers Are Flocking to the Balkans (And Where They\'re Buying)', excerpt: 'Analysis of why digital nomads and remote workers choose the Balkans, with focus on in-demand neighborhoods.', category: 'lifestyle', tags: ['digital', 'nomads', 'remote'] },
  { title: 'Family-Friendly Neighborhoods in the Balkans: Top Picks by Country', excerpt: 'Discover the safest, most family-friendly neighborhoods across the Balkans with schools, parks, and amenities.', category: 'lifestyle', tags: ['family', 'neighborhoods', 'expats'] },
  { title: 'Mountain Living in the Balkans: Best Locations for Nature Lovers', excerpt: 'Guide to purchasing property in Balkan mountain regions for breathtaking scenery and outdoor lifestyle.', category: 'lifestyle', tags: ['mountains', 'nature', 'living'] },

  // Legal & Financial (7)
  { title: 'Property Taxes Across the Balkans: A Country-by-Country Breakdown', excerpt: 'Comprehensive tax analysis for property ownership, rental income, and capital gains across all Balkan countries.', category: 'regulation', tags: ['taxes', 'legal', 'finance'] },
  { title: 'How to Get a Mortgage as a Foreigner in the Balkans', excerpt: 'Guide to obtaining mortgages in Balkan countries as a non-resident, including rates, requirements, and options.', category: 'regulation', tags: ['mortgage', 'finance', 'foreigners'] },
  { title: 'Residency Through Property: Which Balkan Countries Offer Golden Visas?', excerpt: 'Explore residency-by-investment programs in Balkan countries and how property purchase can lead to legal residency.', category: 'regulation', tags: ['visa', 'residency', 'legal'] },
  { title: 'Understanding Notary Fees and Transaction Costs in Balkan Real Estate', excerpt: 'Break down all hidden costs in property transactions including notary fees, taxes, and legal expenses.', category: 'regulation', tags: ['costs', 'transaction', 'legal'] },
  { title: 'How to Verify Property Ownership in the Balkans (Avoiding Title Fraud)', excerpt: 'Essential checks and procedures to verify clean title and avoid property fraud in Balkan real estate transactions.', category: 'regulation', tags: ['legal', 'fraud', 'verification'] },
  { title: 'Tax Implications of Renting Out Your Balkan Property to Tourists', excerpt: 'Guide to tax obligations, VAT, and regulatory requirements when operating short-term rentals in the Balkans.', category: 'regulation', tags: ['rental', 'taxes', 'legal'] },
  { title: 'Inheritance Laws and Property in the Balkans: What Foreign Owners Should Know', excerpt: 'Overview of inheritance rights and tax implications for foreign property owners in Balkan countries.', category: 'regulation', tags: ['legal', 'inheritance'] },

  // Market Trends & News (5)
  { title: 'How Infrastructure Projects Are Changing Balkan Property Values', excerpt: 'Analysis of major infrastructure investments and their impact on local real estate values and development.', category: 'development', tags: ['infrastructure', 'development', 'values'] },
  { title: 'The Impact of Tourism Growth on Coastal Property Prices in the Balkans', excerpt: 'How rising tourism numbers are driving property price increases in Balkan coastal destinations.', category: 'market', tags: ['tourism', 'coastal', 'prices'] },
  { title: 'New Construction vs Renovation in the Balkans: Cost Comparison by Country', excerpt: 'Analyze costs and benefits of buying new construction versus renovating older properties across Balkan countries.', category: 'regulation', tags: ['construction', 'renovation', 'costs'] },
  { title: 'Balkan PropTech: How Technology Is Changing Real Estate in the Region', excerpt: 'Explore emerging property technology platforms and digital innovations transforming Balkan real estate transactions.', category: 'development', tags: ['technology', 'innovation', 'proptech'] },
  { title: 'Short-Term Rental Regulations: What\'s Changing Across the Balkans in 2026', excerpt: 'Update on new short-term rental laws, restrictions, and compliance requirements across Balkan countries.', category: 'regulation', tags: ['rental', 'regulations', 'legal'] },

  // City Spotlights (8)
  { title: 'Budva, Montenegro: From Sleepy Town to Riviera Hotspot', excerpt: 'History and transformation of Budva into a premier Mediterranean destination with booming real estate market.', category: 'lifestyle', country: 'Montenegro', countryCode: 'ME', tags: ['city', 'tourism', 'coastal'] },
  { title: 'Podgorica Real Estate: The Most Undervalued European Capital?', excerpt: 'Analysis of Podgorica\'s property market potential as investors discover value in the Montenegrin capital.', category: 'investment', country: 'Montenegro', countryCode: 'ME', tags: ['city', 'capital', 'investing'] },
  { title: 'Dubrovnik vs Split: Where to Buy Coastal Property in Croatia', excerpt: 'Comparison of two premier Croatian coastal cities, analyzing real estate market conditions and investment potential.', category: 'market', country: 'Croatia', countryCode: 'HR', tags: ['coastal', 'cities', 'comparison'] },
  { title: 'Thessaloniki Property Market: Greece\'s Affordable Second City', excerpt: 'Explore Thessaloniki as an alternative to expensive Athens for real estate investment and quality of life.', category: 'market', country: 'Greece', countryCode: 'GR', tags: ['city', 'market', 'affordability'] },
  { title: 'Saranda, Albania: The Mediterranean\'s Best-Kept Secret', excerpt: 'Discover Saranda\'s emerging property market, tourist potential, and appeal to foreign investors and expats.', category: 'lifestyle', country: 'Albania', countryCode: 'AL', tags: ['city', 'coastal', 'emerging'] },
  { title: 'Novi Sad: Serbia\'s Cultural Capital and Rising Property Market', excerpt: 'Profile of Serbia\'s second-largest city highlighting cultural attractions, lifestyle, and real estate opportunities.', category: 'market', country: 'Serbia', countryCode: 'RS', tags: ['city', 'culture', 'market'] },
  { title: 'Ohrid, North Macedonia: Lake Living at a Fraction of Italian Prices', excerpt: 'Explore Lake Ohrid region\'s stunning properties and why it offers exceptional value compared to Alpine lakes.', category: 'lifestyle', country: 'North Macedonia', countryCode: 'MK', tags: ['lake', 'city', 'value'] },
  { title: 'Plovdiv, Bulgaria: Europe\'s Oldest City and Newest Property Hotspot', excerpt: 'History, culture, and booming real estate market make Plovdiv an emerging hot destination for smart investors.', category: 'market', country: 'Bulgaria', countryCode: 'BG', tags: ['city', 'history', 'emerging'] },

  // Practical How-To's (6)
  { title: 'How to Renovate a Stone House in the Balkans (Costs, Permits, Pitfalls)', excerpt: 'Complete guide to renovating historic stone properties in the Balkans including permits, costs, and contractor tips.', category: 'guide', tags: ['renovation', 'costs', 'guide'] },
  { title: 'Setting Up Your Balkan Property as a Holiday Rental: A Complete Guide', excerpt: 'Step-by-step guide to launching and managing a successful short-term rental property in the Balkans.', category: 'guide', tags: ['rental', 'management', 'guide'] },
  { title: 'How to Find a Trustworthy Real Estate Agent in the Balkans', excerpt: 'Tips for selecting reliable real estate agents in the Balkans and avoiding scams and unethical practices.', category: 'guide', tags: ['agents', 'tips', 'guide'] },
  { title: 'Property Inspection Checklist: What to Look for When Buying in the Balkans', excerpt: 'Comprehensive pre-purchase inspection checklist specific to Balkan properties and common regional issues.', category: 'guide', tags: ['inspection', 'buying', 'checklist'] },
  { title: 'How to Manage Your Balkan Property Remotely', excerpt: 'Systems and tools for managing rental properties from abroad, including hiring managers and monitoring maintenance.', category: 'guide', tags: ['management', 'remote', 'guide'] },
  { title: 'Opening a Bank Account in the Balkans for Property Transactions', excerpt: 'Practical guide to opening business or personal bank accounts in Balkan countries for property investment purposes.', category: 'guide', tags: ['banking', 'finance', 'guide'] },

  // Comparison & Listicle (5)
  { title: '10 Cheapest Places to Buy a Sea-View Apartment in Europe (Most Are in the Balkans)', excerpt: 'Top 10 budget-friendly European coastal locations where you can buy waterfront apartments affordably in the Balkans.', category: 'market', tags: ['beaches', 'affordable', 'comparison'] },
  { title: 'Balkans vs Portugal/Spain: Why Savvy Investors Are Looking East', excerpt: 'Investment comparison showing why the Balkans offer better value and returns than traditional Western European destinations.', category: 'investment', tags: ['investing', 'comparison', 'value'] },
  { title: 'Before & After: Stunning Balkan Property Renovations', excerpt: 'Showcase of impressive property renovations across the Balkans with before/after photos and renovation details.', category: 'lifestyle', tags: ['renovation', 'inspiration', 'stories'] },
  { title: 'The 7 Best Islands to Buy Property in Greece and Croatia', excerpt: 'Guide to the most desirable Greek and Croatian islands with best investment potential and lifestyle appeal.', category: 'lifestyle', tags: ['islands', 'greece', 'croatia'] },
  { title: 'Top 10 Mistakes Foreigners Make When Buying Balkan Real Estate', excerpt: 'Learn from others\' mistakes: common pitfalls, legal issues, and financial errors to avoid when buying in the Balkans.', category: 'guide', tags: ['tips', 'mistakes', 'buying'] },
  { title: '5 Balkan Properties Under 50,000 EUR That Are Actually Worth It', excerpt: 'Curated list of affordable properties under 50K EUR in the Balkans that offer real value and investment potential.', category: 'market', tags: ['affordable', 'properties', 'deals'] },
];

const seedArticles = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    // Check if articles already exist
    const count = await Article.countDocuments({});
    if (count > 0) {
      console.log(`Database already has ${count} articles. Skipping seed.`);
      process.exit(0);
    }

    // Create a default admin user ID (you should replace this with an actual admin ID)
    const adminUserId = new mongoose.Types.ObjectId();

    // Helper: generate slug from title
    const generateSlug = (title: string): string => {
      const baseSlug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      const shortId = Math.random().toString(36).substring(2, 8);
      return `${baseSlug}-${shortId}`;
    };

    // Insert articles one by one using .save() to trigger pre-save hooks,
    // or generate slugs manually for insertMany (faster)
    const articles = ARTICLE_IDEAS.map((idea) => {
      const content = `<p>This is a placeholder article for: ${idea.title}</p><p>Full content to be added later.</p>`;
      const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = plainText ? plainText.split(' ').length : 0;
      return {
        ...idea,
        slug: generateSlug(idea.title),
        author: adminUserId,
        status: 'draft',
        content,
        readTime: Math.max(1, Math.ceil(wordCount / 200)),
        viewCount: 0,
        isFeatured: false,
      };
    });

    const result = await Article.insertMany(articles);
    console.log(`Successfully seeded ${result.length} article ideas`);

    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding articles:', err);
    process.exit(1);
  }
};

seedArticles();
