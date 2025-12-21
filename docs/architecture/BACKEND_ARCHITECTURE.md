# Clean Architecture Documentation

## Overview

This application follows Clean Architecture principles with a 3-layer structure inspired by MVI (Model-View-Intent) pattern commonly used in Android development.

## Architecture Layers

### 1. Domain Layer (`src/domain/`)

**Pure TypeScript - No Framework Dependencies**

The domain layer contains the core business logic and is completely independent of React, APIs, or any external frameworks. This layer can be reused in React Native mobile applications.

#### Components:

- **Entities** (`domain/entities/`): Core business models representing the application's domain
  - `User.ts` - User entity with business logic
  - `Property.ts` - Property entity with validation and computed properties
  - `Agency.ts` - Agency entity
  - `Conversation.ts` - Messaging entity
  - etc.

- **Repository Interfaces** (`domain/repositories/`): Abstract contracts for data operations
  - `IAuthRepository.ts` - Authentication operations
  - `IPropertyRepository.ts` - Property CRUD operations
  - `IAgencyRepository.ts` - Agency operations
  - etc.

- **Use Cases** (`domain/usecases/`): Single-responsibility business operations
  - `auth/` - Login, Signup, Logout, etc.
  - `property/` - GetProperties, CreateProperty, UpdateProperty, etc.
  - `agency/` - Agency management use cases
  - `conversation/` - Messaging use cases
  - `user/` - User management use cases
  - `payment/` - Payment processing use cases

**Key Principles:**
- No React imports
- No API calls (only through repository interfaces)
- Pure business logic
- Framework agnostic
- Testable in isolation

---

### 2. Data Layer (`src/data/`)

**External Data Sources & API Integration**

The data layer implements the repository interfaces defined in the domain layer and handles all external data interactions.

#### Components:

- **API Clients** (`data/api/`): Focused HTTP clients for each domain
  - `httpClient.ts` - Base HTTP client with auth headers
  - `AuthApiClient.ts` - Authentication endpoints
  - `PropertyApiClient.ts` - Property endpoints
  - `AgencyApiClient.ts` - Agency endpoints
  - `PaymentApiClient.ts` - Payment endpoints
  - etc.

- **Repository Implementations** (`data/repositories/`): Concrete implementations of domain repository interfaces
  - `AuthRepository.ts` - Implements IAuthRepository
  - `PropertyRepository.ts` - Implements IPropertyRepository
  - etc.

- **Data Mappers** (`data/mappers/`): Convert between DTOs and domain entities
  - `UserMapper.ts` - Maps UserDTO ↔ User entity
  - `PropertyMapper.ts` - Maps PropertyDTO ↔ Property entity
  - etc.

- **Data Models (DTOs)** (`data/models/`): API response/request data structures
  - `UserDTO.ts` - API user data structure
  - `PropertyDTO.ts` - API property data structure
  - etc.

**Key Principles:**
- Implements domain repository interfaces
- Handles HTTP requests, caching, error handling
- Maps API responses to domain entities
- Isolates external dependencies

---

### 3. Presentation Layer (`src/presentation/`)

**React UI Components & State Management**

The presentation layer contains all React components, hooks, and state management organized by feature.

#### Structure:

**Features** (`presentation/features/`): Feature-based organization

Each feature follows this structure:
```
feature-name/
├── components/          # React UI components
│   ├── ComponentA/
│   │   ├── index.tsx
│   │   └── ComponentA.styles.ts (optional)
│   └── ComponentB/
├── hooks/              # Custom React hooks
│   ├── useFeature.ts
│   └── useFeatureLogic.ts
├── state/              # State management (Context + Reducer)
│   ├── FeatureContext.tsx
│   ├── FeatureState.ts
│   └── FeatureActions.ts
└── index.ts           # Public exports
```

**Available Features:**
- `auth/` - Authentication & user session
- `property/` - Property browsing, search, details
- `agency/` - Agency management and browsing
- `conversation/` - Real-time messaging
- `admin/` - Admin panel components
- `shared/` - Reusable UI components (Button, Modal, Input, etc.)

**Navigation** (`presentation/navigation/`):
- `AppRouter.tsx` - Main routing logic
- `routes.ts` - Route definitions

**Providers** (`presentation/providers/`):
- `AppProviders.tsx` - Combines all context providers

**Key Principles:**
- Feature-based organization (not by component type)
- Components are pure UI (business logic in hooks)
- Custom hooks connect use cases to UI
- Actions define user intents (MVI pattern)
- State classes hold component state
- Context API for state management

---

### 4. Shared Layer (`src/shared/`)

**Cross-Cutting Concerns**

Utilities and configurations used across all layers.

#### Components:

- **Constants** (`shared/constants/`):
  - `icons/` - SVG icon components organized by category
  - `index.ts` - Application constants

- **Config** (`shared/config/`):
  - `api.config.ts` - API configuration
  - `payment.config.ts` - Payment gateway configuration
  - `map.config.ts` - Map and cadastre configuration

- **Utils** (`shared/utils/`):
  - `currency.ts` - Currency formatting
  - `date.ts` - Date utilities
  - `validation.ts` - Form validation helpers
  - etc.

---

## Data Flow

### Example: Loading Properties

1. **User Action** (Presentation Layer):
   ```typescript
   // Component dispatches action
   const { loadProperties } = useProperties();
   loadProperties(filters);
   ```

2. **Hook Executes Use Case** (Presentation → Domain):
   ```typescript
   // Custom hook calls use case
   const properties = await getPropertiesUseCase.execute(filters);
   ```

3. **Use Case Calls Repository** (Domain → Data):
   ```typescript
   // Use case delegates to repository interface
   return this.propertyRepository.getProperties(filters);
   ```

4. **Repository Fetches Data** (Data Layer):
   ```typescript
   // Repository implementation calls API client
   const dtos = await this.apiClient.fetchProperties(filters);
   return dtos.map(dto => this.mapper.toDomain(dto));
   ```

5. **State Updates** (Presentation Layer):
   ```typescript
   // Reducer updates state
   dispatch({ type: 'LOAD_PROPERTIES_SUCCESS', payload: properties });
   ```

6. **UI Re-renders** (Presentation Layer):
   ```typescript
   // Component receives updated state
   return <PropertyList properties={state.properties} />;
   ```

---

## Benefits

✅ **Separation of Concerns**: Each layer has a single responsibility
✅ **Testability**: Layers can be tested independently
✅ **Maintainability**: Easy to locate and modify code
✅ **Scalability**: Adding features doesn't bloat existing code
✅ **Reusability**: Domain layer can be shared with mobile apps
✅ **Type Safety**: Full TypeScript support throughout
✅ **SOLID Principles**: Follows industry best practices

---

## Migration from Old Structure

### Old → New Mapping

| Old Location | New Location | Notes |
|--------------|--------------|-------|
| `types.ts` | `domain/entities/` | Split into entity classes |
| `services/apiService.ts` | `data/api/*ApiClient.ts` | Split by domain |
| `context/AppContext.tsx` | `presentation/features/*/state/` | Split by feature |
| `components/BuyerFlow/` | `presentation/features/property/` | Organized by feature |
| `components/SellerFlow/` | `presentation/features/property/` | Merged with property feature |
| `components/AdminPanel/` | `presentation/features/admin/` | Organized by feature |
| `components/shared/` | `presentation/features/shared/` | Shared UI components |
| `utils/` | `shared/utils/` | Cross-cutting utilities |
| `constants/` | `shared/constants/` | Application constants |
| `config/` | `shared/config/` | Configuration files |

---

## Naming Conventions

- **Entities**: PascalCase classes (e.g., `Property`, `User`)
- **Interfaces**: Prefix with `I` (e.g., `IPropertyRepository`)
- **Use Cases**: Suffix with `UseCase` (e.g., `GetPropertiesUseCase`)
- **DTOs**: Suffix with `DTO` (e.g., `PropertyDTO`)
- **Mappers**: Suffix with `Mapper` (e.g., `PropertyMapper`)
- **Components**: PascalCase (e.g., `PropertyList`)
- **Hooks**: Prefix with `use` (e.g., `useProperties`)
- **Actions**: SCREAMING_SNAKE_CASE (e.g., `LOAD_PROPERTIES_SUCCESS`)

---

## Development Guidelines

1. **Always start with the domain layer** when adding new features
2. **Keep components pure** - no business logic in UI components
3. **Use custom hooks** to connect domain logic to components
4. **Follow single responsibility** - one file, one job
5. **Prefer composition** over inheritance
6. **Write tests** for each layer independently
7. **Keep the domain layer framework-agnostic** for mobile reusability

---

## Examples

See individual feature folders for implementation examples of this architecture pattern.
