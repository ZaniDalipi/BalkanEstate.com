# Balkan Estate - Comprehensive Architectural Review & Refactoring Plan
## Senior Frontend Architect Analysis

---

## Executive Summary

**Current State:** Hybrid architecture with partial clean architecture implementation. The codebase has been partially refactored with Domain and Data layers following clean architecture principles, but the Presentation layer still has significant issues with large monolithic components (1,000+ lines), mixed concerns, and outdated patterns.

**Critical Assessment:** While the domain/data separation is excellent, the project suffers from:
- **Component bloat** (PropertyDetailsPage: 1,230 lines, GeminiDescriptionGenerator: 1,239 lines)
- **Context API overuse** for async state (anti-pattern for server data)
- **Missing modern state management** (TanStack Query would eliminate 60% of boilerplate)
- **Monolithic components** violating Single Responsibility Principle
- **Backend lacks proper layering** (controllers doing too much)
- **No error boundaries** or proper error handling strategy
- **Inconsistent patterns** between features
- **Technical debt** from gradual migration

**Recommendation:** Full architectural overhaul combining Clean Architecture with modern React patterns, introducing TanStack Query for server state, Zustand for client state, and complete component decomposition.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Identified Weaknesses & Anti-Patterns](#2-identified-weaknesses--anti-patterns)
3. [Modern Architecture Proposal](#3-modern-architecture-proposal)
4. [Complete Folder Structure](#4-complete-folder-structure)
5. [State Management Strategy](#5-state-management-strategy)
6. [Component Architecture](#6-component-architecture)
7. [Backend Architecture (SOLID)](#7-backend-architecture-solid)
8. [Migration Plan](#8-migration-plan)
9. [Code Examples](#9-code-examples)
10. [Technical Debt Elimination](#10-technical-debt-elimination)
11. [Testing Strategy](#11-testing-strategy)
12. [Performance Optimization](#12-performance-optimization)

---

## 1. Current Architecture Analysis

### 1.1 What's Been Implemented (Good)

✅ **Domain Layer** (Excellent)
- Pure TypeScript entities with business logic
- Repository interfaces (dependency inversion)
- Use cases (single responsibility)
- Mobile-ready (no React dependencies)

✅ **Data Layer** (Good)
- API clients split by domain
- Repository implementations
- Data mappers (DTO ↔ Entity)
- Centralized HTTP client

✅ **Partial Presentation Refactor**
- AuthContext and PropertyContext split from monolithic AppContext
- Custom hooks (useAuth, useProperty)
- MVI pattern started

### 1.2 Critical Issues Remaining

❌ **Large Monolithic Components**
```
PropertyDetailsPage.tsx          1,230 lines  ❌ CRITICAL
GeminiDescriptionGenerator.tsx   1,239 lines  ❌ CRITICAL
SearchPage.tsx                     745 lines  ❌ HIGH
MapComponent.tsx                   705 lines  ❌ HIGH
AgencyManager.tsx                  767 lines  ❌ HIGH
PropertyManager.tsx                755 lines  ❌ HIGH
UserManager.tsx                    629 lines  ❌ MEDIUM
```

❌ **State Management Anti-Patterns**
- Using Context API for **server state** (properties, conversations)
- Manual loading/error states instead of TanStack Query
- No cache invalidation strategy
- Polling/refetching logic scattered across components
- No optimistic updates

❌ **Architectural Inconsistencies**
- Old components use direct API calls (`apiService.ts`)
- New components use contexts with use cases
- No unified pattern across codebase
- Mixed file organization (some in `/components`, some in `/src/presentation`)

❌ **Missing Critical Patterns**
- No error boundaries
- No suspense boundaries
- No loading skeletons strategy
- No code splitting
- No lazy loading

---

## 2. Identified Weaknesses & Anti-Patterns

### 2.1 Anti-Pattern: Context API for Server State

**Current Implementation:**
```typescript
// ❌ WRONG: Using Context for server data
const PropertyContext = createContext<PropertyContextType>();

// Manual loading states, error handling, cache management
const [properties, setProperties] = useState<Property[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchProperties = async () => {
  setIsLoading(true);
  try {
    const data = await api.getProperties();
    setProperties(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

**Problems:**
1. Context causes unnecessary re-renders
2. Manual cache management
3. No background refetching
4. No stale-while-revalidate
5. Duplicate requests not deduplicated
6. No request cancellation
7. Infinite loading states throughout app

**Should Use:** TanStack Query for ALL server state

---

### 2.2 Anti-Pattern: God Components

**PropertyDetailsPage.tsx (1,230 lines):**
```typescript
// ❌ Violates Single Responsibility Principle
// This component does:
// 1. Property data fetching
// 2. Image gallery with editing
// 3. Contact form
// 4. Calculator logic
// 5. Favorite toggling
// 6. Comparison logic
// 7. Conversation creation
// 8. Map integration
// 9. Share functionality
// 10. Analytics tracking
```

**Should Be:** Composition of 8-10 smaller components

---

### 2.3 Anti-Pattern: Business Logic in Components

**Current:**
```typescript
// ❌ WRONG: Business logic in component
function PropertyList() {
  const { properties } = useProperty();

  // Business logic should be in domain layer
  const filteredProperties = properties.filter(p => {
    if (filters.minPrice && p.price < filters.minPrice) return false;
    if (filters.maxPrice && p.price > filters.maxPrice) return false;
    if (filters.beds && p.beds < filters.beds) return false;
    // ... 50 more lines of filtering logic
    return true;
  });

  const sortedProperties = filteredProperties.sort((a, b) => {
    // ... complex sorting logic
  });
}
```

**Should Be:** Use case or domain service

---

### 2.4 Missing: Proper Error Handling

**Current:**
```typescript
// ❌ No error boundaries
// ❌ Errors just logged to console
// ❌ No user-friendly error messages
// ❌ No retry logic
// ❌ No fallback UI
```

**Should Have:**
- Error boundaries at route level
- Feature-level error boundaries
- Automatic retry with exponential backoff
- User-friendly error messages
- Sentry/error tracking integration

---

### 2.5 Backend: Controllers Doing Too Much

**Current Backend (agencyController.ts - 1,159 lines):**
```typescript
// ❌ WRONG: Controller has business logic, validation, and data access
export const createAgency = async (req, res) => {
  // Validation logic
  if (!req.body.name || req.body.name.length < 3) {
    return res.status(400).json({ error: 'Name too short' });
  }

  // Business logic
  const slug = req.body.name.toLowerCase().replace(/\s+/g, '-');

  // Direct database access
  const agency = await Agency.create({
    ...req.body,
    slug,
    ownerId: req.user.id
  });

  // More business logic
  await User.findByIdAndUpdate(req.user.id, {
    agencyId: agency._id,
    role: 'agent'
  });

  res.json({ agency });
};
```

**Violates:** Single Responsibility, Dependency Inversion

---

## 3. Modern Architecture Proposal

### 3.1 Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Routes    │  │ Components │  │   Hooks    │            │
│  │  (Pages)   │  │  (UI Only) │  │ (TanStack) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │              │                │                    │
│         └──────────────┴────────────────┘                    │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  TanStack  │  │  Zustand   │  │   React    │            │
│  │   Query    │  │  (Client)  │  │  Context   │            │
│  │  (Server)  │  │   State    │  │   (UI)     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                    DOMAIN LAYER                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Entities  │  │ Use Cases  │  │ Repository │            │
│  │            │  │            │  │ Interfaces │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │    API     │  │ Repository │  │   Mappers  │            │
│  │  Clients   │  │    Impl    │  │            │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 State Management Strategy

**Three-Tier State Management:**

1. **Server State** → TanStack Query (75% of state)
   - Properties, users, agencies, conversations
   - Automatic caching, refetching, pagination
   - Optimistic updates
   - Request deduplication

2. **Client State** → Zustand (20% of state)
   - UI state (modals, sidebars, theme)
   - Filter state (temporary)
   - Form state (draft data)
   - User preferences

3. **Component State** → useState/useReducer (5% of state)
   - Local UI state (dropdown open, hover)
   - Form inputs (controlled components)
   - Animation states

**Why This Split?**
- TanStack Query eliminates 60% of custom hook code
- Zustand is lightweight (1KB) vs Context re-render issues
- Component state for truly local UI

---

### 3.3 Component Architecture Principles

**Component Types:**

1. **Page Components** (Routes)
   - Only routing and layout
   - Compose feature components
   - Provide error boundaries
   - Max 100 lines

2. **Feature Components** (Business Features)
   - One feature (e.g., PropertyCard, PropertyFilters)
   - Use TanStack Query hooks
   - Compose UI components
   - Max 200 lines

3. **UI Components** (Pure Presentational)
   - No business logic
   - Props-based
   - Reusable
   - Max 100 lines

4. **Layout Components**
   - Page structure
   - Navigation
   - Sidebars
   - Max 150 lines

**Example Decomposition:**
```
PropertyDetailsPage (1,230 lines)
  ↓ SPLIT INTO ↓
├── PropertyDetailsRoute (80 lines) - Route component
├── PropertyHero (120 lines) - Hero section
├── PropertyImageGallery (150 lines) - Gallery with editing
├── PropertyInfo (100 lines) - Details section
├── PropertyAmenities (80 lines) - Amenities list
├── PropertyLocation (100 lines) - Map integration
├── PropertyCalculator (120 lines) - Financial calculator
├── PropertyContact (100 lines) - Contact form
└── PropertySimilar (90 lines) - Similar properties
```

---

## 4. Complete Folder Structure

### 4.1 Frontend Architecture

```
src/
├── app/                                    # Application layer
│   ├── providers/
│   │   ├── AppProviders.tsx               # Combines all providers
│   │   ├── QueryProvider.tsx              # TanStack Query setup
│   │   └── ThemeProvider.tsx              # Theme configuration
│   ├── router/
│   │   ├── AppRouter.tsx                  # Main router
│   │   ├── routes.ts                      # Route definitions
│   │   ├── guards/                        # Route guards
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── RoleGuard.tsx
│   │   │   └── SubscriptionGuard.tsx
│   │   └── lazy/                          # Lazy loaded routes
│   │       ├── PropertyRoutes.tsx
│   │       └── AdminRoutes.tsx
│   ├── store/                             # Zustand stores (client state)
│   │   ├── uiStore.ts                     # UI state (modals, sidebars)
│   │   ├── filterStore.ts                 # Filter state
│   │   └── preferenceStore.ts             # User preferences
│   └── config/
│       ├── queryClient.ts                 # TanStack Query config
│       ├── api.config.ts                  # API configuration
│       └── constants.ts                   # App constants
│
├── features/                              # Feature modules (domain-driven)
│   ├── auth/
│   │   ├── api/
│   │   │   ├── authApi.ts                # TanStack Query hooks
│   │   │   └── authKeys.ts               # Query key factory
│   │   ├── components/
│   │   │   ├── LoginForm/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── LoginForm.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── SignupForm/
│   │   │   └── PasswordReset/
│   │   ├── hooks/
│   │   │   ├── useLogin.ts               # Wraps useMutation
│   │   │   ├── useSignup.ts
│   │   │   └── useAuth.ts                # Current user hook
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts
│   │
│   ├── properties/
│   │   ├── api/
│   │   │   ├── propertyApi.ts            # TanStack Query hooks
│   │   │   └── propertyKeys.ts           # Query keys
│   │   ├── components/
│   │   │   ├── PropertyCard/
│   │   │   │   ├── PropertyCard.tsx       # MAX 100 lines
│   │   │   │   ├── PropertyCard.test.tsx
│   │   │   │   ├── PropertyCard.styles.ts
│   │   │   │   └── index.ts
│   │   │   ├── PropertyList/
│   │   │   │   ├── PropertyList.tsx       # MAX 150 lines
│   │   │   │   ├── PropertyListItem.tsx
│   │   │   │   ├── PropertyListSkeleton.tsx
│   │   │   │   └── index.ts
│   │   │   ├── PropertyDetails/           # Decomposed!
│   │   │   │   ├── PropertyDetails.tsx    # MAX 100 lines (container)
│   │   │   │   ├── PropertyHero.tsx
│   │   │   │   ├── PropertyImageGallery/
│   │   │   │   │   ├── PropertyImageGallery.tsx
│   │   │   │   │   ├── ImageEditor.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── PropertyInfo.tsx
│   │   │   │   ├── PropertyAmenities.tsx
│   │   │   │   ├── PropertyLocation.tsx
│   │   │   │   ├── PropertyCalculator/
│   │   │   │   │   ├── PropertyCalculator.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── PropertyContact.tsx
│   │   │   │   └── index.ts
│   │   │   ├── PropertyFilters/
│   │   │   │   ├── PropertyFilters.tsx
│   │   │   │   ├── PriceFilter.tsx
│   │   │   │   ├── LocationFilter.tsx
│   │   │   │   ├── AdvancedFilters.tsx
│   │   │   │   └── index.ts
│   │   │   ├── PropertyForm/             # For sellers
│   │   │   │   ├── PropertyForm.tsx
│   │   │   │   ├── BasicInfoStep.tsx
│   │   │   │   ├── LocationStep.tsx
│   │   │   │   ├── ImagesStep.tsx
│   │   │   │   ├── PricingStep.tsx
│   │   │   │   └── index.ts
│   │   │   └── PropertySearch/
│   │   │       ├── PropertySearch.tsx
│   │   │       ├── SearchBar.tsx
│   │   │       ├── SearchFilters.tsx
│   │   │       └── index.ts
│   │   ├── hooks/
│   │   │   ├── useProperties.ts          # useQuery wrapper
│   │   │   ├── useProperty.ts            # Single property
│   │   │   ├── useCreateProperty.ts      # useMutation wrapper
│   │   │   ├── useUpdateProperty.ts
│   │   │   ├── useDeleteProperty.ts
│   │   │   ├── useFavoriteProperty.ts    # Optimistic update
│   │   │   └── usePropertyFilters.ts     # Zustand integration
│   │   ├── types/
│   │   │   └── property.types.ts
│   │   └── index.ts
│   │
│   ├── agencies/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── AgencyCard/
│   │   │   ├── AgencyDetails/
│   │   │   ├── AgencyForm/
│   │   │   └── AgencyList/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── conversations/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── ConversationList/
│   │   │   ├── MessageThread/
│   │   │   ├── MessageInput/
│   │   │   └── MessageBubble/
│   │   ├── hooks/
│   │   │   ├── useConversations.ts
│   │   │   ├── useSendMessage.ts         # Optimistic updates
│   │   │   └── useWebSocket.ts           # Real-time integration
│   │   └── index.ts
│   │
│   ├── admin/                            # Admin feature
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── UserManager/
│   │   │   │   ├── UserManager.tsx       # MAX 200 lines
│   │   │   │   ├── UserTable.tsx
│   │   │   │   ├── UserFilters.tsx
│   │   │   │   ├── UserActions.tsx
│   │   │   │   └── index.ts
│   │   │   ├── PropertyManager/
│   │   │   ├── AgencyManager/
│   │   │   └── Analytics/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   └── shared/                           # Shared feature logic
│       ├── hooks/
│       │   ├── useDebounce.ts
│       │   ├── useIntersectionObserver.ts
│       │   ├── useLocalStorage.ts
│       │   └── useMediaQuery.ts
│       └── utils/
│           ├── formatters.ts
│           └── validators.ts
│
├── ui/                                    # UI component library
│   ├── components/                        # Presentational components
│   │   ├── Button/
│   │   │   ├── Button.tsx                # MAX 80 lines
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx        # Storybook
│   │   │   ├── Button.styles.ts
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Modal/
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Skeleton/
│   │   ├── ErrorBoundary/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ErrorFallback.tsx
│   │   │   └── index.ts
│   │   └── Suspense/
│   │       ├── SuspenseBoundary.tsx
│   │       └── LoadingFallback.tsx
│   ├── layouts/
│   │   ├── MainLayout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── index.ts
│   │   ├── AuthLayout/
│   │   └── AdminLayout/
│   └── styles/
│       ├── theme.ts
│       ├── global.css
│       └── tokens.ts
│
├── domain/                                # Domain layer (existing - good!)
│   ├── entities/
│   ├── repositories/
│   └── usecases/
│
├── infrastructure/                        # Data layer (renamed from 'data')
│   ├── http/
│   │   ├── httpClient.ts
│   │   ├── interceptors/
│   │   │   ├── authInterceptor.ts
│   │   │   ├── errorInterceptor.ts
│   │   │   └── retryInterceptor.ts
│   │   └── types.ts
│   ├── api/                              # API clients
│   │   ├── auth/
│   │   │   ├── authClient.ts
│   │   │   └── authClient.test.ts
│   │   ├── properties/
│   │   ├── agencies/
│   │   └── conversations/
│   ├── repositories/                     # Repository implementations
│   ├── mappers/
│   ├── websocket/
│   │   ├── socketClient.ts
│   │   └── socketHandlers.ts
│   └── storage/
│       ├── localStorage.ts
│       └── sessionStorage.ts
│
├── pages/                                # Route pages (thin wrappers)
│   ├── index.tsx                         # Home page
│   ├── PropertyDetailsPage.tsx           # MAX 80 lines (composition)
│   ├── SearchPage.tsx                    # MAX 100 lines
│   ├── AgenciesPage.tsx
│   ├── InboxPage.tsx
│   ├── AccountPage.tsx
│   ├── AdminPage.tsx
│   └── NotFoundPage.tsx
│
├── types/                                # Global types
│   ├── index.ts
│   └── api.types.ts
│
├── utils/                                # Global utilities
│   ├── date.ts
│   ├── currency.ts
│   ├── validation.ts
│   └── errors.ts
│
├── App.tsx                               # App root
├── main.tsx                              # Entry point
└── vite-env.d.ts
```

### 4.2 Backend Architecture (SOLID)

```
server/
├── src/
│   ├── application/                      # Application layer
│   │   ├── use-cases/                    # Business logic
│   │   │   ├── auth/
│   │   │   │   ├── LoginUseCase.ts
│   │   │   │   ├── RegisterUseCase.ts
│   │   │   │   └── RefreshTokenUseCase.ts
│   │   │   ├── properties/
│   │   │   │   ├── CreatePropertyUseCase.ts
│   │   │   │   ├── UpdatePropertyUseCase.ts
│   │   │   │   ├── DeletePropertyUseCase.ts
│   │   │   │   └── GetPropertiesUseCase.ts
│   │   │   ├── agencies/
│   │   │   └── conversations/
│   │   ├── dto/                          # Data Transfer Objects
│   │   │   ├── auth/
│   │   │   │   ├── LoginDto.ts
│   │   │   │   ├── RegisterDto.ts
│   │   │   │   └── AuthResponseDto.ts
│   │   │   └── properties/
│   │   └── validators/                   # Input validation
│   │       ├── authValidator.ts
│   │       └── propertyValidator.ts
│   │
│   ├── domain/                           # Domain layer
│   │   ├── entities/                     # Domain models
│   │   │   ├── User.ts
│   │   │   ├── Property.ts
│   │   │   ├── Agency.ts
│   │   │   └── Conversation.ts
│   │   ├── repositories/                 # Repository interfaces
│   │   │   ├── IUserRepository.ts
│   │   │   ├── IPropertyRepository.ts
│   │   │   ├── IAgencyRepository.ts
│   │   │   └── IConversationRepository.ts
│   │   ├── services/                     # Domain services
│   │   │   ├── PropertyPricingService.ts
│   │   │   ├── AgencyRankingService.ts
│   │   │   └── NotificationService.ts
│   │   └── errors/                       # Domain errors
│   │       ├── DomainError.ts
│   │       ├── ValidationError.ts
│   │       └── NotFoundError.ts
│   │
│   ├── infrastructure/                   # Infrastructure layer
│   │   ├── database/
│   │   │   ├── mongodb/
│   │   │   │   ├── models/               # Mongoose schemas
│   │   │   │   │   ├── UserModel.ts
│   │   │   │   │   ├── PropertyModel.ts
│   │   │   │   │   └── AgencyModel.ts
│   │   │   │   ├── repositories/         # Repository implementations
│   │   │   │   │   ├── MongoUserRepository.ts
│   │   │   │   │   ├── MongoPropertyRepository.ts
│   │   │   │   │   └── MongoAgencyRepository.ts
│   │   │   │   └── connection.ts
│   │   │   └── migrations/
│   │   ├── external-services/
│   │   │   ├── cloudinary/
│   │   │   │   └── CloudinaryService.ts
│   │   │   ├── stripe/
│   │   │   │   └── StripeService.ts
│   │   │   ├── sendgrid/
│   │   │   │   └── EmailService.ts
│   │   │   └── gemini/
│   │   │       └── GeminiService.ts
│   │   ├── websocket/
│   │   │   ├── SocketServer.ts
│   │   │   └── handlers/
│   │   └── cache/
│   │       └── RedisCache.ts
│   │
│   ├── presentation/                     # Presentation layer
│   │   ├── http/
│   │   │   ├── controllers/              # Thin controllers (NO business logic)
│   │   │   │   ├── AuthController.ts     # MAX 150 lines
│   │   │   │   ├── PropertyController.ts
│   │   │   │   ├── AgencyController.ts
│   │   │   │   └── ConversationController.ts
│   │   │   ├── middleware/
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   ├── validationMiddleware.ts
│   │   │   │   ├── errorMiddleware.ts
│   │   │   │   └── rateLimitMiddleware.ts
│   │   │   └── routes/
│   │   │       ├── authRoutes.ts
│   │   │       ├── propertyRoutes.ts
│   │   │       ├── agencyRoutes.ts
│   │   │       └── index.ts
│   │   └── websocket/
│   │       └── socketHandlers.ts
│   │
│   ├── shared/                           # Shared utilities
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── crypto.ts
│   │   │   └── slugify.ts
│   │   ├── config/
│   │   │   ├── database.config.ts
│   │   │   ├── auth.config.ts
│   │   │   └── app.config.ts
│   │   └── types/
│   │       └── common.types.ts
│   │
│   ├── di/                               # Dependency Injection
│   │   ├── container.ts                  # DI container setup
│   │   └── types.ts                      # DI tokens
│   │
│   └── server.ts                         # App entry point
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
└── tsconfig.json
```

---

## 5. State Management Strategy

### 5.1 TanStack Query Setup

**Why TanStack Query?**
- ✅ Eliminates 60% of state management code
- ✅ Automatic background refetching
- ✅ Request deduplication
- ✅ Optimistic updates
- ✅ Infinite scroll / pagination
- ✅ Cache invalidation
- ✅ TypeScript support
- ✅ DevTools

**Query Client Configuration:**
```typescript
// src/app/config/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache time: Keep unused data for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404) return false;
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },

      // Refetch on window focus (user comes back to tab)
      refetchOnWindowFocus: true,

      // Refetch on network reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});
```

### 5.2 Query Key Factory Pattern

**Problem:** Inconsistent query keys lead to cache bugs

**Solution:** Query key factory

```typescript
// src/features/properties/api/propertyKeys.ts
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: PropertyFilters) =>
    [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  saved: (userId: string) => [...propertyKeys.all, 'saved', userId] as const,
  myListings: (userId: string) =>
    [...propertyKeys.all, 'my-listings', userId] as const,
};

// Usage
queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
queryClient.invalidateQueries({ queryKey: propertyKeys.detail('123') });
```

### 5.3 Custom Hook Pattern with TanStack Query

```typescript
// src/features/properties/hooks/useProperties.ts
import { useQuery } from '@tanstack/react-query';
import { propertyRepository } from '@/infrastructure/repositories';
import { propertyKeys } from '../api/propertyKeys';
import { PropertyFilters } from '@/domain/entities';

export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: propertyKeys.list(filters || PropertyFilters.getDefault()),
    queryFn: () => propertyRepository.getProperties(filters),
    // Component-specific options
    placeholderData: (previousData) => previousData, // Keep old data while fetching
  });
}

// src/features/properties/hooks/useCreateProperty.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyRepository } from '@/infrastructure/repositories';
import { propertyKeys } from '../api/propertyKeys';

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: propertyRepository.createProperty,
    onSuccess: (newProperty) => {
      // Invalidate and refetch properties list
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Optimistically add to cache
      queryClient.setQueryData(
        propertyKeys.detail(newProperty.id),
        newProperty
      );
    },
  });
}

// src/features/properties/hooks/useFavoriteProperty.ts
export function useFavoriteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, propertyId }: { userId: string; propertyId: string }) =>
      propertyRepository.toggleSavedProperty(userId, propertyId),

    // Optimistic update
    onMutate: async ({ propertyId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.saved(userId) });

      // Snapshot previous value
      const previousSaved = queryClient.getQueryData(propertyKeys.saved(userId));

      // Optimistically update
      queryClient.setQueryData(propertyKeys.saved(userId), (old: Property[]) => {
        const isSaved = old.some(p => p.id === propertyId);
        return isSaved
          ? old.filter(p => p.id !== propertyId)
          : [...old, property];
      });

      return { previousSaved };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        propertyKeys.saved(userId),
        context?.previousSaved
      );
    },
  });
}
```

### 5.4 Zustand for Client State

**Why Zustand?**
- ✅ 1KB size
- ✅ No Provider wrapper needed
- ✅ No re-render issues
- ✅ Simple API
- ✅ DevTools support

```typescript
// src/app/store/uiStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Modals
  isAuthModalOpen: boolean;
  isPricingModalOpen: boolean;
  isFiltersOpen: boolean;

  // Active selections
  selectedPropertyId: string | null;
  activeView: 'search' | 'inbox' | 'account' | 'admin';

  // Actions
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openPricingModal: () => void;
  closePricingModal: () => void;
  toggleFilters: () => void;
  setSelectedProperty: (id: string | null) => void;
  setActiveView: (view: UIState['activeView']) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      isAuthModalOpen: false,
      isPricingModalOpen: false,
      isFiltersOpen: false,
      selectedPropertyId: null,
      activeView: 'search',

      // Actions
      openAuthModal: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
      openPricingModal: () => set({ isPricingModalOpen: true }),
      closePricingModal: () => set({ isPricingModalOpen: false }),
      toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),
      setSelectedProperty: (id) => set({ selectedPropertyId: id }),
      setActiveView: (view) => set({ activeView: view }),
    }),
    { name: 'ui-store' }
  )
);

// Usage in components
function PropertyCard({ property }) {
  const setSelectedProperty = useUIStore((state) => state.setSelectedProperty);

  return (
    <div onClick={() => setSelectedProperty(property.id)}>
      {/* ... */}
    </div>
  );
}
```

### 5.5 State Management Comparison

| State Type | Current (Context) | Proposed (TanStack + Zustand) |
|-----------|-------------------|-------------------------------|
| **Properties List** | ❌ 50 lines manual code | ✅ 5 lines `useQuery` |
| **Loading State** | ❌ Manual `useState` | ✅ Automatic `isLoading` |
| **Error Handling** | ❌ Manual try/catch | ✅ Automatic `error` |
| **Cache** | ❌ None | ✅ Automatic 5min cache |
| **Refetch** | ❌ Manual | ✅ Auto on focus/reconnect |
| **Optimistic Updates** | ❌ Manual | ✅ Built-in pattern |
| **Re-renders** | ❌ All consumers | ✅ Only changed selectors |
| **Bundle Size** | Context (0KB) | TanStack (13KB) + Zustand (1KB) |
| **Code Reduction** | Baseline | **-60% lines** |

---

## 6. Component Architecture

### 6.1 Component Decomposition Example

**Before: PropertyDetailsPage.tsx (1,230 lines)**

```typescript
// ❌ WRONG: God component
export function PropertyDetailsPage() {
  // 50 lines of state
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  // ... 20 more state variables

  // 100 lines of effects
  useEffect(() => {
    // Fetch property
  }, [id]);

  useEffect(() => {
    // Check if saved
  }, [property]);

  useEffect(() => {
    // Track analytics
  }, [property]);
  // ... 10 more effects

  // 200 lines of handlers
  const handleSave = () => { /* ... */ };
  const handleShare = () => { /* ... */ };
  const handleContact = () => { /* ... */ };
  const handleCompare = () => { /* ... */ };
  const handleEdit = () => { /* ... */ };
  const handleDelete = () => { /* ... */ };
  // ... 20 more handlers

  // 800 lines of JSX
  return (
    <div>
      {/* Hero section */}
      {/* Image gallery */}
      {/* Property info */}
      {/* Amenities */}
      {/* Location */}
      {/* Calculator */}
      {/* Contact form */}
      {/* Similar properties */}
    </div>
  );
}
```

**After: Decomposed Architecture**

```typescript
// ✅ CORRECT: Thin route component (80 lines)
// pages/PropertyDetailsPage.tsx
export function PropertyDetailsPage() {
  const { id } = useParams();

  return (
    <ErrorBoundary FallbackComponent={PropertyErrorFallback}>
      <Suspense fallback={<PropertyDetailsSkeleton />}>
        <PropertyDetails propertyId={id!} />
      </Suspense>
    </ErrorBoundary>
  );
}

// ✅ CORRECT: Feature component (100 lines)
// features/properties/components/PropertyDetails/PropertyDetails.tsx
export function PropertyDetails({ propertyId }: Props) {
  const { data: property } = useProperty(propertyId);
  const { mutate: toggleFavorite } = useFavoriteProperty();

  if (!property) return null;

  return (
    <div className="property-details">
      <PropertyHero property={property} />
      <PropertyImageGallery images={property.allImages} />
      <PropertyInfo property={property} />
      <PropertyAmenities amenities={property.amenities} />
      <PropertyLocation location={property.location} />
      <PropertyCalculator price={property.price} />
      <PropertyContact
        sellerId={property.sellerId}
        propertyId={property.id}
      />
      <PropertySimilar propertyId={property.id} />
    </div>
  );
}

// ✅ CORRECT: UI component (80 lines)
// features/properties/components/PropertyDetails/PropertyHero.tsx
export function PropertyHero({ property }: Props) {
  const { mutate: toggleFavorite } = useFavoriteProperty();
  const openAuthModal = useUIStore((state) => state.openAuthModal);
  const { isAuthenticated } = useAuth();

  const handleFavorite = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    toggleFavorite({ propertyId: property.id });
  };

  return (
    <div className="property-hero">
      <h1>{property.fullAddress}</h1>
      <div className="property-hero__price">
        {property.formattedPrice}
      </div>
      <div className="property-hero__actions">
        <Button onClick={handleFavorite}>
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button onClick={handleShare}>
          Share
        </Button>
      </div>
    </div>
  );
}
```

### 6.2 Component Patterns

**Pattern 1: Container/Presentational**

```typescript
// Container (smart) - has logic
export function PropertyListContainer() {
  const { filters } = usePropertyFilters();
  const { data, isLoading } = useProperties(filters);

  if (isLoading) return <PropertyListSkeleton />;
  if (!data?.length) return <EmptyState />;

  return <PropertyList properties={data} />;
}

// Presentational (dumb) - just UI
export function PropertyList({ properties }: Props) {
  return (
    <div className="property-list">
      {properties.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

**Pattern 2: Compound Components**

```typescript
// Flexible, composable API
export function PropertyFilters({ children }: Props) {
  const [filters, setFilters] = useState<PropertyFilters>(
    PropertyFilters.getDefault()
  );

  return (
    <PropertyFiltersContext.Provider value={{ filters, setFilters }}>
      <div className="property-filters">
        {children}
      </div>
    </PropertyFiltersContext.Provider>
  );
}

PropertyFilters.PriceRange = PriceRangeFilter;
PropertyFilters.Location = LocationFilter;
PropertyFilters.Bedrooms = BedroomsFilter;
PropertyFilters.Reset = ResetButton;

// Usage
<PropertyFilters>
  <PropertyFilters.PriceRange />
  <PropertyFilters.Location />
  <PropertyFilters.Bedrooms />
  <PropertyFilters.Reset />
</PropertyFilters>
```

**Pattern 3: Render Props for Flexibility**

```typescript
export function PropertySearch({
  renderResults
}: {
  renderResults: (properties: Property[]) => React.ReactNode
}) {
  const [search, setSearch] = useState('');
  const { data } = useProperties({ query: search });

  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      {renderResults(data || [])}
    </>
  );
}

// Usage - full control over rendering
<PropertySearch
  renderResults={(properties) => (
    <div className="grid grid-cols-3">
      {properties.map(p => <CustomCard property={p} />)}
    </div>
  )}
/>
```

---

## 7. Backend Architecture (SOLID)

### 7.1 Current Problems

**Before: Fat Controller (1,159 lines)**

```typescript
// ❌ WRONG: Controller with business logic
export const createAgency = async (req, res) => {
  try {
    // Validation (should be middleware)
    if (!req.body.name || req.body.name.length < 3) {
      return res.status(400).json({ error: 'Name too short' });
    }

    // Business logic (should be use case)
    const slug = req.body.name.toLowerCase().replace(/\s+/g, '-');

    // Data access (should be repository)
    const existingAgency = await Agency.findOne({ slug });
    if (existingAgency) {
      return res.status(409).json({ error: 'Agency exists' });
    }

    // More business logic
    const agency = await Agency.create({
      ...req.body,
      slug,
      ownerId: req.user.id,
      totalProperties: 0,
      totalAgents: 1
    });

    // Side effects (should be domain service)
    await User.findByIdAndUpdate(req.user.id, {
      agencyId: agency._id,
      role: 'agent'
    });

    // Email notification (should be external service)
    await sendEmail({
      to: req.user.email,
      subject: 'Welcome to your agency',
      template: 'agency-created'
    });

    res.json({ agency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 7.2 SOLID Refactor

**Single Responsibility Principle:**

```typescript
// ✅ CORRECT: Thin controller (20 lines)
// presentation/http/controllers/AgencyController.ts
export class AgencyController {
  constructor(
    private createAgencyUseCase: CreateAgencyUseCase,
    private logger: Logger
  ) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateAgencyDto.fromRequest(req);
      const agency = await this.createAgencyUseCase.execute(dto);
      res.status(201).json({ agency: agency.toDTO() });
    } catch (error) {
      next(error); // Let error middleware handle it
    }
  }
}

// ✅ CORRECT: Use case with business logic (80 lines)
// application/use-cases/agencies/CreateAgencyUseCase.ts
export class CreateAgencyUseCase {
  constructor(
    private agencyRepository: IAgencyRepository,
    private userRepository: IUserRepository,
    private emailService: IEmailService,
    private slugService: SlugService
  ) {}

  async execute(dto: CreateAgencyDto): Promise<Agency> {
    // Validation
    this.validate(dto);

    // Business logic
    const slug = this.slugService.generate(dto.name);

    // Check uniqueness (domain rule)
    const exists = await this.agencyRepository.existsBySlug(slug);
    if (exists) {
      throw new AgencyAlreadyExistsError(slug);
    }

    // Create agency entity
    const agency = Agency.create({
      ...dto,
      slug,
      ownerId: dto.userId,
      totalProperties: 0,
      totalAgents: 1
    });

    // Persist
    const savedAgency = await this.agencyRepository.save(agency);

    // Update user (domain rule)
    await this.userRepository.updateRole(dto.userId, {
      role: 'agent',
      agencyId: savedAgency.id
    });

    // Send notification (side effect)
    await this.emailService.sendAgencyCreated(
      dto.userEmail,
      savedAgency.name
    );

    return savedAgency;
  }

  private validate(dto: CreateAgencyDto): void {
    if (!dto.name || dto.name.length < 3) {
      throw new ValidationError('Name must be at least 3 characters');
    }
    // More validation...
  }
}

// ✅ CORRECT: Repository (interface)
// domain/repositories/IAgencyRepository.ts
export interface IAgencyRepository {
  save(agency: Agency): Promise<Agency>;
  findById(id: string): Promise<Agency | null>;
  findBySlug(slug: string): Promise<Agency | null>;
  existsBySlug(slug: string): Promise<boolean>;
  update(id: string, data: Partial<Agency>): Promise<Agency>;
  delete(id: string): Promise<void>;
}

// ✅ CORRECT: Repository implementation
// infrastructure/database/mongodb/repositories/MongoAgencyRepository.ts
export class MongoAgencyRepository implements IAgencyRepository {
  async save(agency: Agency): Promise<Agency> {
    const model = new AgencyModel(agency.toDTO());
    const saved = await model.save();
    return Agency.fromDTO(saved.toObject());
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await AgencyModel.countDocuments({ slug });
    return count > 0;
  }

  // ... other methods
}
```

**Dependency Inversion Principle:**

```typescript
// ✅ CORRECT: Depend on abstractions, not concretions
// di/container.ts
import { Container } from 'inversify';
import { TYPES } from './types';

const container = new Container();

// Repositories
container.bind<IAgencyRepository>(TYPES.AgencyRepository)
  .to(MongoAgencyRepository);
container.bind<IUserRepository>(TYPES.UserRepository)
  .to(MongoUserRepository);

// Services
container.bind<IEmailService>(TYPES.EmailService)
  .to(SendGridEmailService);
container.bind<SlugService>(TYPES.SlugService)
  .to(SlugService);

// Use Cases
container.bind<CreateAgencyUseCase>(TYPES.CreateAgencyUseCase)
  .to(CreateAgencyUseCase);

// Controllers
container.bind<AgencyController>(TYPES.AgencyController)
  .to(AgencyController);

export { container };

// Usage in routes
const controller = container.get<AgencyController>(TYPES.AgencyController);
router.post('/agencies', controller.create.bind(controller));
```

**Interface Segregation:**

```typescript
// ❌ WRONG: Fat interface
interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User>;
  update(id: string, data: any): Promise<User>;
  delete(id: string): Promise<void>;
  findByEmail(email: string): Promise<User>;
  updatePassword(id: string, password: string): Promise<void>;
  updateRole(id: string, role: string): Promise<void>;
  findAgents(): Promise<User[]>;
  updateAgentStats(id: string, stats: any): Promise<void>;
  // 20 more methods...
}

// ✅ CORRECT: Segregated interfaces
interface IUserRepository {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

interface IAgentRepository extends IUserRepository {
  findAllAgents(): Promise<Agent[]>;
  updateStats(id: string, stats: AgentStats): Promise<void>;
  findByAgency(agencyId: string): Promise<Agent[]>;
}

interface IUserAuthRepository {
  updatePassword(id: string, hashedPassword: string): Promise<void>;
  updateRefreshToken(id: string, token: string): Promise<void>;
  verifyEmail(id: string): Promise<void>;
}
```

### 7.3 Backend Folder Structure (Clean)

```typescript
// Example: Complete feature implementation

// 1. Domain Entity
// domain/entities/Agency.ts
export class Agency {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly ownerId: string,
    // ... other properties
  ) {
    this.validate();
  }

  static create(data: CreateAgencyData): Agency {
    const id = generateId();
    return new Agency(id, data.name, data.slug, data.ownerId, ...);
  }

  private validate(): void {
    if (this.name.length < 3) {
      throw new DomainError('Agency name too short');
    }
  }

  updateName(newName: string): Agency {
    return new Agency(this.id, newName, this.slug, this.ownerId, ...);
  }
}

// 2. Repository Interface
// domain/repositories/IAgencyRepository.ts
export interface IAgencyRepository {
  save(agency: Agency): Promise<Agency>;
  findById(id: string): Promise<Agency | null>;
  existsBySlug(slug: string): Promise<boolean>;
}

// 3. Use Case
// application/use-cases/agencies/CreateAgencyUseCase.ts
export class CreateAgencyUseCase {
  constructor(
    private agencyRepo: IAgencyRepository,
    private userRepo: IUserRepository
  ) {}

  async execute(dto: CreateAgencyDto): Promise<Agency> {
    // Business logic here
  }
}

// 4. DTO
// application/dto/agencies/CreateAgencyDto.ts
export class CreateAgencyDto {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly userId: string,
    public readonly userEmail: string
  ) {}

  static fromRequest(req: Request): CreateAgencyDto {
    return new CreateAgencyDto(
      req.body.name,
      req.body.email,
      req.user.id,
      req.user.email
    );
  }
}

// 5. Validator
// application/validators/agencyValidator.ts
export class CreateAgencyValidator {
  static validate(dto: CreateAgencyDto): ValidationResult {
    const errors: string[] = [];

    if (!dto.name || dto.name.length < 3) {
      errors.push('Name must be at least 3 characters');
    }

    if (!dto.email || !isValidEmail(dto.email)) {
      errors.push('Valid email required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// 6. Repository Implementation
// infrastructure/database/mongodb/repositories/MongoAgencyRepository.ts
export class MongoAgencyRepository implements IAgencyRepository {
  async save(agency: Agency): Promise<Agency> {
    const model = new AgencyModel(this.toMongo(agency));
    const saved = await model.save();
    return this.toDomain(saved);
  }

  private toMongo(agency: Agency): any {
    return {
      _id: agency.id,
      name: agency.name,
      slug: agency.slug,
      ownerId: agency.ownerId,
      // ...
    };
  }

  private toDomain(model: AgencyDocument): Agency {
    return new Agency(
      model._id.toString(),
      model.name,
      model.slug,
      model.ownerId.toString(),
      // ...
    );
  }
}

// 7. Controller
// presentation/http/controllers/AgencyController.ts
export class AgencyController {
  constructor(private createAgencyUseCase: CreateAgencyUseCase) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateAgencyDto.fromRequest(req);
      const agency = await this.createAgencyUseCase.execute(dto);
      res.status(201).json({ agency: agency.toDTO() });
    } catch (error) {
      next(error);
    }
  }
}

// 8. Routes
// presentation/http/routes/agencyRoutes.ts
const controller = container.get<AgencyController>(TYPES.AgencyController);

router.post(
  '/agencies',
  authenticate,
  validate(CreateAgencyValidator),
  controller.create.bind(controller)
);
```

---

## 8. Migration Plan

### 8.1 Gradual Migration Strategy

**Phase 1: Setup Foundation (Week 1)**
1. ✅ Install TanStack Query, Zustand
2. ✅ Create new folder structure
3. ✅ Set up query client configuration
4. ✅ Create Zustand stores
5. ✅ Set up error boundaries
6. ✅ Create AppProviders wrapper

**Phase 2: Migrate One Feature (Week 2)**
1. Choose simplest feature (Auth)
2. Create new feature folder structure
3. Migrate to TanStack Query hooks
4. Create decomposed components
5. Test thoroughly
6. Document pattern

**Phase 3: Migrate Remaining Features (Weeks 3-6)**
1. Properties feature
2. Agencies feature
3. Conversations feature
4. Admin feature

**Phase 4: Clean Up (Week 7)**
1. Remove old Context API code
2. Remove old apiService.ts
3. Update all imports
4. Remove unused files

### 8.2 Step-by-Step Example: Auth Migration

**Step 1: Install Dependencies**
```bash
npm install @tanstack/react-query zustand
npm install @tanstack/react-query-devtools -D
```

**Step 2: Create Query Provider**
```typescript
// src/app/providers/QueryProvider.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '../config/queryClient';

export function QueryProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

**Step 3: Create Auth Query Keys**
```typescript
// src/features/auth/api/authKeys.ts
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};
```

**Step 4: Create Auth Hooks**
```typescript
// src/features/auth/hooks/useCurrentUser.ts
import { useQuery } from '@tanstack/react-query';
import { authRepository } from '@/infrastructure/repositories';
import { authKeys } from '../api/authKeys';

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authRepository.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry auth failures
  });
}

// src/features/auth/hooks/useLogin.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authRepository } from '@/infrastructure/repositories';
import { authKeys } from '../api/authKeys';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authRepository.login(credentials),

    onSuccess: (data) => {
      // Update current user cache
      queryClient.setQueryData(authKeys.currentUser(), data.user);

      // Invalidate all queries (fresh start)
      queryClient.invalidateQueries();
    },
  });
}
```

**Step 5: Migrate Component**
```typescript
// BEFORE: Using Context
function LoginForm() {
  const { login, isAuthenticating } = useAuth(); // Old context

  const handleSubmit = async (e) => {
    await login(email, password);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// AFTER: Using TanStack Query
function LoginForm() {
  const { mutate: login, isPending } = useLogin();
  const queryClient = useQueryClient();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(
      { email, password },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          navigate('/');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Step 6: Remove Old Code**
```typescript
// Delete src/presentation/features/auth/state/AuthContext.tsx
// Delete src/presentation/features/auth/hooks/useAuth.ts (old version)
// Keep only new TanStack Query hooks
```

### 8.3 Backend Migration Strategy

**Phase 1: Create New Structure (Week 1)**
1. Create folders: `domain/`, `application/`, `infrastructure/`, `presentation/`
2. Move existing code to `_legacy/` folder
3. Set up dependency injection container

**Phase 2: Migrate One Domain (Week 2)**
1. Start with Auth domain
2. Create domain entities
3. Create repository interfaces
4. Create use cases
5. Create new controllers
6. Update routes
7. Test thoroughly

**Phase 3: Migrate Remaining Domains (Weeks 3-6)**
1. Properties
2. Agencies
3. Conversations
4. Payments

**Phase 4: Clean Up (Week 7)**
1. Delete `_legacy/` folder
2. Update all imports
3. Run full test suite

---

## 9. Code Examples

### 9.1 Complete Feature Example: Properties

**1. Domain Entity**
```typescript
// domain/entities/Property.ts
export class Property {
  constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly price: number,
    // ... properties
  ) {}

  get formattedPrice(): string {
    return `€${this.price.toLocaleString()}`;
  }

  isOwnedBy(userId: string): boolean {
    return this.sellerId === userId;
  }

  canBeEditedBy(user: User): boolean {
    return user.id === this.sellerId || user.isAdmin();
  }
}
```

**2. Repository Interface**
```typescript
// domain/repositories/IPropertyRepository.ts
export interface IPropertyRepository {
  getProperties(filters?: PropertyFilters): Promise<Property[]>;
  getPropertyById(id: string): Promise<Property>;
  createProperty(data: CreatePropertyDTO): Promise<Property>;
}
```

**3. Use Case**
```typescript
// domain/usecases/property/GetPropertiesUseCase.ts
export class GetPropertiesUseCase {
  constructor(private repo: IPropertyRepository) {}

  async execute(filters?: PropertyFilters): Promise<Property[]> {
    if (filters) {
      this.validateFilters(filters);
    }
    return this.repo.getProperties(filters);
  }

  private validateFilters(filters: PropertyFilters): void {
    if (filters.minPrice && filters.maxPrice) {
      if (filters.minPrice > filters.maxPrice) {
        throw new ValidationError('Invalid price range');
      }
    }
  }
}
```

**4. TanStack Query Hook**
```typescript
// features/properties/hooks/useProperties.ts
export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: propertyKeys.list(filters || PropertyFilters.getDefault()),
    queryFn: async () => {
      const useCase = new GetPropertiesUseCase(propertyRepository);
      return useCase.execute(filters);
    },
    placeholderData: (prev) => prev,
  });
}
```

**5. Component**
```typescript
// features/properties/components/PropertyList/PropertyList.tsx
export function PropertyList({ filters }: Props) {
  const { data, isLoading, error } = useProperties(filters);

  if (isLoading) return <PropertyListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {data.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

**6. Page Component**
```typescript
// pages/SearchPage.tsx
export function SearchPage() {
  const { filters } = usePropertyFilters();

  return (
    <MainLayout>
      <ErrorBoundary>
        <div className="search-page">
          <PropertyFilters />
          <Suspense fallback={<PropertyListSkeleton />}>
            <PropertyList filters={filters} />
          </Suspense>
        </div>
      </ErrorBoundary>
    </MainLayout>
  );
}
```

### 9.2 Error Boundary Implementation

```typescript
// ui/components/ErrorBoundary/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.FallbackComponent || DefaultErrorFallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

// Default fallback
function DefaultErrorFallback({ error, reset }: Props) {
  return (
    <div className="error-fallback">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 9.3 Infinite Scroll with TanStack Query

```typescript
// features/properties/hooks/useInfiniteProperties.ts
export function useInfiniteProperties(filters: PropertyFilters) {
  return useInfiniteQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      propertyRepository.getProperties(filters, { page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

// Component usage
export function InfinitePropertyList() {
  const { filters } = usePropertyFilters();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProperties(filters);

  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </React.Fragment>
      ))}

      <div ref={ref}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
```

---

## 10. Technical Debt Elimination

### 10.1 Identified Technical Debt

**High Priority:**
1. ❌ **1,200+ line components** → Decompose into <100 line components
2. ❌ **Context API for server state** → Migrate to TanStack Query
3. ❌ **Mixed old/new patterns** → Standardize on new architecture
4. ❌ **No error boundaries** → Add at route and feature level
5. ❌ **Backend fat controllers** → Implement use cases

**Medium Priority:**
6. ❌ **No code splitting** → Implement lazy loading
7. ❌ **No proper loading states** → Add Suspense boundaries
8. ❌ **Inconsistent naming** → Follow naming conventions
9. ❌ **Mixed folder structure** → Consolidate to new structure
10. ❌ **No testing strategy** → Add unit/integration tests

**Low Priority:**
11. ❌ **No Storybook** → Add component documentation
12. ❌ **No performance monitoring** → Add analytics
13. ❌ **No accessibility** → Add ARIA labels
14. ❌ **No i18n** → Prepare for internationalization

### 10.2 Debt Payoff Plan

**Sprint 1-2: Critical Infrastructure**
- Set up TanStack Query
- Create error boundaries
- Implement Zustand stores
- Create new folder structure

**Sprint 3-4: Component Decomposition**
- Break down PropertyDetailsPage
- Break down SearchPage
- Break down Admin components
- Create UI component library

**Sprint 5-6: State Migration**
- Migrate Properties to TanStack Query
- Migrate Auth to TanStack Query
- Migrate Conversations to TanStack Query
- Remove old Context API code

**Sprint 7-8: Backend Refactor**
- Implement use cases
- Create repository pattern
- Thin out controllers
- Add validation middleware

**Sprint 9-10: Testing & Documentation**
- Write unit tests
- Write integration tests
- Create Storybook
- Document architecture

---

## 11. Testing Strategy

### 11.1 Testing Pyramid

```
           /\
          /  \
         / E2E \         10%
        /--------\
       /          \
      / Integration \    30%
     /              \
    /----------------\
   /                  \
  /       Unit         \  60%
 /                      \
/________________________\
```

### 11.2 Unit Testing

```typescript
// features/properties/hooks/useProperties.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProperties } from './useProperties';
import { propertyRepository } from '@/infrastructure/repositories';

jest.mock('@/infrastructure/repositories');

describe('useProperties', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('should fetch properties successfully', async () => {
    const mockProperties = [/* ... */];
    (propertyRepository.getProperties as jest.Mock)
      .mockResolvedValue(mockProperties);

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useProperties(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProperties);
  });

  it('should handle errors', async () => {
    (propertyRepository.getProperties as jest.Mock)
      .mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useProperties(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
```

### 11.3 Component Testing

```typescript
// features/properties/components/PropertyCard/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyCard } from './PropertyCard';
import { Property } from '@/domain/entities';

describe('PropertyCard', () => {
  const mockProperty = Property.fromDTO({
    id: '1',
    title: 'Test Property',
    price: 100000,
    // ...
  });

  it('should render property details', () => {
    render(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('Test Property')).toBeInTheDocument();
    expect(screen.getByText('€100,000')).toBeInTheDocument();
  });

  it('should call onFavorite when favorite button clicked', async () => {
    const onFavorite = jest.fn();
    const user = userEvent.setup();

    render(<PropertyCard property={mockProperty} onFavorite={onFavorite} />);

    await user.click(screen.getByRole('button', { name: /favorite/i }));

    expect(onFavorite).toHaveBeenCalledWith(mockProperty.id);
  });
});
```

---

## 12. Performance Optimization

### 12.1 Code Splitting

```typescript
// app/router/AppRouter.tsx
import { lazy, Suspense } from 'react';
import { LoadingFallback } from '@/ui/components/Suspense';

// Lazy load routes
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const PropertyDetailsPage = lazy(() => import('@/pages/PropertyDetailsPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/search"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <SearchPage />
            </Suspense>
          }
        />

        <Route
          path="/property/:id"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <PropertyDetailsPage />
            </Suspense>
          }
        />

        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminPage />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
}
```

### 12.2 Image Optimization

```typescript
// ui/components/OptimizedImage/OptimizedImage.tsx
export function OptimizedImage({ src, alt, sizes }: Props) {
  const [imageSrc, setImageSrc] = useState(generatePlaceholder());

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setImageSrc(src);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
    />
  );
}
```

### 12.3 Memo and Callback Optimization

```typescript
// features/properties/components/PropertyList/PropertyList.tsx
import { memo } from 'react';

export const PropertyList = memo(function PropertyList({ properties }: Props) {
  return (
    <div className="property-list">
      {properties.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
});

// Only re-render PropertyCard if property changes
export const PropertyCard = memo(
  function PropertyCard({ property, onFavorite }: Props) {
    const handleFavorite = useCallback(() => {
      onFavorite(property.id);
    }, [property.id, onFavorite]);

    return <div onClick={handleFavorite}>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if property ID changed
    return prevProps.property.id === nextProps.property.id;
  }
);
```

---

## Final Recommendations

### Critical Actions (Do First)

1. **Install TanStack Query** - Eliminate 60% of state management code
2. **Decompose God Components** - Break 1,200 line files into <100 line components
3. **Add Error Boundaries** - Prevent white screen of death
4. **Implement Backend Use Cases** - Remove business logic from controllers
5. **Create UI Component Library** - Standardize presentational components

### Architecture Principles to Follow

1. **Single Responsibility** - One file, one job
2. **Dependency Inversion** - Depend on abstractions
3. **Feature-Based Organization** - Group by domain, not type
4. **Separation of Concerns** - UI / State / Domain / Data
5. **Composition Over Inheritance** - Small, focused components
6. **Pure Functions** - Predictable, testable code
7. **Type Safety** - Leverage TypeScript fully
8. **Test Coverage** - Unit tests for business logic, integration for features

### Success Metrics

- **Component Size**: Max 200 lines (avg 80)
- **Code Coverage**: >80% for business logic
- **Bundle Size**: <500KB initial load
- **Lighthouse Score**: >90 performance
- **Build Time**: <30 seconds
- **Type Errors**: 0
- **Linting Errors**: 0
- **Technical Debt**: <10% of codebase

### Resources

- [TanStack Query Docs](https://tanstack.com/query)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)

---

**Document Version:** 1.0
**Date:** 2025-01-XX
**Author:** Senior Frontend Architect
**Status:** For Implementation
