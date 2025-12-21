# Clean Architecture Folder Structure

## Visual Structure

```
src/
│
├── 📦 domain/                           # Pure TypeScript - Business Logic
│   ├── entities/                        # Domain models
│   │   └── index.ts
│   ├── repositories/                    # Repository interfaces
│   │   └── index.ts
│   └── usecases/                        # Business operations
│       ├── auth/
│       ├── property/
│       ├── agency/
│       ├── conversation/
│       ├── user/
│       ├── payment/
│       └── index.ts
│
├── 🗄️ data/                             # External Data Sources
│   ├── api/                             # HTTP clients
│   │   └── index.ts
│   ├── repositories/                    # Repository implementations
│   │   └── index.ts
│   ├── mappers/                         # DTO ↔ Entity mappers
│   └── models/                          # API DTOs
│
├── 🎨 presentation/                     # React UI
│   ├── features/
│   │   │
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── state/
│   │   │   └── index.ts
│   │   │
│   │   ├── property/
│   │   │   ├── components/
│   │   │   │   ├── PropertyCard/
│   │   │   │   ├── PropertyList/
│   │   │   │   ├── PropertyDetails/
│   │   │   │   ├── PropertySearch/
│   │   │   │   └── PropertyForm/
│   │   │   ├── hooks/
│   │   │   ├── state/
│   │   │   └── index.ts
│   │   │
│   │   ├── agency/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── state/
│   │   │   └── index.ts
│   │   │
│   │   ├── conversation/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── state/
│   │   │   └── index.ts
│   │   │
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   │   ├── UserManager/
│   │   │   │   ├── PropertyManager/
│   │   │   │   ├── AgencyManager/
│   │   │   │   ├── DiscountCodeManager/
│   │   │   │   └── Dashboard/
│   │   │   ├── hooks/
│   │   │   ├── state/
│   │   │   └── index.ts
│   │   │
│   │   └── shared/                  # Reusable UI components
│   │       ├── Button/
│   │       ├── Modal/
│   │       ├── Input/
│   │       ├── Card/
│   │       ├── Header/
│   │       ├── Footer/
│   │       └── Sidebar/
│   │
│   ├── navigation/
│   │   ├── AppRouter.tsx
│   │   └── routes.ts
│   │
│   └── providers/
│       └── AppProviders.tsx
│
└── 🔧 shared/                           # Cross-cutting concerns
    ├── constants/
    │   ├── icons/
    │   └── index.ts
    ├── config/
    │   └── index.ts
    └── utils/
        └── index.ts
```

## Directory Count Summary

- **Domain Layer**: 7 directories (entities, repositories, 6 usecase categories)
- **Data Layer**: 4 directories (api, repositories, mappers, models)
- **Presentation Layer**: 35+ directories (5 features × multiple subdirs + shared components)
- **Shared Layer**: 4 directories (constants, config, utils + subdirs)

**Total**: ~60 new directories created

## Key Files Created

- `ARCHITECTURE.md` - Complete architecture documentation
- `FOLDER_STRUCTURE.md` - This file (quick reference)
- 13 `index.ts` files for cleaner exports

## Next Steps

1. ✅ Folder structure created
2. ⏳ Implement Domain Layer (entities, repositories, use cases)
3. ⏳ Implement Data Layer (API clients, repository implementations)
4. ⏳ Refactor Presentation Layer (split contexts, break down large components)
5. ⏳ Update imports throughout the application
6. ⏳ Test and verify everything works

## Import Examples (After Migration)

```typescript
// Clean imports from domain layer
import { Property, User, Agency } from '@/domain/entities';
import { GetPropertiesUseCase } from '@/domain/usecases';
import { IPropertyRepository } from '@/domain/repositories';

// Clean imports from data layer
import { PropertyRepository } from '@/data/repositories';
import { PropertyApiClient } from '@/data/api';

// Clean imports from presentation layer
import { PropertyList, PropertyCard } from '@/presentation/features/property';
import { useProperties, usePropertyFilters } from '@/presentation/features/property';

// Clean imports from shared
import { formatCurrency } from '@/shared/utils';
import { API_CONFIG } from '@/shared/config';
```

---

**Status**: Folder structure ✅ COMPLETE
