# Database Seeding Instructions

## Agency Banners Setup

To see the agency advertising banners in the application, you need to seed the database with sample agencies.

### Prerequisites

1. **MongoDB must be running**
   - Local: `mongod` or start MongoDB service
   - Cloud: Ensure your connection string in `.env` is correct

2. **Environment Variables**
   Create a `.env` file in the `backend` directory with your MongoDB connection:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/balkan-estate
   # For local MongoDB:
   # MONGODB_URI=mongodb://localhost:27017/balkan-estate

   JWT_SECRET=your-secret-key-here
   PORT=5000
   ```

   **Important Security Notes:**
   - Special characters in passwords must be URL-encoded:
     - `!` = `%21`, `@` = `%40`, `#` = `%23`, `$` = `%24`, `%` = `%25`
   - The `.env` file is in `.gitignore` and will NOT be committed to GitHub
   - Never share your MongoDB credentials publicly
   - Copy `.env.example` and rename it to `.env` with your actual credentials

### Seeding Agencies

```bash
cd backend
npm run seed:agencies
```

### What This Creates

The seed script will create **8 featured agencies** from Balkan countries:

1. 🇷🇸 **Serbia** - Belgrade Premium Properties
2. 🇭🇷 **Croatia** - Zagreb Elite Estates
3. 🇧🇬 **Bulgaria** - Sofia Property Group
4. 🇷🇴 **Romania** - Bucharest Luxury Homes
5. 🇦🇱 **Albania** - Tirana Property Solutions
6. 🇲🇰 **North Macedonia** - Skopje Real Estate Partners
7. 🇽🇰 **Kosovo** - Pristina Urban Realty
8. 🇧🇦 **Bosnia** - Sarajevo Premier Estates

Each agency includes:
- Professional logo and cover image
- Complete contact information
- Business description and specialties
- Certifications
- SEO-friendly URL slug (e.g., `serbia,belgrade-premium-properties`)
- Enterprise-tier owner account

### Where Banners Appear

After seeding, agency banners will appear on:
- **Saved Searches** page
- **Saved Properties** page
- **Top Agents** page

Banners automatically rotate every 10 seconds and users can click "View Agency" to see the full agency profile.

### Agency URLs

Agencies can be accessed via:
- By ID: `/api/agencies/[agency-id]`
- By Slug: `/api/agencies/serbia,belgrade-premium-properties`

Frontend will display at: `/agency-serbia,belgrade-premium-properties`

### Troubleshooting

**Error: `MongooseServerSelectionError`**
- MongoDB is not running. Start your MongoDB service.

**Error: `No featured agencies available`**
- Run the seed script: `npm run seed:agencies`
- Check your MongoDB connection in `.env`

**Banners not showing:**
1. Open browser console (F12)
2. Look for errors in the console
3. Check Network tab for failed API calls to `/api/agencies/featured/rotation`

### Resetting Data

To clear and re-seed:
```bash
# The seed script automatically clears existing agencies before inserting new ones
npm run seed:agencies
```

### Owner Account Credentials

Each agency gets an owner account created:
- **Email**: `owner[1-8]@[agency-domain]`
- **Password**: `password123` (change in production!)
- **Role**: Agent with Enterprise tier
- **Permissions**: Can manage their agency and approve join requests

Example:
- Email: `owner1@belgradepremium.rs`
- Password: `password123`
