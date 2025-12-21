# Frontend Architecture

Modern React architecture with TanStack Query and Zustand.

## Overview

The frontend follows clean architecture principles with clear separation between:
- **Server State** (TanStack Query) - Data from API
- **Client State** (Zustand) - UI state, filters
- **Component State** (useState) - Local UI state

## Technology Stack

### Core
- **React 18.2** - UI library
- **TypeScript 5.x** - Type safety
- **Vite** - Build tool (fast HMR)

### State Management
- **TanStack Query v5** - Server state (75% of state)
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Query invalidation
- **Zustand v5** - Client state (20% of state)
  - UI modals
  - Filter preferences
  - Local settings
- **useState/useReducer** - Component state (5% of state)
  - Form inputs
  - Local UI toggles

### Styling
- **Tailwind CSS 3.x** - Utility-first CSS
- **PostCSS** - CSS processing

### Routing
- **URL-based routing** - Custom implementation
- Browser history API

## Project Structure

```
src/
├── app/                    # App-level configuration
│   ├── config/
│   │   └── queryClient.ts              # TanStack Query setup
│   ├── providers/
│   │   └── QueryProvider.tsx           # Query provider component
│   ├── store/
│   │   ├── uiStore.ts                  # UI state (Zustand)
│   │   └── filterStore.ts              # Filter state (Zustand)
│   └── components/
│       ├── ErrorBoundary.tsx           # Error handling
│       ├── QueryErrorBoundary.tsx      # Query errors
│       └── Suspense.tsx                # Loading states
├── features/               # Feature modules
│   ├── auth/
│   │   ├── api/
│   │   │   └── authKeys.ts             # Query keys
│   │   ├── hooks/
│   │   │   ├── useCurrentUser.ts       # Query hook
│   │   │   ├── useLogin.ts             # Mutation hook
│   │   │   └── index.ts                # Exports
│   │   └── components/
│   │       └── ExampleAuthUsage.tsx    # Examples
│   ├── properties/
│   │   ├── api/propertyKeys.ts
│   │   └── hooks/                      # 11 hooks
│   ├── agencies/
│   │   ├── api/agencyKeys.ts
│   │   └── hooks/                      # 9 hooks
│   ├── conversations/
│   │   ├── api/conversationKeys.ts
│   │   └── hooks/                      # 7 hooks
│   └── saved/
│       ├── api/savedKeys.ts
│       └── hooks/                      # 6 hooks
├── components/             # Shared components
│   ├── property/
│   ├── ui/
│   └── layout/
├── utils/                  # Utilities
│   ├── currency.ts
│   ├── date.ts
│   └── markdown.ts
├── types/                  # TypeScript types
│   └── index.ts
└── constants/              # Constants
    └── index.ts
```

## State Management Strategy

### 1. Server State (TanStack Query) - 75%

Use for data from API:
- Current user
- Properties
- Agencies
- Conversations
- Saved items

**Benefits:**
- Automatic caching
- Background refetching
- Deduplication
- Optimistic updates

**Example:**
```typescript
// Query keys
export const propertyKeys = {
  all: ['properties'] as const,
  list: (filters?) => [...propertyKeys.all, 'list', { filters }] as const,
  detail: (id) => [...propertyKeys.all, 'detail', id] as const,
};

// Hook
export function useProperties(filters?) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => api.getProperties(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Usage
const { properties, isLoading } = useProperties({ city: 'Belgrade' });
```

### 2. Client State (Zustand) - 20%

Use for UI state:
- Modal open/closed
- Active selections
- Filter preferences
- UI settings

**Benefits:**
- No re-render issues
- Persistence (localStorage)
- DevTools support
- Selector optimization

**Example:**
```typescript
// Store
export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      isAuthModalOpen: false,
      openAuthModal: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
    }),
    { name: 'ui-store' }
  )
);

// Selector hook
export const useAuthModal = () => useUIStore((state) => ({
  isOpen: state.isAuthModalOpen,
  open: state.openAuthModal,
  close: state.closeAuthModal,
}));

// Usage
const { isOpen, open, close } = useAuthModal();
```

### 3. Component State (useState) - 5%

Use for local UI:
- Form input values
- Local toggles
- Temporary state

**Example:**
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
```

## Query Patterns

### Basic Query
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['properties'],
  queryFn: getProperties,
});
```

### Query with Dependencies
```typescript
const { data } = useQuery({
  queryKey: ['property', propertyId],
  queryFn: () => getProperty(propertyId),
  enabled: !!propertyId, // Only run if ID exists
});
```

### Mutation
```typescript
const { mutate, isPending } = useMutation({
  mutationFn: createProperty,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  },
});
```

### Optimistic Update
```typescript
const { mutate } = useMutation({
  mutationFn: updateProperty,
  onMutate: async (newProperty) => {
    await queryClient.cancelQueries({ queryKey: ['properties'] });
    const previous = queryClient.getQueryData(['properties']);
    queryClient.setQueryData(['properties'], newProperty);
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['properties'], context.previous);
  },
});
```

## Component Guidelines

### Size Limits
- **Pages:** <150 lines
- **Features:** <200 lines
- **UI Components:** <100 lines

### Structure
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
  // 4. Hooks
  const { properties, isLoading } = useProperties(filters);

  // 5. Event handlers
  const handleClick = (id: string) => {
    // ...
  };

  // 6. Early returns
  if (isLoading) return <LoadingSpinner />;
  if (!properties.length) return <EmptyState />;

  // 7. Render
  return (
    <div>
      {properties.map(p => (
        <PropertyCard key={p.id} property={p} onClick={handleClick} />
      ))}
    </div>
  );
}
```

### Error Boundaries
```typescript
<ErrorBoundary level="feature">
  <PropertyList />
</ErrorBoundary>
```

### Loading States
```typescript
<Suspense fallback={<FeatureLoader />}>
  <LazyComponent />
</Suspense>
```

## Performance Optimization

### Code Splitting
```typescript
const PropertyDetails = lazy(() => import('./PropertyDetailsPage'));

<Suspense fallback={<PageLoader />}>
  <PropertyDetails />
</Suspense>
```

### Memoization
```typescript
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* expensive render */}</div>;
});

const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);
```

### Selector Optimization
```typescript
// ❌ Bad - re-renders on any UI state change
const uiState = useUIStore();

// ✅ Good - only re-renders when isOpen changes
const isOpen = useUIStore(state => state.isAuthModalOpen);
```

## Error Handling

### Three Levels

**1. App Level** - Catches everything
```typescript
<ErrorBoundary level="app">
  <App />
</ErrorBoundary>
```

**2. Route Level** - Catches page errors
```typescript
<ErrorBoundary level="route">
  <SearchPage />
</ErrorBoundary>
```

**3. Feature Level** - Catches component errors
```typescript
<ErrorBoundary level="feature">
  <PropertyList />
</ErrorBoundary>
```

## Testing

### Unit Tests
```typescript
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProperties } from './useProperties';

test('should fetch properties', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result, waitFor } = renderHook(() => useProperties(), { wrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.properties).toBeDefined();
});
```

## Build & Deploy

### Development
```bash
npm run dev           # Start dev server
npm run type-check    # Check TypeScript
npm run lint          # Run ESLint
```

### Production
```bash
npm run build         # Build for production
npm run preview       # Preview production build
```

### Environment Variables
```env
VITE_API_URL=http://localhost:5000/api
VITE_CLOUDINARY_CLOUD_NAME=...
```

## DevTools

### React Query DevTools
- Automatically included in development
- Bottom-right floating button
- View all queries, mutations, cache

### Zustand DevTools
- Install Redux DevTools browser extension
- Inspect state changes
- Time-travel debugging

## Best Practices

### ✅ Do
- Use TanStack Query for server data
- Use Zustand for UI state
- Keep components small (<200 lines)
- Use TypeScript strictly
- Write tests for hooks
- Use error boundaries
- Optimize with selectors

### ❌ Don't
- Use Context API for server state
- Create god components (>200 lines)
- Ignore TypeScript errors
- Skip error handling
- Over-optimize prematurely
- Mix server and client state

## Migration from Old Architecture

See [Migration Guide](../guides/MIGRATION_GUIDE.md) for complete examples.

### Before (Context API)
```typescript
const { state, dispatch } = useAppContext();
const properties = state.properties;
```

### After (TanStack Query)
```typescript
const { properties, isLoading } = useProperties();
```

**Benefits:**
- 60-75% less code
- Automatic caching
- No manual loading states
- Better performance

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org)

---

**Questions?** Check the [guides](../guides/) or [API reference](../api/).
