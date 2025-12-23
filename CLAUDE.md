# CLAUDE.md - BalkanEstate.com

This document provides essential context for AI assistants working with the BalkanEstate codebase.

## Project Overview

BalkanEstate is a real estate platform for Balkan countries, featuring property listings, agent management, agency support, real-time messaging, and subscription-based monetization.

## Quick Start Commands

```bash
# Frontend (from root directory)
npm install
npm run dev              # Runs on http://localhost:3000

# Backend (from backend/ directory)
cd backend
npm install
npm run dev              # Runs on http://localhost:5001

# Backend production
npm run build
npm start

# Useful backend scripts
npm run seed:products    # Seed subscription products
npm run seed:agencies    # Seed test agencies
npm run seed:properties  # Seed mock properties
npm run test             # Run Jest tests
```

## Architecture Overview

### Frontend (React + TypeScript + Vite)

The frontend follows **Clean Architecture** with three layers:

```
src/
├── domain/              # Pure TypeScript - Business Logic
│   ├── entities/        # Domain models (Property, User, Agency, etc.)
│   ├── repositories/    # Repository interfaces (IPropertyRepository, etc.)
│   └── usecases/        # Business operations (GetPropertiesUseCase, etc.)
│
├── data/                # External Data Sources
│   ├── api/             # HTTP clients (PropertyApiClient, httpClient.ts)
│   ├── repositories/    # Repository implementations
│   └── mappers/         # DTO ↔ Entity mappers
│
├── presentation/        # React UI
│   ├── features/        # Feature modules (auth, property, agency, etc.)
│   └── providers/       # Context providers
│
├── features/            # TanStack Query hooks by feature
│   ├── properties/hooks # useProperties, useCreateProperty, etc.
│   ├── agencies/hooks   # useAgencies, useAgency, etc.
│   ├── auth/hooks       # useCurrentUser, useLogin, etc.
│   └── conversations/   # useConversations, useSendMessage, etc.
│
├── app/                 # App-level configuration
│   ├── store/           # Zustand stores (uiStore, filterStore)
│   └── config/          # Query client config
│
├── components/          # Shared UI components
└── i18n/                # Internationalization (10 languages)
```

### Backend (Express + TypeScript + MongoDB)

```
backend/src/
├── config/              # Database, Cloudinary, Passport, Swagger
├── controllers/         # Request handlers (propertyController, authController, etc.)
├── middleware/          # Auth, rate limiting, security, caching
├── models/              # Mongoose schemas (Property, User, Agency, etc.)
├── routes/              # Express routes
├── services/            # Business logic (emailService, paymentService, etc.)
├── workers/             # Background jobs (subscriptionExpiration, promotion refresh)
├── jobs/                # Cron jobs (trial management, market data updates)
├── sockets/             # Socket.io handlers (real-time chat)
├── scripts/             # Admin/migration scripts
└── utils/               # Helpers (jwt, encryption, upload)
```

## Technology Stack

### Frontend
- **React 18.2** with **TypeScript 5.x**
- **Vite** for build tooling
- **TanStack Query v5** for server state (75% of state)
- **Zustand v5** for client state (20% of state)
- **Tailwind CSS** for styling
- **Leaflet** for maps
- **Framer Motion** for animations
- **react-i18next** for internationalization

### Backend
- **Express 5** with **TypeScript**
- **MongoDB** with **Mongoose 8.x**
- **Socket.io** for real-time messaging
- **Stripe** for payments
- **Cloudinary** for image storage
- **Passport.js** for OAuth (Google, Facebook, Apple)
- **JWT** for authentication
- **node-cron** for scheduled jobs
- **Sentry** for error monitoring

## Key Domain Models

### User Roles
- `buyer` - Can browse and save properties
- `private_seller` - Can list properties (3 free, 20 with Pro subscription)
- `agent` - Professional real estate agent (requires license verification)
- `admin` / `super_admin` - Platform administrators

### User Role System
Users can have multiple roles and switch between them:
- `availableRoles` - Array of roles user can access
- `activeRole` - Current UI context
- `primaryRole` - Default/main role

### Property Model
Key fields: `sellerId`, `status`, `price`, `address`, `city`, `country`, `beds`, `baths`, `sqft`, `propertyType`, `images`, `lat/lng`, `isPromoted`, `promotionTier`

Property types: `house`, `apartment`, `villa`, `other`
Status: `active`, `pending`, `sold`, `draft`

### Subscription System
Tiers: `free`, `pro`, `agency_owner`, `agency_agent`, `buyer`
- Free tier: 3 active listings
- Pro tier: 20 listings + 3 monthly promotion coupons
- Agency: 20 listings per agent + 15 agency-wide promotion coupons

## Internationalization (i18n)

The app supports 10 Balkan languages:
- `en` - English (default)
- `sq` - Albanian
- `sr` - Serbian
- `mk` - Macedonian
- `bs` - Bosnian
- `hr` - Croatian
- `bg` - Bulgarian
- `ro` - Romanian
- `el` - Greek
- `me` - Montenegrin

Translation files are in `src/i18n/locales/{lang}/` with namespaces:
`common`, `nav`, `property`, `auth`, `search`, `messages`, `footer`, `newsletter`, `calculators`, `pricing`, `validation`, `admin`, `account`, `seller`, `agents`, `modals`, `payment`, `saved`

**Usage:**
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('property');
// t('property.title')
```

## State Management Patterns

### Server State (TanStack Query)
```typescript
// Query keys pattern
export const propertyKeys = {
  all: ['properties'] as const,
  list: (filters?) => [...propertyKeys.all, 'list', { filters }] as const,
  detail: (id) => [...propertyKeys.all, 'detail', id] as const,
};

// Query hook pattern
export function useProperties(filters?) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => api.getProperties(filters),
    staleTime: 2 * 60 * 1000,
  });
}

// Mutation pattern with cache invalidation
const { mutate } = useMutation({
  mutationFn: createProperty,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  },
});
```

### Client State (Zustand)
```typescript
export const useUIStore = create<UIState>()(
  devtools((set) => ({
    isAuthModalOpen: false,
    openAuthModal: () => set({ isAuthModalOpen: true }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),
  }))
);

// Use selectors for performance
const isOpen = useUIStore(state => state.isAuthModalOpen);
```

## API Endpoints

Backend runs on `http://localhost:5001`. Key endpoints:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/auth/signup` | POST | No | User registration |
| `/api/auth/login` | POST | No | User login |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/properties` | GET | No | List properties |
| `/api/properties` | POST | Yes | Create property |
| `/api/properties/:id` | GET/PUT/DELETE | Varies | Property CRUD |
| `/api/favorites` | GET/POST/DELETE | Yes | User favorites |
| `/api/saved-searches` | GET/POST/DELETE | Yes | Saved searches |
| `/api/conversations` | GET/POST | Yes | Messaging |
| `/api/agencies` | GET/POST | Varies | Agency management |
| `/api/agents` | GET | No | Agent listings |
| `/api/subscriptions` | GET/POST | Yes | Subscription management |
| `/api/promotions` | GET/POST | Yes | Property promotions |

## Authentication

JWT-based authentication with refresh tokens:
- Access token: 1 day expiry
- Refresh token: 7 days expiry
- Tokens sent via `Authorization: Bearer <token>` header

OAuth providers: Google, Facebook, Apple

## Security Features

Backend security middleware:
- **Helmet** - Security headers
- **CORS** - Configured for frontend origins
- **Rate limiting** - General, sensitive, and payment-specific limits
- **XSS protection** - Input sanitization
- **HPP** - HTTP parameter pollution prevention
- **NoSQL injection protection** - MongoDB sanitization
- **Account lockout** - After 5 failed login attempts (30 min lock)

## Environment Variables

### Backend (.env)
```
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/balkanestate
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend
```
GEMINI_API_KEY=<key>  # For AI features
```

## Code Conventions

### Naming
- **Entities**: PascalCase classes (`Property`, `User`)
- **Interfaces**: Prefix with `I` (`IPropertyRepository`)
- **Use Cases**: Suffix with `UseCase` (`GetPropertiesUseCase`)
- **DTOs**: Suffix with `DTO` (`PropertyDTO`)
- **Hooks**: Prefix with `use` (`useProperties`)
- **Components**: PascalCase (`PropertyList`)

### Component Structure
```typescript
// 1. Imports
import React from 'react';
import { useProperties } from '@/features/properties/hooks';

// 2. Types
interface Props {
  filters?: Filters;
}

// 3. Component
export function PropertyList({ filters }: Props) {
  // 4. Hooks first
  const { properties, isLoading } = useProperties(filters);

  // 5. Event handlers
  const handleClick = (id: string) => {};

  // 6. Early returns
  if (isLoading) return <LoadingSpinner />;

  // 7. Render
  return <div>...</div>;
}
```

### Size Guidelines
- Pages: <150 lines
- Feature components: <200 lines
- UI components: <100 lines

## Testing

### Backend
```bash
cd backend
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

Uses Jest with mongodb-memory-server for database testing.

### Frontend
Component tests with React Testing Library (setup exists but limited coverage).

## Common Tasks

### Adding a New Property Field
1. Update `backend/src/models/Property.ts` - Add to interface and schema
2. Update `src/domain/entities/Property.ts` - Add to domain entity
3. Update `src/data/mappers/PropertyMapper.ts` - Map the field
4. Update relevant components in `src/presentation/features/property/`
5. Add i18n keys in all locale files

### Adding a New API Endpoint
1. Add controller in `backend/src/controllers/`
2. Add route in `backend/src/routes/`
3. Register route in `backend/src/server.ts`
4. Add API client method in `src/data/api/`
5. Create TanStack Query hook in `src/features/`

### Adding a New Language
1. Create folder `src/i18n/locales/{code}/`
2. Copy all JSON files from `en/` folder
3. Translate all values
4. Add language to `languages` array in `src/i18n/index.ts`
5. Import and add to `resources` object

## Background Workers

- **Subscription Expiration Worker** - Checks and expires subscriptions
- **Promotion Refresh Worker** - Refreshes highlight tier properties, cleans expired promotions
- **Trial Management Job** - Sends reminders, expires agent trials
- **City Market Data Job** - Updates market data biweekly (1st and 15th)
- **Reconciliation Worker** - Syncs subscription state with payment providers

## Important Files

- `backend/src/server.ts` - Express app entry point
- `backend/src/config/database.ts` - MongoDB connection
- `backend/src/middleware/auth.ts` - JWT authentication
- `backend/src/middleware/security.ts` - Security middleware
- `src/i18n/index.ts` - i18n configuration
- `src/app/config/queryClient.ts` - TanStack Query configuration
- `vite.config.ts` - Vite build configuration

## Troubleshooting

### Backend won't start
1. Check MongoDB is running: `mongod`
2. Check port 5001 is free: `lsof -i :5001`
3. Verify `.env` file exists in `backend/`

### Frontend API calls fail
1. Verify backend is running on port 5001
2. Check browser console for CORS errors
3. Verify `vite.config.ts` proxy settings

### Database connection issues
1. Check `MONGODB_URI` in `.env`
2. Verify MongoDB service is running
3. Check network connectivity to MongoDB

## Documentation

Detailed documentation is in `/docs`:
- `docs/architecture/` - Architecture guides
- `docs/api/` - API reference
- `docs/guides/` - Feature guides
- `docs/setup/` - Setup instructions

## Notes for AI Assistants

1. **Always read files before editing** - Understand context first
2. **Use TanStack Query for server state** - Not Context API or Redux
3. **Follow i18n patterns** - All user-facing text should use translation keys
4. **Respect the layer boundaries** - Domain layer has no React/framework imports
5. **Check existing patterns** - Look at similar features before implementing new ones
6. **Keep components small** - Extract logic to hooks, split large components
7. **Use TypeScript strictly** - Avoid `any` types where possible
8. **Security first** - Never expose secrets, validate inputs, sanitize outputs
