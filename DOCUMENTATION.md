# Balkan Estate - Complete Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Internationalization (i18n)](#internationalization-i18n)
7. [SEO Configuration](#seo-configuration)
8. [Database Schema](#database-schema)
9. [Authentication & Security](#authentication--security)
10. [Deployment Guide](#deployment-guide)
11. [Environment Variables](#environment-variables)
12. [API Endpoints](#api-endpoints)
13. [Key Features](#key-features)
14. [Development Commands](#development-commands)

---

## Overview

**Balkan Estate** is a full-stack real estate platform serving the Balkans region. It connects property buyers with sellers and real estate agents across 10 countries: Serbia, Montenegro, Croatia, Bosnia and Herzegovina, North Macedonia, Albania, Kosovo, Bulgaria, Romania, and Greece.

### Key Features
- Property search with advanced filters
- Multi-language support (10 languages)
- Agent/Agency directory
- User authentication (buyers, sellers, agents)
- Property listings management
- Mortgage & affordability calculators
- City guides
- Saved properties & favorites
- Real-time messaging
- PWA support

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool & Dev Server |
| Tailwind CSS | 3.x | Styling |
| React Router DOM | 6.x | Client-side Routing |
| react-i18next | 14.x | Internationalization |
| React Helmet Async | 2.x | SEO Meta Tags |
| Leaflet + React-Leaflet | 1.9.4 / 4.2.1 | Interactive Maps |
| Recharts | - | Data Visualization |
| Lucide React | - | Icon Library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x+ | Runtime |
| Express.js | 4.x | Web Framework |
| MongoDB | 6.x+ | Database |
| Mongoose | 8.x | ODM |
| JWT | - | Authentication |
| bcryptjs | - | Password Hashing |
| Multer | - | File Uploads |
| Nodemailer | - | Email Service |
| CORS | - | Cross-Origin Support |

### DevOps & Hosting (Recommended)
| Service | Purpose |
|---------|---------|
| Vercel | Frontend Hosting |
| Railway | Backend Hosting |
| MongoDB Atlas | Database Hosting |
| Cloudinary | Image CDN (optional) |

---

## Project Structure

```
BalkanEstateAI.com/
├── components/                    # React Components
│   ├── AgentsPage/               # Agent-related pages
│   │   ├── AgentCard.tsx
│   │   ├── AgentProfilePage.tsx
│   │   ├── AgentsPage.tsx
│   │   └── ...
│   ├── BuyerFlow/                # Buyer journey components
│   │   ├── PropertyDetails/      # Property detail views
│   │   ├── PropertyDisplay/      # Property cards & grids
│   │   ├── SavedProperties/      # Favorites functionality
│   │   └── Search/               # Search & filters
│   ├── SellerFlow/               # Seller dashboard & listings
│   │   ├── Dashboard/
│   │   ├── ListingForm/
│   │   └── ...
│   ├── shared/                   # Shared/common components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── Agencies/                 # Agency pages
│   ├── Auth/                     # Login/Register
│   ├── Calculators/              # Mortgage & affordability
│   ├── CityGuide/                # City information
│   └── Pricing/                  # Subscription plans
│
├── src/
│   ├── components/
│   │   └── seo/                  # SEO Components
│   │       ├── SEO.tsx           # Main SEO component
│   │       ├── FAQSchema.tsx     # FAQ structured data
│   │       ├── OrganizationSchema.tsx
│   │       └── ...
│   ├── context/                  # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── PropertyContext.tsx
│   │   └── ...
│   ├── hooks/                    # Custom React Hooks
│   ├── i18n/                     # Internationalization
│   │   ├── index.ts              # i18n configuration
│   │   └── locales/              # Translation files
│   │       ├── en/               # English (default)
│   │       ├── sq/               # Albanian
│   │       ├── sr/               # Serbian
│   │       ├── bg/               # Bulgarian
│   │       ├── hr/               # Croatian
│   │       ├── bs/               # Bosnian
│   │       ├── mk/               # Macedonian
│   │       ├── me/               # Montenegrin
│   │       ├── ro/               # Romanian
│   │       └── el/               # Greek
│   ├── services/                 # API service functions
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Utility functions
│
├── server/                       # Backend Server
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/              # Route handlers
│   │   ├── authController.js
│   │   ├── propertyController.js
│   │   ├── agentController.js
│   │   └── ...
│   ├── middleware/               # Express middleware
│   │   ├── auth.js               # JWT verification
│   │   └── errorHandler.js
│   ├── models/                   # Mongoose schemas
│   │   ├── User.js
│   │   ├── Property.js
│   │   ├── Agent.js
│   │   └── ...
│   ├── routes/                   # API routes
│   │   ├── auth.js
│   │   ├── properties.js
│   │   ├── agents.js
│   │   └── ...
│   ├── utils/                    # Server utilities
│   └── server.js                 # Entry point
│
├── public/                       # Static assets
│   ├── icons/                    # PWA icons
│   ├── sitemap.xml               # SEO sitemap
│   ├── robots.txt                # Search engine rules
│   └── manifest.json             # PWA manifest
│
├── index.html                    # HTML entry point
├── index.tsx                     # React entry point
├── App.tsx                       # Main App component
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## Frontend Architecture

### Component Organization

Components follow a feature-based organization:

```
components/
├── Feature/
│   ├── FeaturePage.tsx      # Main page component
│   ├── FeatureCard.tsx      # Reusable card
│   ├── FeatureList.tsx      # List component
│   └── FeatureFilters.tsx   # Filter controls
```

### Routing Structure

Routes are defined in `App.tsx`:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page |
| `/search` | SearchPage | Property search |
| `/property/:id` | PropertyDetails | Property detail view |
| `/agents` | AgentsPage | Agent directory |
| `/agents/:id` | AgentProfilePage | Agent profile |
| `/agencies` | AgenciesPage | Agency directory |
| `/login` | LoginPage | User login |
| `/register` | RegisterPage | User registration |
| `/seller/dashboard` | SellerDashboard | Seller panel |
| `/calculators/mortgage` | MortgageCalculator | Mortgage tool |
| `/calculators/affordability` | AffordabilityCalculator | Budget tool |
| `/city-guide` | CityGuidePage | City information |
| `/pricing` | PricingPage | Subscription plans |
| `/saved-properties` | SavedProperties | User favorites |

### State Management

The app uses React Context for global state:

- **AuthContext**: User authentication state
- **PropertyContext**: Property data and filters
- **LanguageContext**: Current language preference

### Styling

- **Tailwind CSS** for utility-first styling
- Custom color palette defined in `tailwind.config.js`:
  ```js
  colors: {
    primary: {
      DEFAULT: '#0252CD',  // Brand blue
      light: '#E6F0FF',
      dark: '#003A96',
    },
    secondary: '#FFA500',  // Orange accent
    neutral: { 50-900 }    // Gray scale
  }
  ```

---

## Backend Architecture

### Server Structure

```javascript
// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/agencies', require('./routes/agencies'));
app.use('/api/users', require('./routes/users'));

// Error handling
app.use(errorHandler);

mongoose.connect(process.env.MONGODB_URI);
app.listen(process.env.PORT || 5000);
```

### Middleware

- **auth.js**: JWT token verification
- **errorHandler.js**: Centralized error handling
- **upload.js**: Multer file upload handling

---

## Internationalization (i18n)

### Supported Languages

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| sq | Albanian | Shqip |
| sr | Serbian | Српски |
| bg | Bulgarian | Български |
| hr | Croatian | Hrvatski |
| bs | Bosnian | Bosanski |
| mk | Macedonian | Македонски |
| me | Montenegrin | Crnogorski |
| ro | Romanian | Română |
| el | Greek | Ελληνικά |

### Translation Namespaces

Translations are organized by feature:

| Namespace | File | Content |
|-----------|------|---------|
| common | common.json | Shared strings, buttons, labels |
| home | home.json | Homepage content |
| search | search.json | Search page & filters |
| property | property.json | Property details |
| agents | agents.json | Agent pages & profiles |
| agencies | agencies.json | Agency pages |
| auth | auth.json | Login/Register |
| seller | seller.json | Seller dashboard |
| calculator | calculator.json | Calculator tools |
| footer | footer.json | Footer content |
| header | header.json | Header & navigation |
| pricing | pricing.json | Pricing page |
| cityGuide | cityGuide.json | City guide content |
| errors | errors.json | Error messages |
| validation | validation.json | Form validation |
| notifications | notifications.json | Toast messages |
| savedProperties | savedProperties.json | Favorites page |
| filters | filters.json | Filter labels |

### Adding New Translations

1. **Add keys to English file first** (`src/i18n/locales/en/[namespace].json`)
2. **Copy structure to other languages**
3. **Translate values**

Example:
```json
// src/i18n/locales/en/common.json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit"
  }
}

// src/i18n/locales/sq/common.json
{
  "buttons": {
    "save": "Ruaj",
    "cancel": "Anulo",
    "submit": "Dërgo"
  }
}
```

### Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation(['common', 'search']);

  return (
    <div>
      <button>{t('common:buttons.save')}</button>
      <h1>{t('search:title')}</h1>
      {/* With interpolation */}
      <p>{t('search:results', { count: 10 })}</p>
    </div>
  );
};
```

### i18n Configuration

Located in `src/i18n/index.ts`:
- Default language: English
- Fallback: English
- Detection: localStorage > browser language
- Auto-updates HTML `lang` attribute
- Auto-updates `og:locale` meta tag

---

## SEO Configuration

### Meta Tags (index.html)

```html
<!-- Primary Meta Tags -->
<title>Balkan Estate - Find Your Dream Property</title>
<meta name="description" content="..." />
<meta name="keywords" content="Balkan real estate, property..." />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:title" content="..." />
<meta property="og:image" content="/og-image.png" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />

<!-- Hreflang (multi-language) -->
<link rel="alternate" hreflang="en" href="https://balkanestateai.com" />
<link rel="alternate" hreflang="sq" href="https://balkanestateai.com/sq" />
<!-- ... all 10 languages -->
```

### SEO Component

```tsx
// src/components/seo/SEO.tsx
import { Helmet } from 'react-helmet-async';

<SEO
  title="Property Title"
  description="Property description..."
  image="/property-image.jpg"
  url="/property/123"
  type="product"
/>
```

### Structured Data (JSON-LD)

- **OrganizationSchema**: Company information for Google Knowledge Panel
- **FAQSchema**: FAQ rich snippets
- **PropertySchema**: Real estate listing structured data (RealEstateListing)

### Sitemap

Located at `public/sitemap.xml`:
- Homepage with all language alternates
- Search page
- Agent/Agency directories
- Country-specific search pages
- Property type pages
- City guide
- Calculators

### Robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /seller/
Sitemap: https://balkanestateai.com/sitemap.xml
```

---

## Database Schema

### User Model
```javascript
{
  email: String (unique, required),
  password: String (hashed),
  role: ['buyer', 'seller', 'agent', 'admin'],
  firstName: String,
  lastName: String,
  phone: String,
  avatar: String,
  savedProperties: [ObjectId -> Property],
  createdAt: Date,
  updatedAt: Date
}
```

### Property Model
```javascript
{
  title: String,
  description: String,
  price: Number,
  currency: String,
  propertyType: ['apartment', 'house', 'villa', 'land', 'commercial'],
  listingType: ['sale', 'rent'],
  beds: Number,
  baths: Number,
  area: Number,
  yearBuilt: Number,
  address: {
    street: String,
    city: String,
    country: String,
    postalCode: String,
    coordinates: { lat: Number, lng: Number }
  },
  features: [String],
  images: [String],
  agent: ObjectId -> Agent,
  seller: ObjectId -> User,
  status: ['active', 'pending', 'sold', 'rented'],
  views: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Agent Model
```javascript
{
  user: ObjectId -> User,
  agency: ObjectId -> Agency,
  licenseNumber: String,
  specializations: [String],
  languages: [String],
  serviceAreas: [String],
  bio: String,
  experience: Number,
  properties: [ObjectId -> Property],
  reviews: [{
    user: ObjectId,
    rating: Number,
    comment: String,
    date: Date
  }],
  verified: Boolean,
  featuredAgent: Boolean
}
```

### Agency Model
```javascript
{
  name: String,
  description: String,
  logo: String,
  coverImage: String,
  address: Object,
  phone: String,
  email: String,
  website: String,
  agents: [ObjectId -> Agent],
  properties: [ObjectId -> Property],
  verified: Boolean
}
```

---

## Authentication & Security

### JWT Authentication Flow

1. **Login**: User submits credentials
2. **Verify**: Server validates against database
3. **Token**: Server generates JWT with user ID
4. **Storage**: Token stored in localStorage
5. **Requests**: Token sent in Authorization header
6. **Verify**: Middleware validates token on protected routes

### Password Security

- Passwords hashed with bcryptjs (10 salt rounds)
- Never stored in plain text
- Password reset via email token

### Protected Routes

Frontend:
```tsx
<ProtectedRoute>
  <SellerDashboard />
</ProtectedRoute>
```

Backend:
```javascript
router.get('/profile', authMiddleware, getProfile);
```

---

## Deployment Guide

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login & Deploy**
   ```bash
   vercel login
   vercel --prod
   ```

3. **Configure vercel.json**
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "X-Frame-Options", "value": "DENY" }
         ]
       }
     ]
   }
   ```

### Backend Deployment (Railway)

1. **Create Railway Project**
   - Connect GitHub repository
   - Select `/server` as root directory

2. **Add Environment Variables**
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   PORT=5000
   NODE_ENV=production
   ```

3. **Deploy**
   - Railway auto-deploys on git push

### Database (MongoDB Atlas)

1. **Create Cluster**
   - Choose M0 (free tier) or higher
   - Select region closest to users

2. **Configure Network Access**
   - Add Railway IP to whitelist
   - Or allow all IPs (0.0.0.0/0) for Railway

3. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/balkanestate
   ```

---

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://api.balkanestateai.com
VITE_GOOGLE_MAPS_KEY=your-google-maps-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/balkanestate

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage (optional)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/forgot-password | Request password reset |
| PUT | /api/auth/reset-password/:token | Reset password |

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/properties | Get all properties (with filters) |
| GET | /api/properties/:id | Get single property |
| POST | /api/properties | Create property (auth) |
| PUT | /api/properties/:id | Update property (auth) |
| DELETE | /api/properties/:id | Delete property (auth) |
| GET | /api/properties/featured | Get featured properties |
| GET | /api/properties/search | Search properties |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents | Get all agents |
| GET | /api/agents/:id | Get agent profile |
| GET | /api/agents/:id/properties | Get agent's properties |
| POST | /api/agents/:id/reviews | Add review (auth) |

### Agencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agencies | Get all agencies |
| GET | /api/agencies/:id | Get agency details |
| GET | /api/agencies/:id/agents | Get agency agents |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/profile | Get user profile (auth) |
| PUT | /api/users/profile | Update profile (auth) |
| GET | /api/users/saved | Get saved properties (auth) |
| POST | /api/users/saved/:propertyId | Save property (auth) |
| DELETE | /api/users/saved/:propertyId | Unsave property (auth) |

---

## Key Features

### 1. Property Search
**Location**: `components/BuyerFlow/Search/`

Features:
- Full-text search
- Filter by: country, city, price, beds, baths, property type
- Sort by: price, date, popularity
- Map view with markers
- Save search preferences

### 2. Property Details
**Location**: `components/BuyerFlow/PropertyDetails/`

Features:
- Image gallery with zoom
- Property specifications
- Location map
- Agent contact form
- Similar properties
- Share functionality
- Save to favorites

### 3. Agent Directory
**Location**: `components/AgentsPage/`

Features:
- Agent search & filters
- Agent profiles with:
  - Statistics (properties sold, years experience)
  - Reviews & ratings
  - Active listings
  - Service areas
  - Languages spoken
- Contact forms
- Consultation booking

### 4. Seller Dashboard
**Location**: `components/SellerFlow/`

Features:
- Property listing management
- Analytics & views
- Lead management
- Listing creation wizard
- Image upload
- Pricing suggestions

### 5. Calculators
**Location**: `components/Calculators/`

- **Mortgage Calculator**: Monthly payment estimation
- **Affordability Calculator**: Budget planning tool

### 6. Multi-language Support
**Location**: `src/i18n/`

- 10 Balkan languages
- Automatic language detection
- Language switcher in header
- SEO-friendly hreflang tags

---

## Development Commands

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Backend

```bash
# Navigate to server
cd server

# Install dependencies
npm install

# Start development (with nodemon)
npm run dev

# Start production
npm start
```

### Database

```bash
# Seed database (if seed script exists)
npm run seed

# Clear database
npm run db:clear
```

---

## Performance Optimizations

### Implemented
- Image lazy loading (`loading="lazy"`)
- Async image decoding (`decoding="async"`)
- Code splitting with React.lazy
- PWA with service worker caching
- Preconnect to external resources
- Optimized bundle with Vite

### Recommended
- Use Cloudinary for image optimization
- Implement Redis caching for API
- Add CDN (Cloudflare) for static assets
- Enable Brotli compression on server

---

## Support & Maintenance

### Updating Translations
1. Edit JSON files in `src/i18n/locales/`
2. Use consistent key structure across languages
3. Test with language switcher

### Adding New Features
1. Create components in appropriate directory
2. Add routes in `App.tsx`
3. Create API endpoints in `server/routes/`
4. Add translations for UI text

### Debugging
- Frontend: React DevTools + browser console
- Backend: Server logs + MongoDB Compass
- Network: Browser Network tab

---

## License & Credits

© 2024 Balkan Estate. All rights reserved.

Built with:
- React & Vite
- Express.js & MongoDB
- Tailwind CSS
- react-i18next
- Leaflet Maps

---

*Documentation last updated: December 2024*
