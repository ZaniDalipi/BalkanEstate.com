# BalkanEstateAI.com - Feature Gap Analysis & Recommendations

> Comprehensive review comparing current features against top real estate platforms
> (Zillow, Rightmove, Idealista, ImmobilienScout24, Redfin, Trulia, Nekretnine.rs, Njuskalo.hr, Halooglasi)

---

## Table of Contents

1. [Property Listing Details](#1-property-listing-details)
2. [Agency Profiles](#2-agency-profiles)
3. [Agent Profiles](#3-agent-profiles)
4. [Search & Discovery](#4-search--discovery)
5. [User Features](#5-user-features)
6. [Communication & Scheduling](#6-communication--scheduling)
7. [Maps & Location](#7-maps--location)
8. [Reviews & Ratings](#8-reviews--ratings)
9. [Analytics & Insights](#9-analytics--insights)
10. [Neighborhood & Community](#10-neighborhood--community)
11. [Financial Tools](#11-financial-tools)
12. [Mobile-Specific Features](#12-mobile-specific-features)
13. [Balkan-Market Specific](#13-balkan-market-specific)
14. [Priority Recommendations](#14-priority-recommendations)

---

## 1. Property Listing Details

### What We Have
- Core fields: title, description, price, address, city, country
- Types: house/apartment/villa/land/other, sale/rent
- Features: beds, baths, livingRooms, sqft, yearBuilt, parking
- Condition, energy rating, furnishing, heating type, orientation, view type
- Amenities: balcony, garden, elevator, security, AC, pool, pets allowed
- Distances: to center, sea, school, hospital
- Media: images (with tags), videos, 360 tours, floor plans, generated videos
- Rental: rent period, security deposit, lease duration, max occupants, rental history
- Promotion tiers, urgent badge
- Visit availability scheduling

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Price per square meter** (auto-calculated and displayed) | ImmobilienScout24, Halooglasi, all European platforms | Standard metric in Balkan/European markets. Buyers compare properties by price/sqm. Should be auto-calculated from price and sqft, and displayed prominently on listings and search results. |
| 2 | **Monthly fees / HOA / maintenance costs** | Zillow, Rightmove, ImmobilienScout24 | Critical for apartments - buyers need to know total monthly cost beyond mortgage/rent. Add fields: `monthlyMaintenanceFee`, `monthlyUtilitiesEstimate`. |
| 3 | **Floor number & total floors** | ImmobilienScout24, Halooglasi, Nekretnine.rs | Standard for apartment listings in Balkans. We have no `floor` or `totalFloors` field. Very important for apartment buyers. |
| 4 | **Construction status** | Nekretnine.rs, Idealista | Pre-construction, under construction, completed. New builds are a massive market in the Balkans. Add `constructionStatus` field. |
| 5 | **Legal/ownership information** | All professional platforms | Ownership type (freehold/leasehold), any encumbrances, building permits status, cadastral reference. Important in Balkan markets where property ownership verification is crucial. |
| 6 | **Lot/plot size** (separate from living area) | Zillow, Rightmove, all platforms | For houses and land, the plot size is separate from the building area. Add `lotSize` field. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 7 | **Architectural style** | Zillow, Rightmove | Altbau/Neubau distinction matters in Balkans. Add architectural style: modern, traditional, Mediterranean, socialist-era, etc. |
| 8 | **Accessibility features** | Zillow, Rightmove | Wheelchair access, step-free entrance, wide doorways. Growing importance and can be a key filter. |
| 9 | **Smart home features** | Zillow | Smart thermostat, video doorbell, smart lighting. Emerging in Balkan new-builds. |
| 10 | **Green/sustainability features** | Rightmove, ImmobilienScout24 | Solar panels, insulation grade, energy-efficient windows. Goes beyond energy rating to specific features. |
| 11 | **Storage spaces** | ImmobilienScout24, Rightmove | Basement, attic, storage unit. Common in European apartments (cellar/storage in building). |
| 12 | **Internet/connectivity info** | ImmobilienScout24 | Fiber availability, internet speed. Increasingly important for remote workers. We have `internetIncluded` for rentals but no speed/type info. |
| 13 | **Noise level / exposure** | ImmobilienScout24 | Near main road, train tracks, airport. Important for quality of life assessment. |
| 14 | **AI-generated property tags from images** | Realtor.com, Rightmove | Auto-detect features like "exposed brick", "open plan kitchen", "high ceilings" from listing photos using AI. |
| 15 | **Virtual staging / AI room restyling** | Rightmove (Style with AI) | Let users virtually restyle empty or dated rooms in different design themes. Differentiating feature. |

#### LOWER PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 16 | **Drone/aerial footage support** | Zillow (SkyTour) | Dedicated aerial media type for properties with land or views. |
| 17 | **Interactive 3D floor plans** | Rightmove, Idealista | Not just static floor plan images, but interactive walkable 3D floor plans. |
| 18 | **Engagement metrics visible to buyers** | Zillow | Show "X people viewed this property" or "Y saves" to create urgency. |

---

## 2. Agency Profiles

### What We Have
- Name, description, email, phone, address, city, country
- Logo, cover image
- Website, social media links (Facebook, Instagram, LinkedIn, Twitter)
- Specialties, certifications, languages, years in business
- Agent roster management
- Subscription system, coupon system
- Stats: total/active/sold listings, total agents, revenue
- Business hours, featured status, achievements
- View statistics

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Client reviews and overall rating** | Zillow, Rightmove, all major platforms | No review/rating system for agencies. Buyers need trust signals. Add aggregate rating from client reviews, displayed prominently. |
| 2 | **Recent sales showcase** | Zillow, Redfin | Showcase recently sold/rented properties with sale price. Proves track record. Separate from current stats. |
| 3 | **Response time indicator** | Zillow, Idealista | "Typically responds within 2 hours." Calculated from actual messaging data. Builds trust and sets expectations. |
| 4 | **Service area map** | Zillow, Rightmove | Visual map showing areas where agency operates, not just a text list. |
| 5 | **Company video / intro video** | Idealista, Rightmove | Allow agencies to upload an introduction video. More personal than logo + text. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 6 | **Team member highlight** | Zillow, Redfin | Highlight top-performing agents with photos, specialties, and reviews on agency page. We have agent roster, but no "featured team" display. |
| 7 | **Active listings showcase on profile** | All platforms | Show agency's active listings directly on their profile page with filters. |
| 8 | **Market insights / blog content** | Rightmove, Zillow | Allow agencies to publish market insights, blog posts, or reports. Positions them as local experts. |
| 9 | **Awards and recognitions** | Rightmove | Dedicated section for industry awards (beyond generic achievements). |
| 10 | **Commission/fee transparency** | Redfin | Display commission rates or fee structure. Growing trend toward transparency. |

---

## 3. Agent Profiles

### What We Have
- Profile with testimonials, credentials, specializations
- View statistics, languages, service areas
- Saved agents functionality

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Verified client reviews with star ratings** | Zillow, Redfin, Rightmove | Our testimonials are agent-submitted. Need verified reviews from actual clients who transacted with the agent. Include star ratings (1-5) with categories (communication, market knowledge, negotiation, responsiveness). |
| 2 | **Transaction history / homes sold count** | Zillow, Redfin | "15 homes sold in 2025." Quantifiable track record. Our `SalesHistory` model exists but isn't exposed on profiles. |
| 3 | **Active listings on agent profile** | All platforms | Show the agent's current active listings directly on their profile. |
| 4 | **Response time / availability indicator** | Zillow, Idealista | "Usually responds in 1 hour" or "Available now." Based on actual response data. |
| 5 | **Review request system** | Zillow | Allow agents to request reviews from past clients (email link). Zillow allows up to 50/day. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 6 | **Video introduction** | Zillow, Rightmove | Short personal video on agent profile. More engaging than photo + bio. |
| 7 | **Areas of expertise map** | Zillow, Redfin | Visual map of neighborhoods the agent specializes in. |
| 8 | **Professional timeline** | LinkedIn-style | Career history: when started, agencies worked at, transactions completed per year. |
| 9 | **Social proof badges** | Zillow (Premier Agent) | "Top Agent 2025", "Fast Responder", "100+ Reviews" badges on profile. |
| 10 | **Client compatibility quiz** | Emerging trend | Match buyers with agents based on preferences, communication style, specialties. |

---

## 4. Search & Discovery

### What We Have
- Advanced filtering (location, price, beds/baths, amenities, property type, agent type)
- Map-based searching with drawn bounds
- Location radius searching
- Price range, property type, condition, energy rating filters
- Saved searches with alert frequency settings
- Sorting options
- Rental-specific search page

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Natural language / AI-powered search** | Zillow, Redfin, Rightmove, Realtor.com | "3-bedroom apartment near university with parking under 80,000 EUR" or "cozy apartment with exposed brick and balcony." Major competitive differentiator in 2025-2026. All top platforms have launched this. |
| 2 | **Price per sqm filter** | ImmobilienScout24, Halooglasi | Filter by price per square meter range. Standard in European markets. |
| 3 | **Floor number filter** | ImmobilienScout24, Halooglasi, Nekretnine.rs | "1st floor or higher", "top floor only." Crucial for Balkan apartment markets. |
| 4 | **Days on market filter** | Zillow, Redfin | "Listed in last 24 hours / 3 days / 7 days / 30 days." Helps buyers find new or stale listings. |
| 5 | **Price reduced / price drop filter** | Zillow, Redfin | Show only properties where price was recently reduced. Popular filter for bargain hunters. |
| 6 | **Recently viewed properties** | Halooglasi, all major platforms | Show user's recently viewed properties (last 10-20). Halooglasi keeps last 10. We have no recently viewed tracking. |
| 7 | **Multiple view modes** | Halooglasi, Idealista | List view, gallery/grid view, map view. Allow users to switch between display modes. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 8 | **Open house / viewing available filter** | Zillow, Trulia | Filter for properties with upcoming open house or viewing slots available. |
| 9 | **New construction filter** | Zillow, Idealista | Separate filter for new builds vs. resale. |
| 10 | **Swipeable photos in search results** | Rightmove, ImmobilienScout24 | Preview multiple photos in search results without opening the listing. Increases engagement. |
| 11 | **Hide/dismiss listings** | ImmobilienScout24 | Let users hide properties they're not interested in from future results. Reduces noise. |
| 12 | **Multi-area search** | Halooglasi | Search in multiple separate areas at once (e.g., two different neighborhoods). |
| 13 | **Smart sort options** | Zillow, Redfin | Sort by "best match" (personalized), "most popular", "newest" in addition to price. |

---

## 5. User Features

### What We Have
- Multi-role system (buyer/seller/agent/admin)
- Save/favorite properties with price alerts
- Saved searches with filters and alert settings (instant/daily/weekly)
- Property comparison (side-by-side)
- Profile management, avatar, email preferences
- Notifications (listing milestones, trending, promotions, messages, inquiries)
- Mortgage calculator

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Notes on saved properties** | Zillow, Realtor.com | Let users add personal notes to saved properties ("loved the kitchen", "too far from school"). Currently favorites have no annotation. |
| 2 | **Recently viewed history** | All major platforms | Track and display recently viewed properties. Missing entirely. |
| 3 | **Personalized recommendations** | Zillow, Redfin, Rightmove | AI-driven "Recommended for you" based on search history, saved properties, and viewing patterns. |
| 4 | **Status change alerts** | Zillow, Redfin | Notify when a favorited property status changes (price drop, marked as sold/rented, back on market). Our `PropertyAlert` model exists but is limited. |
| 5 | **Shareable favorites/collections** | Zillow | Share a list of saved properties with family/partner via link. Collaborative house hunting. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 6 | **Enhanced comparison tool** | Zillow (70+ fields) | Our comparison exists but Zillow compares up to 70+ details side-by-side with charts. We should expand comparison fields. |
| 7 | **Property collections/folders** | Trulia | Organize saved properties into folders ("Downtown options", "Houses with garden"). Beyond a flat favorites list. |
| 8 | **Email digest customization** | All platforms | Custom frequency (daily/weekly/monthly) digest of market updates, price changes, new matches. We have some email preferences but could expand. |
| 9 | **Cross-device synchronization** | Halooglasi | Explicit sync of searches, favorites, and recently viewed across devices. We have auth-based sync but could highlight it. |
| 10 | **Buying Power / affordability calculator** | Zillow, Redfin | "Based on your income and down payment, you can afford up to X." More than a mortgage calculator. |

---

## 6. Communication & Scheduling

### What We Have
- Real-time messaging (Socket.io)
- E2E encrypted messages
- Image support in messages
- Sensitive info filtering
- Property inquiry forms (property/agent/area-search/contact)
- Viewing scheduling with time slots
- 30-day conversation auto-expiration

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **WhatsApp / Viber integration** | Idealista, common in Balkans | WhatsApp and Viber are dominant communication channels in the Balkans. Add click-to-WhatsApp/Viber buttons on listings and agent profiles. |
| 2 | **Automated viewing reminders** | Zillow (ShowingTime) | Email/push/SMS reminders before scheduled viewings. Our Viewing model exists but no automated reminders. |
| 3 | **Viewing confirmation/cancellation flow** | Zillow (ShowingTime) | Proper status flow for viewings: requested -> confirmed -> completed/cancelled/no-show with notifications at each step. |
| 4 | **Click-to-call with tracking** | All platforms | Display phone number with click-to-call button. Track call attempts for analytics. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 5 | **Video call / virtual viewing** | Emerging (post-COVID) | Integrated video call for remote viewings. Important for diaspora buyers who can't visit in person. |
| 6 | **Automated tour route planning** | Realtor.com | When a user has multiple viewings scheduled, auto-plan an optimal route between properties. |
| 7 | **Offer submission tools** | Zillow, Redfin | Submit a formal offer through the platform with price, conditions, timeline. Currently only informal inquiries. |
| 8 | **Document sharing** | Realtor.com (DocuSign) | Share and sign contracts, agreements within the platform. |
| 9 | **Agent-client shared workspace** | Realtor.com+ | Shared search activity where agent and client can see each other's saved properties and notes. |
| 10 | **Read receipts and typing indicators** | Standard messaging | Our messaging has unread counts but no read receipts or typing indicators. |

---

## 7. Maps & Location

### What We Have
- Google Maps API + Leaflet integration
- Property pins on map
- Draw-on-map boundary search
- Marker clustering
- Distances to center, sea, school, hospital (stored as property fields)

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Nearby amenities map layer** | Njuskalo, Trulia, Zillow | Toggle overlay showing schools, shops, restaurants, hospitals, parks, gyms near a property. Njuskalo's implementation is excellent - toggle categories on/off. |
| 2 | **Walk Score / Transit Score / Bike Score** | Zillow, Trulia, Redfin | Standardized walkability, transit access, and bikeability scores. Major factor in buying decisions. |
| 3 | **Commute time / travel time calculator** | Zillow, Trulia | "How long does it take to get to [custom address] by car/transit/walking?" from a property. |
| 4 | **Street view integration** | Rightmove, Zillow | Google Street View embedded directly on property detail page. |
| 5 | **Price heatmap** | ImmobilienScout24 (Pricemap) | Color-coded map showing average prices per sqm by area. Helps buyers identify affordable neighborhoods. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 6 | **School zone boundaries** | Rightmove (School Checker), Trulia | Show school catchment areas on map with school ratings. |
| 7 | **Public transport stops layer** | ImmobilienScout24, Rightmove | Show bus stops, tram stations, metro stations near property. |
| 8 | **Comparable sales on map** | Zillow, Redfin | Show recently sold properties near the listing with their sale prices on the map. |
| 9 | **Flood risk / environmental layers** | Rightmove | Environmental risk data overlays (flooding, earthquake zones - relevant for Balkans). |
| 10 | **Satellite view toggle** | Zillow | Switch between map, satellite, and hybrid views. |

---

## 8. Reviews & Ratings

### What We Have
- Agent testimonials (agent-submitted)
- Agency achievements
- No verified review system

### What's Missing

#### HIGH PRIORITY - This is a Major Gap

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Verified client review system** | Zillow, Redfin, Rightmove, all major platforms | This is the single biggest missing feature. No verified review system for agents or agencies. Trust is everything in real estate. Need: verified reviews tied to actual transactions, star ratings, category ratings, review moderation. |
| 2 | **Star rating system** | All platforms | Overall rating + category ratings (communication, market knowledge, negotiation skill, responsiveness, professionalism). Display on search results and profiles. |
| 3 | **Review response by agents/agencies** | Zillow, Google | Allow agents and agencies to respond publicly to reviews. Shows engagement and professionalism. |
| 4 | **Review request system** | Zillow | Agents can send review request links to past clients. Drives review volume. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 5 | **Neighborhood reviews** | Trulia (55M+ reviews) | "What Locals Say" - resident reviews of neighborhoods covering safety, noise, walkability, community feel. Very unique and valuable. |
| 6 | **Building/complex reviews** | Emerging | For apartment buildings: reviews of building management, common areas, noise levels, neighbors. |
| 7 | **Review verification badges** | Zillow | "Verified Client" badge on reviews from confirmed transactions. |
| 8 | **Review analytics** | Zillow | Agent/agency dashboard showing review trends, sentiment, and areas for improvement. |

---

## 9. Analytics & Insights

### What We Have
- View counts, save counts, inquiry counts
- Weekly and monthly analytics
- Agency team statistics
- Property price history tracking
- AI-powered property valuation
- City market data

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Real-time seller dashboard** | Redfin | Beyond basic counts. Show: where views are coming from, peak viewing times, how listing compares to similar listings, conversion funnel (views -> saves -> inquiries -> viewings). |
| 2 | **Days on market benchmarking** | Zillow, Redfin | "Your property has been listed 15 days. Average for similar properties is 22 days." Context for sellers. |
| 3 | **Comparable property analysis** | Zillow, Redfin | Auto-generated list of comparable recently sold/listed properties with prices, showing how the listing compares. |
| 4 | **Market trends by neighborhood** | Zillow, Rightmove, ImmobilienScout24 | Price trend charts (1 year, 5 years), average price per sqm, inventory levels, time to sell - by city and neighborhood. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 5 | **Lead quality scoring** | Zillow, Redfin | For agents: score incoming inquiries by likelihood to convert based on user behavior (verified, active searcher, financing in place). |
| 6 | **Search demand insights** | Rightmove | Show sellers/agents what buyers are searching for in their area. "Most searched: 2-bed apartments under 60k EUR." |
| 7 | **Competitive analysis** | Zillow (Offer Insights) | How does a listing's price compare to similar active and recently sold listings? Am I priced competitively? |
| 8 | **ROI calculator for investors** | ImmobilienScout24 | Rental yield calculator, cap rate, cash-on-cash return for investment properties. |

---

## 10. Neighborhood & Community

### What We Have
- City recommendations
- Neighborhood insights (basic)
- Distances to key amenities (stored per property)

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Comprehensive neighborhood profiles** | Trulia, Zillow | Dedicated neighborhood pages with: demographics, average prices, price trends, amenity density, transportation, schools, safety data, photos, character description. |
| 2 | **AI-generated location guides** | Rightmove (AI Location Tool, Feb 2025) | AI-written guides for each neighborhood covering green spaces, transport, restaurants, fitness, schools, shopping. Powered by Google Gemini - we already use Google Generative AI. |
| 3 | **Local amenity counts** | Trulia | "15 restaurants within 1 km", "3 schools within 500m", "2 parks within walking distance." Concrete data. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 4 | **Resident reviews / "What Locals Say"** | Trulia | Polls and reviews from actual residents about neighborhood qualities: noise, safety, community feel, nightlife. |
| 5 | **Demographic data** | Trulia, Zillow | Population, age distribution, average income, education levels by neighborhood. |
| 6 | **Local news / market updates** | Rightmove | Curated local news about developments, infrastructure projects, market trends per area. |
| 7 | **Neighborhood comparison** | Trulia | Compare two neighborhoods side by side on key metrics (price, safety, walkability, schools). |

---

## 11. Financial Tools

### What We Have
- Mortgage calculator
- AI property valuation
- Price history tracking
- Subscription/payment system

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Affordability calculator** | Zillow (Buying Power), Redfin | "Based on income X and down payment Y, you can afford properties up to Z." More useful than raw mortgage calculator. |
| 2 | **Total cost of ownership breakdown** | Zillow, Rightmove | Monthly: mortgage + maintenance fees + utilities + insurance + property tax = total monthly cost. Full picture for buyers. |
| 3 | **Rental yield calculator** | ImmobilienScout24 | For investors: input purchase price, expected rent, expenses -> calculate annual yield, ROI, payback period. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 4 | **Rent vs. buy comparison** | Zillow, Trulia | Calculator showing when buying becomes cheaper than renting for a specific property/area. |
| 5 | **Currency converter** | Important for Balkans | Show prices in multiple currencies (EUR, RSD, BAM, USD). Essential for diaspora buyers. |
| 6 | **Mortgage pre-qualification integration** | Zillow, Redfin | Connect with banks for mortgage pre-approval. Shows sellers the buyer is serious. |
| 7 | **Price prediction / forecast** | Zillow (Zestimate forecast) | AI-predicted property value in 1 year. Based on market trends and comparable sales. |

---

## 12. Mobile-Specific Features

### What We Have
- PWA support (Vite PWA Plugin, Workbox)
- Responsive design

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **GPS "nearby me" property search** | Halooglasi, Idealista | Use phone GPS to show properties within a radius of current location. "Show me properties near me right now." |
| 2 | **Push notifications** | All platforms | New listing matches, price changes, message notifications, viewing reminders as push notifications. PWA supports this but needs implementation. |
| 3 | **Offline saved properties** | Best practice | Cache saved/favorited properties for offline viewing. Important in areas with poor connectivity. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 4 | **Camera integration for listing photos** | Zillow, Idealista | Take and upload property photos directly from phone camera within the listing form. |
| 5 | **Home screen widget** | Zillow, Redfin | Widget showing new matches or price updates without opening the app. |
| 6 | **QR code for property sharing** | Emerging | Generate QR code for a listing to share at open houses or in print. |
| 7 | **Touch ID / Face ID** | All native apps | Biometric authentication for quick login. |
| 8 | **AR room visualization** | Zillow, emerging | View furniture placement or room modifications through phone camera. Future-forward feature. |

---

## 13. Balkan-Market Specific

### What We Have
- Multi-language support (i18next)
- Multi-country coverage
- Agency vs private seller distinction

### What's Missing

#### HIGH PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 1 | **Multi-currency display** | Standard for multi-country platforms | Show prices in EUR + local currency (RSD, BAM, MKD, ALL). Users from different Balkan countries use different currencies. Auto-convert based on user location. |
| 2 | **Cadastral / land registry reference** | Balkan requirement | Link to or reference cadastral/land registry records. Critical for property verification in Balkan markets where ownership disputes are common. |
| 3 | **Building permit status** | Balkan requirement | Legal status of the building (legalized, in legalization process, has permits). Illegal construction is a significant issue in Balkan countries. |
| 4 | **Diaspora buyer tools** | No direct competitor does this well | Dedicated features for Balkan diaspora in Germany, Austria, Switzerland, Scandinavia: video viewings, international mortgage info, legal guidance for foreign buyers, trusted agent matching. This is a massive untapped market. |

#### MEDIUM PRIORITY

| # | Missing Feature | Who Has It | Why It Matters |
|---|----------------|-----------|----------------|
| 5 | **Utility connection info** | Local requirement | Confirm connections: water, electricity, gas, sewage, central heating. Not guaranteed in all Balkan properties. |
| 6 | **Distance to border crossings** | Relevant for border areas | For properties near country borders (common in Balkans), show distances to border crossings. |
| 7 | **Tourist rental potential** | Airbnb data integration | For coastal/tourist areas, show estimated tourist rental income. Major investment driver in Croatia, Montenegro, Albania. |
| 8 | **Regional legal guides** | Needed per country | Legal requirements for buying property in each Balkan country (differ significantly). Guide for foreign vs. local buyers. |

---

## 14. Priority Recommendations

### Tier 1 - Implement First (Biggest Impact)

These features address the most significant gaps and would bring the platform to parity with competitors:

1. **Verified Review & Rating System** (agents + agencies)
   - Currently the platform has zero verified reviews. This is the #1 trust signal in real estate.
   - Model: 1-5 star ratings with categories + text review + verification badge
   - Affects: Agent profiles, agency profiles, search results rankings

2. **Price per Square Meter**
   - Auto-calculate and display on all listings and search results
   - Add as a filter in search
   - Standard in every European/Balkan real estate platform

3. **Floor Number & Total Floors**
   - Add `floor` and `totalFloors` to property model
   - Add as search filter
   - Critical for the apartment-dominated Balkan market

4. **Recently Viewed Properties**
   - Track and display last 10-20 viewed properties
   - Every competitor has this; it's table stakes

5. **Nearby Amenities Map Layer**
   - Toggle overlays for schools, restaurants, shops, transport, parks, hospitals
   - Model after Njuskalo's implementation
   - Uses existing Google Maps integration

6. **Multi-Currency Display**
   - Auto-convert prices based on user's country
   - Support EUR, RSD, BAM, MKD, ALL, USD
   - Essential for multi-country Balkan platform

### Tier 2 - Implement Next (Strong Differentiators)

7. **Natural Language / AI Search**
   - We already use Google Generative AI; leverage it for search
   - "2-bedroom apartment near park under 50000 EUR in Belgrade"
   - Major competitive differentiator; all top platforms launched this in 2024-2025

8. **Comprehensive Neighborhood Profiles**
   - AI-generated location guides (leverage existing Google AI integration)
   - Demographics, amenities, price trends, transport links
   - Trulia-style neighborhood pages

9. **WhatsApp / Viber Integration**
   - One-click contact via WhatsApp/Viber on listings and agent profiles
   - Dominant communication channels in Balkans

10. **Monthly Costs Breakdown**
    - Maintenance fees, utility estimates, total monthly cost
    - Help buyers understand true cost of ownership

11. **Construction Status & Legal Info**
    - Pre-construction / under construction / completed
    - Building permit status, cadastral reference
    - Addresses real Balkan market needs

12. **Days on Market Filter + Price Drop Filter**
    - Simple to implement, high-value filters
    - Help buyers find opportunities

### Tier 3 - Future Roadmap (Innovation & Differentiation)

13. **Diaspora Buyer Tools** - Video viewings, international mortgage info, legal guides
14. **Walk Score / Transit Score** - Walkability metrics
15. **Price Heatmap** - ImmobilienScout24's Pricemap model
16. **AI Virtual Staging** - Rightmove's "Style with AI"
17. **Collaborative Search** - Realtor.com+ shared workspace
18. **Rental Yield Calculator** - For investment properties
19. **Offer Submission Tools** - Formal offer flow through platform
20. **Neighborhood Reviews** - Trulia's "What Locals Say"

---

## Summary Statistics

| Category | Features We Have | Features Missing | Coverage |
|----------|-----------------|-----------------|----------|
| Property Details | 35+ fields | 18 features | ~65% |
| Agency Profiles | 20+ fields | 10 features | ~65% |
| Agent Profiles | 10+ fields | 10 features | ~50% |
| Search & Discovery | 15+ filters | 13 features | ~55% |
| User Features | 10+ features | 10 features | ~50% |
| Communication | 6 features | 10 features | ~40% |
| Maps & Location | 4 features | 10 features | ~30% |
| Reviews & Ratings | 1 feature (testimonials) | 8 features | ~10% |
| Analytics & Insights | 6 features | 8 features | ~45% |
| Neighborhood | 2 features | 7 features | ~25% |
| Financial Tools | 2 features | 7 features | ~25% |
| Mobile | 2 features | 8 features | ~20% |
| Balkan-Specific | 3 features | 8 features | ~30% |

**Overall estimated feature coverage vs. market leaders: ~40%**

The platform has a strong technical foundation (real-time messaging, E2E encryption, promotion system, multi-role auth, payment integrations) but is missing many user-facing features that build trust (reviews), aid decision-making (neighborhood data, financial tools), and improve discovery (AI search, better filters, map layers).
