# App Components

Common app-level components for error handling, loading states, and suspense boundaries.

## Error Boundaries

### ErrorBoundary

Catches React errors and prevents app crashes.

**Usage:**

```tsx
import { ErrorBoundary } from '@/app/components';

// App-level (catches all errors)
<ErrorBoundary level="app">
  <App />
</ErrorBoundary>

// Route-level (catches route errors)
<ErrorBoundary level="route">
  <SearchPage />
</ErrorBoundary>

// Feature-level (catches feature errors)
<ErrorBoundary level="feature">
  <PropertyList />
</ErrorBoundary>
```

**With custom fallback:**

```tsx
<ErrorBoundary
  level="feature"
  fallback={<div>Custom error message</div>}
>
  <MyComponent />
</ErrorBoundary>
```

**With error handler:**

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Log to error service
    logToSentry(error, errorInfo);
  }}
>
  <App />
</ErrorBoundary>
```

### QueryErrorBoundary

Specialized error boundary for TanStack Query errors with retry functionality.

**Usage:**

```tsx
import { QueryErrorBoundary } from '@/app/components';

<QueryErrorBoundary>
  <PropertyList /> {/* Uses TanStack Query */}
</QueryErrorBoundary>
```

**Features:**
- Resets query cache on retry
- Provides retry button
- Handles query errors gracefully

## Suspense & Loading States

### Suspense

Custom Suspense wrapper with default loading UI.

**Usage:**

```tsx
import { Suspense } from '@/app/components';

const LazyComponent = lazy(() => import('./Component'));

<Suspense>
  <LazyComponent />
</Suspense>
```

**With custom fallback:**

```tsx
<Suspense fallback={<PageLoader />}>
  <LazyComponent />
</Suspense>
```

### Loading Components

Various loading indicators for different use cases:

```tsx
import {
  PageLoader,
  FeatureLoader,
  ComponentLoader,
  InlineLoader,
  SkeletonLoader,
  CardSkeleton,
} from '@/app/components';

// Full page loading
<PageLoader />

// Feature section loading (smaller)
<FeatureLoader />

// Component loading (smallest)
<ComponentLoader />

// Inline spinner
<InlineLoader size="md" />

// Skeleton for lists
<SkeletonLoader count={5} />

// Card skeleton
<CardSkeleton />
```

## Complete Example

```tsx
import { ErrorBoundary, QueryErrorBoundary, Suspense, PageLoader } from '@/app/components';
import { lazy } from 'react';

const SearchPage = lazy(() => import('./pages/SearchPage'));

function App() {
  return (
    <ErrorBoundary level="app">
      <QueryProvider>
        <Suspense fallback={<PageLoader />}>
          <QueryErrorBoundary>
            <SearchPage />
          </QueryErrorBoundary>
        </Suspense>
      </QueryProvider>
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Layered Error Boundaries

Use multiple error boundaries at different levels:

```tsx
<ErrorBoundary level="app">           {/* Catches all errors */}
  <App>
    <ErrorBoundary level="route">     {/* Catches route errors */}
      <SearchPage>
        <QueryErrorBoundary>          {/* Catches query errors */}
          <PropertyList />
        </QueryErrorBoundary>
      </SearchPage>
    </ErrorBoundary>
  </App>
</ErrorBoundary>
```

### 2. Suspense for Code Splitting

Always wrap lazy-loaded components:

```tsx
import { lazy } from 'react';
import { Suspense, PageLoader } from '@/app/components';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminDashboard />
    </Suspense>
  );
}
```

### 3. Loading States Hierarchy

Choose appropriate loader size:

- **PageLoader**: Route changes, initial load
- **FeatureLoader**: Feature sections (lists, forms)
- **ComponentLoader**: Individual components
- **InlineLoader**: Buttons, inline actions
- **SkeletonLoader**: Content placeholders

### 4. Error Logging

Always log errors in production:

```tsx
<ErrorBoundary
  level="app"
  onError={(error, errorInfo) => {
    // Send to error tracking service
    if (import.meta.env.PROD) {
      logToSentry(error, errorInfo);
    }
  }}
>
  <App />
</ErrorBoundary>
```

## Error Boundary Levels

| Level | Use Case | Behavior | Example |
|-------|----------|----------|---------|
| `app` | Root level | Shows full-page error, refresh required | Wrap entire app |
| `route` | Page level | Shows page error, allows navigation | Wrap each route |
| `feature` | Feature level | Shows feature error, allows retry | Wrap feature sections |

## Testing Error Boundaries

```tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/app/components';

const ThrowError = () => {
  throw new Error('Test error');
};

test('should catch errors', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Integration with TanStack Query

```tsx
import { QueryErrorBoundary } from '@/app/components';
import { useProperties } from '@/features/properties/hooks';

function PropertyList() {
  const { data, isLoading } = useProperties();

  if (isLoading) return <FeatureLoader />;

  return (
    <QueryErrorBoundary>
      {/* Component will retry query on error */}
      <div>{data.map(property => ...)}</div>
    </QueryErrorBoundary>
  );
}
```

## Future Enhancements

- [ ] Integration with error tracking service (Sentry, LogRocket)
- [ ] Offline detection and retry
- [ ] Custom error types with specific handling
- [ ] Error recovery strategies
- [ ] User error reporting
